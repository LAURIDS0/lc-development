// =====================================================================
//  Always-on servers (config.lua on the game server)
//  Their files live on the game server: changes made here are sent there,
//  checked and saved, and every other player in a hack gets them too.
//  Every other machine only exists in this hack.
// =====================================================================

// Sends changes made on the current machine, if it is an always-on server.
//   ops = { op: 'write' | 'mkdir' | 'delete', path: '/abs/path', content? }[]
function syncFiles(ops) {
    if (session.machine.internet) post('serverFiles', { machine: session.machine.index, ops });
}

// The changes that recreate a file or folder at path (used when moving)
function treeOps(path, node, ops = []) {
    const str = '/' + path.join('/');
    if (!isDir(node)) {
        ops.push({ op: 'write', path: str, content: node });
        return ops;
    }
    ops.push({ op: 'mkdir', path: str });
    for (const name of Object.keys(node)) treeOps([...path, name], node[name], ops);
    return ops;
}

// Applies changes to a server's filesystem. The server already checked them.
function applyOps(m, ops) {
    const base = { cwd: [], home: ['home', m.user] };
    for (const op of ops) {
        const parts = resolve(op.path, base);
        if (op.op === 'delete') removePath(m.fs, parts);
        else addPath(m.fs, parts, op.op === 'mkdir', op.content);
    }
}

// Another player changed files on a server (client/terminal.lua)
function applyServerFiles(ip, ops) {
    const m = machines.find(x => x.internet && x.ips.includes(ip));
    if (!m) return;
    applyOps(m, toList(ops));
    fsChanged();
}
