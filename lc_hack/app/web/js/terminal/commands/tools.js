// Commands: more tools
Object.assign(commands, {
    // Lists running processes. Passwords in arguments are a classic find.
    ps() {
        print('USER       PID %CPU %MEM COMMAND');
        for (const p of processList(session.machine, session.user, ['-bash', 'ps aux'])) {
            print(`${p.user.padEnd(9)}${String(p.pid).padStart(5)}  ${p.cpu}  ${p.mem} ${p.cmd}`);
        }
    },

    // Prints the user's crontab (/var/spool/cron/crontabs/<user>), or /etc/crontab for root.
    crontab(args) {
        if (!args.includes('-l')) return print('usage: crontab -l');
        const file = session.root ? '/etc/crontab' : `/var/spool/cron/crontabs/${session.user}`;
        const node = withSession({ ...session, root: true }, () => getNode(resolve(file)));
        if (typeof node === 'string') print(node);
        else print(`no crontab for ${session.user}`);
    },

    // Tells what kind of file something is.
    file(args) {
        if (!args[0]) return print('Usage: file <file>');
        const node = getNode(resolve(args[0]));
        if (node === undefined || node === null) return print(`${args[0]}: cannot open \`${args[0]}' (${node === null ? 'Permission denied' : 'No such file or directory'})`);
        print(`${args[0]}: ${fileType(args[0], node)}`);
    },

    // Counts lines, words and characters.
    wc(args) {
        const text = readFile('wc', args.find(a => !a.startsWith('-')));
        if (text === undefined) return;
        const words = text.split(/\s+/).filter(Boolean).length;
        print(`${String(text.split('\n').length).padStart(3)} ${String(words).padStart(4)} ${String(text.length).padStart(5)} ${args[args.length - 1]}`);
    },

    // Prints readable text inside a (binary) file.
    strings(args) {
        const text = readFile('strings', args[0]);
        if (text === undefined) return;
        const found = text.match(/[\x20-\x7e\t]{4,}/g) || [];
        if (found.length) print(found.map(s => s.trim()).filter(Boolean).join('\n'));
    },

    // Encodes / decodes base64.  base64 <file>   base64 -d <file>
    // If the file doesn't exist, the argument is used as text (to decode a string found somewhere).
    base64(args) {
        const decode = args.includes('-d') || args.includes('--decode');
        const arg = args.find(a => !a.startsWith('-'));
        if (!arg) return print('Usage: base64 [-d] <file | text>');
        const node = getNode(resolve(arg));
        if (node === null) return print(`base64: ${arg}: Permission denied`);
        if (isDir(node)) return print(`base64: ${arg}: Is a directory`);
        const text = typeof node === 'string' ? node.trim() : arg;
        try {
            // TextEncoder/Decoder so non-ASCII characters work too
            print(decode
                ? new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s/g, '')), c => c.charCodeAt(0)))
                : btoa(String.fromCharCode(...new TextEncoder().encode(text))));
        } catch {
            print('base64: invalid input');
        }
    },
});
