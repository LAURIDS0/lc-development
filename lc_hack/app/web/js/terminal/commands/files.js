// Commands: Files
// Shared by head and tail: "-n 5", "-5" or 10 lines
function headTail(cmd, args, take) {
    let n = 10;
    const files = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-n') n = parseInt(args[++i], 10);
        else if (/^-\d+$/.test(args[i])) n = parseInt(args[i].slice(1), 10);
        else files.push(args[i]);
    }
    if (!(n >= 0)) return print(`${cmd}: invalid number of lines`);
    const text = readFile(cmd, files[0]);
    if (text !== undefined) print(take(text.split('\n'), n).join('\n'));
}

Object.assign(commands, {
    // Creates folders.  mkdir blog   /   mkdir -p a/b/c
    mkdir(args) {
        const dirs = args.filter(a => !a.startsWith('-'));
        if (!dirs.length) return print('mkdir: missing operand');
        for (const dir of dirs) {
            const error = makeDir(resolve(dir), args.includes('-p'));
            if (error) print(`mkdir: cannot create directory '${dir}': ${error}`);
        }
    },

    // Deletes files.  rm notes.txt   /   rm -r folder
    rm(args) {
        const files = args.filter(a => !a.startsWith('-'));
        if (!files.length) return print('rm: missing operand');
        const recursive = args.some(a => /^-[a-z]*r/i.test(a));
        for (const file of files) {
            const error = removeFile(resolve(file), recursive);
            if (error) print(`rm: cannot remove '${file}': ${error}`);
        }
    },

    // Moves or renames a file.  mv notes.txt ~/Desktop
    mv(args) {
        const files = args.filter(a => !a.startsWith('-'));
        if (files.length < 2) return print(files.length ? `mv: missing destination file operand after '${files[0]}'` : 'mv: missing file operand');
        const error = moveFile(resolve(files[0]), resolve(files[1]));
        if (error) print(`mv: cannot move '${files[0]}' to '${files[1]}': ${error}`);
    },

    // Lists files in a directory.  -a = show hidden files (starting with "."),  -l = long list.
    ls(args) {
        const flags = args.filter(a => a.startsWith('-')).join('');
        const arg = args.find(a => !a.startsWith('-')) || '.';
        const path = resolve(arg);
        const node = getNode(path);

        if (typeof node === 'string') return print(arg);        // ls on a file just prints its name
        if (!isDir(node)) return print(notFound('ls', arg, node));

        const names = Object.keys(node).filter(n => flags.includes('a') || !n.startsWith('.'));
        if (!flags.includes('l')) {
            // Short list: directories get a trailing "/" so they stand out.
            return print(names.map(n => isDir(node[n]) ? n + '/' : n).join('  '));
        }
        // Long list: permissions, owner, size and name.
        // Things in the user's home directory are owned by the user, the rest by root.
        const m = session.machine;
        const inHome = ('/' + path.join('/') + '/').startsWith(`/home/${m.user}/`);
        for (const n of names) {
            const locked = m.locked.has('/' + [...path, n].join('/'));
            const dir = isDir(node[n]);
            const perms = dir ? (locked ? 'drwx------' : 'drwxr-xr-x') : (locked ? '-rw-------' : '-rw-r--r--');
            const owner = inHome && !locked ? m.user : 'root';
            const size = dir ? 4096 : node[n].length;
            print(`${perms} 1 ${owner.padEnd(8)} ${String(size).padStart(5)} ${n}`);
        }
    },

    // Shortcuts, like in ~/.bashrc
    la(args) { commands.ls(['-a', ...args]); },
    ll(args) { commands.ls(['-la', ...args]); },

    // Changes directory. Without an argument it goes home.
    cd(args) {
        const path = resolve(args[0] || '~');
        const node = getNode(path);
        if (typeof node === 'string') return print(`cd: ${args[0]}: Not a directory`);
        if (!isDir(node)) return print(notFound('cd', args[0], node));
        session.cwd = path;
    },

    // Prints the current directory.
    pwd() { print('/' + session.cwd.join('/')); },

    // Prints one or more files.
    cat(args) {
        if (!args.length) return print('cat: missing file operand');
        for (const arg of args) {
            const text = readFile('cat', arg);
            if (text !== undefined) print(text);
        }
    },

    // Prints the first / last lines of a file.  head [-n 5] <file>
    head(args) { headTail('head', args, (lines, n) => lines.slice(0, n)); },
    tail(args) { headTail('tail', args, (lines, n) => (n ? lines.slice(-n) : [])); },

    // Prints lines containing some text.  grep [-i] [-n] [-v] [-r] <text> <file | dir>
    grep(args) {
        const flags = args.filter(a => /^-[invrc]+$/.test(a)).join('');
        const [pattern, target] = args.filter(a => !/^-[invrc]+$/.test(a));
        if (!pattern || !target) return print('usage: grep [-i] [-n] [-v] [-r] <text> <file>');
        const needle = flags.includes('i') ? pattern.toLowerCase() : pattern;
        const matches = (line) => (flags.includes('i') ? line.toLowerCase() : line).includes(needle) !== flags.includes('v');

        const searchFile = (text, label) => {
            const found = [];
            text.split('\n').forEach((line, i) => {
                if (matches(line)) found.push(`${label}${flags.includes('n') ? (i + 1) + ':' : ''}${line}`);
            });
            if (flags.includes('c')) return print(`${label}${found.length}`);
            if (found.length) print(found.join('\n'));
        };

        const path = resolve(target);
        const node = getNode(path);
        if (isDir(node)) {
            if (!flags.includes('r')) return print(`grep: ${target}: Is a directory`);
            // Every readable file below the folder, with its path in front
            const walk = (n, p, str) => {
                if (isLocked(p)) return print(`grep: ${str}: Permission denied`);
                if (!isDir(n)) return searchFile(n, str + ':');
                for (const name of Object.keys(n)) walk(n[name], [...p, name], str.replace(/\/$/, '') + '/' + name);
            };
            return walk(node, path, target);
        }
        const text = readFile('grep', target);
        if (text !== undefined) searchFile(text, '');
    },

    // Same as cat: the terminal has no pager
    less(args) { commands.cat(args.filter(a => !a.startsWith('-'))); },
    more(args) { commands.cat(args.filter(a => !a.startsWith('-'))); },

    // Sorts the lines of a file.  sort [-r] [-u] [-n] <file>
    sort(args) {
        const flags = args.filter(a => a.startsWith('-')).join('');
        const text = readFile('sort', args.find(a => !a.startsWith('-')));
        if (text === undefined) return;
        let lines = text.split('\n');
        lines.sort(flags.includes('n') ? (a, b) => parseFloat(a) - parseFloat(b) : (a, b) => a.localeCompare(b));
        if (flags.includes('r')) lines.reverse();
        if (flags.includes('u')) lines = lines.filter((l, i) => i === 0 || l !== lines[i - 1]);
        print(lines.join('\n'));
    },

    // Removes repeated lines next to each other.  uniq [-c] <file>
    uniq(args) {
        const text = readFile('uniq', args.find(a => !a.startsWith('-')));
        if (text === undefined) return;
        const out = [];
        for (const line of text.split('\n')) {
            const last = out[out.length - 1];
            if (last && last.line === line) last.count++;
            else out.push({ line, count: 1 });
        }
        print(out.map(o => (args.includes('-c') ? String(o.count).padStart(7) + ' ' : '') + o.line).join('\n'));
    },

    // Copies files.  cp <from> <to>   /   cp -r <folder> <to>
    cp(args) {
        const files = args.filter(a => !a.startsWith('-'));
        if (files.length < 2) return print(files.length ? `cp: missing destination file operand after '${files[0]}'` : 'cp: missing file operand');
        const recursive = args.some(a => /^-[a-z]*[rR]/.test(a));
        const error = copyFile(resolve(files[0]), resolve(files[1]), recursive);
        if (error) print(`cp: cannot copy '${files[0]}' to '${files[1]}': ${error}`);
    },

    // Removes empty folders.  rmdir <folder>
    rmdir(args) {
        const dirs = args.filter(a => !a.startsWith('-'));
        if (!dirs.length) return print('rmdir: missing operand');
        for (const dir of dirs) {
            const node = getNode(resolve(dir));
            if (node === undefined || node === null) { print(`rmdir: failed to remove '${dir}': ${node === null ? 'Permission denied' : 'No such file or directory'}`); continue; }
            if (!isDir(node)) { print(`rmdir: failed to remove '${dir}': Not a directory`); continue; }
            if (Object.keys(node).length) { print(`rmdir: failed to remove '${dir}': Directory not empty`); continue; }
            const error = removeFile(resolve(dir), true);
            if (error) print(`rmdir: failed to remove '${dir}': ${error}`);
        }
    },

    // Shows a folder as a tree.  tree [-a] [-L depth] [folder]
    tree(args) {
        const showHidden = args.includes('-a');
        const depthIndex = args.indexOf('-L');
        const maxDepth = depthIndex >= 0 ? parseInt(args[depthIndex + 1], 10) || 1 : Infinity;
        const target = args.find((a, i) => !a.startsWith('-') && (depthIndex < 0 || i !== depthIndex + 1)) || '.';
        const path = resolve(target);
        const node = getNode(path);
        if (!isDir(node)) return print(node === undefined || node === null ? notFound('tree', target, node) : target);

        const lines = [target];
        let dirs = 0, fileCount = 0;
        const walk = (n, p, prefix, depth) => {
            const names = Object.keys(n).filter(name => showHidden || !name.startsWith('.')).sort();
            names.forEach((name, i) => {
                const last = i === names.length - 1;
                const child = n[name];
                const childPath = [...p, name];
                const locked = isLocked(childPath);
                lines.push(`${prefix}${last ? '└── ' : '├── '}${name}${locked && isDir(child) ? '  [error opening dir]' : ''}`);
                if (isDir(child)) {
                    dirs++;
                    if (!locked && depth < maxDepth) walk(child, childPath, prefix + (last ? '    ' : '│   '), depth + 1);
                } else fileCount++;
            });
        };
        walk(node, path, '', 1);
        lines.push('', `${dirs} director${dirs === 1 ? 'y' : 'ies'}, ${fileCount} file${fileCount === 1 ? '' : 's'}`);
        print(lines.join('\n'));
    },

    // Details about a file.  stat <file>
    stat(args) {
        const arg = args.find(a => !a.startsWith('-'));
        if (!arg) return print('stat: missing operand');
        const path = resolve(arg);
        const node = getNode(path);
        if (node === undefined || node === null) return print(`stat: cannot statx '${arg}': ${node === null ? 'Permission denied' : 'No such file or directory'}`);
        const m = session.machine;
        const dir = isDir(node);
        const locked = m.locked.has('/' + path.join('/'));
        const owner = ('/' + path.join('/') + '/').startsWith(`/home/${m.user}/`) && !locked ? m.user : 'root';
        print([
            `  File: ${arg}`,
            `  Size: ${dir ? 4096 : node.length}\tBlocks: ${Math.ceil((dir ? 4096 : node.length) / 512)}\t${dir ? 'directory' : 'regular file'}`,
            `Access: (${dir ? (locked ? '0700/drwx------' : '0755/drwxr-xr-x') : (locked ? '0600/-rw-------' : '0644/-rw-r--r--')})  Uid: (${owner === 'root' ? 0 : 1000}/${owner})`,
            `Modify: 2026-11-20 10:13:44.000000000 +0100`,
        ].join('\n'));
    },

    // Disk usage.  du [-s] [-h] [folder]
    du(args) {
        const flags = args.filter(a => a.startsWith('-')).join('');
        const target = args.find(a => !a.startsWith('-')) || '.';
        const path = resolve(target);
        const node = getNode(path);
        if (node === undefined || node === null) return print(notFound('du', target, node));
        const fmt = (bytes) => (flags.includes('h') ? (bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + 'M' : Math.ceil(bytes / 1024) + 'K') : String(Math.ceil(bytes / 1024)));
        const lines = [];
        const walk = (n, p, str) => {
            if (isLocked(p)) return lines.push(`du: cannot read directory '${str}': Permission denied`);
            if (isDir(n) && !flags.includes('s')) for (const name of Object.keys(n)) if (isDir(n[name])) walk(n[name], [...p, name], str.replace(/\/$/, '') + '/' + name);
            lines.push(`${fmt(sizeOf(n))}\t${str}`);
        };
        walk(node, path, target);
        print(lines.join('\n'));
    },

    // Free disk space.  df [-h]
    df(args) {
        const h = args.includes('-h');
        print([
            'Filesystem      ' + (h ? 'Size  Used Avail Use%' : '1K-blocks     Used Available Use%') + ' Mounted on',
            '/dev/sda1       ' + (h ? ' 49G   18G   29G  39%' : ' 51290592 18874368  29778752  39%') + ' /',
            'tmpfs           ' + (h ? '3.9G     0  3.9G   0%' : '  4074172        0   4074172   0%') + ' /dev/shm',
            '/dev/sda2       ' + (h ? '511M  6.1M  505M   2%' : '   523248     6220    517028   2%') + ' /boot/efi',
        ].join('\n'));
    },

    // Finds files.  find [dir] [-name pattern]   (* is a wildcard)
    find(args) {
        const nameIndex = args.indexOf('-name');
        const pattern = nameIndex >= 0 ? args[nameIndex + 1] : null;
        const start = args[0] && args[0] !== '-name' ? args[0] : '.';

        // Turns "*.txt" into a regular expression: ^.*\.txt$
        const regex = pattern && new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');

        const startPath = resolve(start);
        const startNode = getNode(startPath);
        if (startNode === undefined || startNode === null) return print(notFound('find', start, startNode));

        // Walks every directory and prints each path. Locked directories can't be entered.
        const walk = (node, path, str) => {
            if (!regex || regex.test(path[path.length - 1] || '')) print(str);
            if (!isDir(node)) return;
            if (isLocked(path)) return print(`find: '${str}': Permission denied`);
            for (const name of Object.keys(node)) walk(node[name], [...path, name], str.replace(/\/$/, '') + '/' + name);
        };
        walk(startNode, startPath, start);
    },
});
