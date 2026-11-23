// Commands: Desktop
Object.assign(commands, {
    // Starts the desktop on the current machine.
    startx() {
        const m = session.machine;
        if (!m.desktop) return print('startx: no desktop environment installed');
        if (desk && desk.session === session) return print('Fatal server error: Server is already active for display 0');
        openDesktop(session, false);
    },

    // Remote desktop to another machine.  rdp [user@]host
    // Connects over VNC (port 5900). Firewall and password work like ssh.
    rdp(args) {
        const arg = args.find(a => !a.startsWith('-'));
        if (!arg) return print('usage: rdp [user@]hostname');
        const [user, host] = arg.includes('@') ? arg.split('@') : [session.user, arg];

        const ip = lookup(host);
        if (!ip) return print(`rdp: Could not resolve hostname ${host}`);

        const r = reach(ip, VNC_PORT);
        if (r.status !== 'ok' || !r.machine.desktop) {
            const reason = r.status === 'ok' ? CONNECT_ERRORS.closed : CONNECT_ERRORS[r.status];
            return printSlow([`Connecting to ${host}...`, null, `rdp: connect to host ${host}: ${reason}`], r.status === 'blocked' ? 1500 : 300);
        }

        const m = r.machine;
        const needPrompt = m.hasPassword || user !== m.user;
        askPassword(`${user}@${host}'s password: `, needPrompt, value => verify(m, 'login', user, value, () => {
            print(`Connected to ${host} (VNC)`);
            login(m, user);
            openDesktop(session, true);
        }, 'Permission denied, please try again.'));
    },
});
