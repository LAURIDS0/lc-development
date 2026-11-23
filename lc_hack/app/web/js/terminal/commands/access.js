// Commands: Access
Object.assign(commands, {
    // Becomes root with the root password. On the target machine = win (the server decides).
    su() {
        if (session.root) return;
        const m = session.machine;
        askPassword('Password: ', m.hasRootPassword,
            value => verify(m, 'root', 'root', value, becomeRoot, 'su: Authentication failure'));
    },

    // Runs one command as root.  "sudo su" or "sudo -i" gives a root shell.
    sudo(args) {
        if (!args.length) return print('usage: sudo <command>');
        const go = () => {
            if (['su', '-i', '-s', 'bash'].includes(args[0])) return becomeRoot();
            const wasRoot = session.root;
            const s = session;
            s.root = true;
            runCommand(args);
            s.root = wasRoot;
        };
        if (session.root) return go();
        const m = session.machine;
        askPassword(`[sudo] password for ${session.user}: `, m.hasRootPassword,
            value => verify(m, 'root', 'root', value, go, 'Sorry, try again.'));
    },

    // Logs out of the top login (root -> user, ssh -> back).
    // On the player's own machine it closes the window, like Escape.
    exit() {
        // The last login: an extra terminal closes, the main one ends the hack
        if (sessions.length === 1) {
            if (activeTerm.main) return post('close');
            const t = activeTerm;
            if (t.win) t.win.remove();
            return closeTerm(t);
        }
        const old = sessions.pop();
        session = sessions[sessions.length - 1];
        if (!session) return post('close');
        print('logout');
        if (old.machine !== session.machine) print(`Connection to ${old.machine.host} closed.`);
        if (desk && desk.session === old) closeDesktop(); // Logged out of the desktop's login
    },

    // Creates an empty file, or does nothing if it exists.  touch <file>
    touch(args) {
        if (!args[0]) return print('touch: missing file operand');
        const node = getNode(resolve(args[0]));
        if (node !== undefined) return node === null ? print(`touch: cannot touch '${args[0]}': Permission denied`) : undefined;
        const error = writeFile(resolve(args[0]), '');
        if (error) print(`touch: cannot touch '${args[0]}': ${error}`);
    },
});
commands.logout = commands.exit; // Same command, two names
