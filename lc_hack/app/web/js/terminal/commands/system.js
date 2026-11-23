// Commands: System
Object.assign(commands, {
    // Prints text, or writes it to a file.  echo <text>   echo <text> > file   echo <text> >> file
    echo(args) {
        const i = args.findIndex(a => a === '>' || a === '>>');
        const text = (i < 0 ? args : args.slice(0, i)).join(' ').replace(/^(["'])(.*)\1$/, '$2'); // Strip "quotes"
        if (i < 0) return print(text);

        const file = args[i + 1];
        if (!file) return print("bash: syntax error near unexpected token `newline'");
        const path = resolve(file);
        const existing = getNode(path);
        const append = args[i] === '>>' && typeof existing === 'string' && existing !== '';
        const error = writeFile(path, append ? existing + '\n' + text : text);
        if (error) print(`bash: ${file}: ${error}`);
    },
    whoami() { print(session.user); },
    id() {
        print(session.root
            ? 'uid=0(root) gid=0(root) groups=0(root)'
            : `uid=1000(${session.user}) gid=1000(${session.user}) groups=1000(${session.user}),27(sudo)`);
    },
    // "hostname -I" prints the machine's IPs
    hostname(args) { print(args.includes('-I') ? session.machine.ips.join(' ') : session.machine.host); },
    uname(args) {
        const family = osOf(session.machine).family;
        print(args.includes('-a') ? unameOf(session.machine) : family === 'darwin' ? 'Darwin' : 'Linux');
    },
    date() { print(new Date().toString()); },
    history() { history.forEach((cmd, i) => print(`${String(i + 1).padStart(4)}  ${cmd}`)); },
    clear() { output.innerHTML = ''; },
});
