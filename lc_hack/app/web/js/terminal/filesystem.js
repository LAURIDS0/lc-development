// =====================================================================
//  Filesystem
//  Every machine has its own filesystem: directory = object, file = string.
//  Locked paths are stored in the machine's "locked" set; only root can read them.
// =====================================================================

// Turns a path typed by the player (e.g. "../docs", "/etc", "~/x") into a list of names.
// "base" is the login to resolve from (its working directory and home directory).
function resolve(arg, base = session) {
    // Start at the root for "/", at home for "~", otherwise in the current directory.
    const path = arg.startsWith('/') ? [] : arg.startsWith('~') ? [...base.home] : [...base.cwd];
    for (const part of arg.replace(/^~/, '').split('/')) {
        if (part === '' || part === '.') continue; // "." and empty parts are ignored
        if (part === '..') path.pop();              // ".." goes up a directory
        else path.push(part);                        // Anything else goes down
    }
    return path;
}

// Is the path locked for the current login? Root can read everything.
function isLocked(path) {
    return !session.root && session.machine.locked.has('/' + path.join('/'));
}

// Returns whatever is at a path on the current machine.
// undefined if it doesn't exist, null if it (or a directory on the way) is locked.
function getNode(path) {
    let node = session.machine.fs;
    for (let i = 0; i < path.length; i++) {
        if (!isDir(node) || !has(node, path[i])) return undefined;
        node = node[path[i]];
        if (isLocked(path.slice(0, i + 1))) return null;
    }
    return node;
}

// Adds a file (or an empty directory) to a filesystem.
// Directories on the way are created automatically, like "mkdir -p".
function addPath(fs, parts, isDirPath, content) {
    parts = [...parts];
    const name = isDirPath ? null : parts.pop();
    let node = fs;
    for (const part of parts) {
        if (!isDir(node[part])) node[part] = {};
        node = node[part];
    }
    if (name) node[name] = String(content ?? '');
}

// Turns a path list into text. The home directory is shown as "~", like on Linux.
function pathToString(path) {
    const str = '/' + path.join('/');
    const homeStr = '/' + session.home.join('/');
    return (str + '/').startsWith(homeStr + '/') ? '~' + str.slice(homeStr.length) : str;
}

// Shared error message for things that don't exist or are locked.
function notFound(cmd, arg, node) {
    return node === null
        ? `${cmd}: ${arg}: Permission denied`
        : `${cmd}: ${arg}: No such file or directory`;
}

// Returns a file's text, or prints an error and returns undefined.
function readFile(cmd, arg) {
    if (!arg) return print(`${cmd}: missing file operand`);
    const node = getNode(resolve(arg));
    if (typeof node === 'string') return node;
    print(isDir(node) ? `${cmd}: ${arg}: Is a directory` : notFound(cmd, arg, node));
}

// May the current login write here? Like Linux: users write in their own home and /tmp, root everywhere.
// The web root (/var/www/html) belongs to the machine's user, so they can build its website.
// server/servers.lua checks the same rule for the always-on servers.
function canWrite(path) {
    if (session.root) return true;
    const str = '/' + path.join('/') + '/';
    return str.startsWith(`/home/${session.user}/`) || str.startsWith('/tmp/') ||
        (session.user === session.machine.user && str.startsWith('/var/www/html/'));
}

// Removes a file or folder from a filesystem (no checks; used when building and syncing)
function removePath(fs, parts) {
    let node = fs;
    for (const part of parts.slice(0, -1)) {
        if (!isDir(node) || !has(node, part)) return;
        node = node[part];
    }
    if (isDir(node)) delete node[parts[parts.length - 1]];
}

// Writes (creates or replaces) a file. Returns an error text, or null on success.
// Used by "echo > file", "touch" and the desktop text editor.
function writeFile(path, text) {
    if (!path.length) return 'Is a directory';
    const parent = getNode(path.slice(0, -1));
    if (parent === null) return 'Permission denied';
    if (!isDir(parent)) return 'No such file or directory';
    const name = path[path.length - 1];
    if (has(parent, name) && isDir(parent[name])) return 'Is a directory';
    if (isLocked(path) || !canWrite(path)) return 'Permission denied';
    parent[name] = String(text);
    syncFiles([{ op: 'write', path: '/' + path.join('/'), content: String(text) }]);
    fsChanged();
    return null;
}

// Creates a folder, like "mkdir". parents = "mkdir -p". Returns an error text, or null.
function makeDir(path, parents) {
    if (!path.length) return 'File exists';
    for (let i = parents ? 1 : path.length; i <= path.length; i++) {
        const p = path.slice(0, i);
        const node = getNode(p);
        if (node === null) return 'Permission denied';
        if (isDir(node) && (parents || i < path.length)) continue;
        if (node !== undefined) return 'File exists';
        const parent = getNode(p.slice(0, -1));
        if (parent === null) return 'Permission denied';
        if (!isDir(parent)) return 'No such file or directory';
        if (isLocked(p) || !canWrite(p)) return 'Permission denied';
        parent[p[p.length - 1]] = {};
        syncFiles([{ op: 'mkdir', path: '/' + p.join('/') }]);
    }
    fsChanged();
    return null;
}

// Deletes a file, or a folder when recursive ("rm -r"). Returns an error text, or null.
function removeFile(path, recursive) {
    const node = getNode(path);
    if (node === undefined) return 'No such file or directory';
    if (node === null || !path.length || isLocked(path) || !canWrite(path)) return 'Permission denied';
    if (isDir(node) && !recursive) return 'Is a directory';
    delete getNode(path.slice(0, -1))[path[path.length - 1]];
    syncFiles([{ op: 'delete', path: '/' + path.join('/') }]);
    fsChanged();
    return null;
}

// Moves a file or directory, like "mv". Into "to" when it is a directory.
// Returns an error text, or null on success. Used by "mv" and drag and drop on the desktop.
// Does a folder have a locked file or folder in it? Locks are by path, so moving or
// copying it would leave the locked file readable at its new path.
function containsLocked(path, node) {
    if (session.root || !isDir(node)) return false;
    const prefix = '/' + path.join('/') + '/';
    for (const locked of session.machine.locked) if (locked.startsWith(prefix)) return true;
    return false;
}

function moveFile(from, to) {
    const node = getNode(from);
    if (node === undefined) return 'No such file or directory';
    if (node === null || !from.length || !canWrite(from) || containsLocked(from, node)) return 'Permission denied';
    const dest = isDir(getNode(to)) ? [...to, from[from.length - 1]] : to;
    const fromStr = '/' + from.join('/');
    const destStr = '/' + dest.join('/');
    if (destStr === fromStr) return null;
    if (destStr.startsWith(fromStr + '/')) return 'Invalid argument'; // A folder into itself
    const parent = getNode(dest.slice(0, -1));
    if (parent === null) return 'Permission denied';
    if (!isDir(parent) || !dest.length) return 'No such file or directory';
    const name = dest[dest.length - 1];
    if (has(parent, name) && isDir(parent[name])) return 'Is a directory';
    if (isLocked(dest) || !canWrite(dest)) return 'Permission denied';
    parent[name] = node;
    delete getNode(from.slice(0, -1))[from[from.length - 1]];
    syncFiles([{ op: 'delete', path: fromStr }, ...treeOps(dest, node)]);
    fsChanged();
    return null;
}

// Copies a file, or a folder when recursive ("cp -r"). Into "to" when it is a directory.
// Returns an error text, or null on success.
function copyFile(from, to, recursive) {
    const node = getNode(from);
    if (node === undefined) return 'No such file or directory';
    if (node === null || containsLocked(from, node)) return 'Permission denied';
    if (isDir(node) && !recursive) return 'Is a directory (use -r)';
    const dest = isDir(getNode(to)) ? [...to, from[from.length - 1]] : to;
    if (('/' + dest.join('/') + '/').startsWith('/' + from.join('/') + '/')) return 'Invalid argument'; // Into itself
    const parent = getNode(dest.slice(0, -1));
    if (parent === null) return 'Permission denied';
    if (!isDir(parent) || !dest.length) return 'No such file or directory';
    const name = dest[dest.length - 1];
    if (has(parent, name) && isDir(parent[name]) !== isDir(node)) return isDir(node) ? 'Not a directory' : 'Is a directory';
    if (isLocked(dest) || !canWrite(dest)) return 'Permission denied';
    const copy = isDir(node) ? JSON.parse(JSON.stringify(node)) : node;
    parent[name] = copy;
    syncFiles(treeOps(dest, copy));
    fsChanged();
    return null;
}

// The size of a file or folder in bytes (a folder is 4096 plus everything in it)
function sizeOf(node) {
    if (!isDir(node)) return node.length;
    let size = 4096;
    for (const name of Object.keys(node)) size += sizeOf(node[name]);
    return size;
}

// Something on a filesystem changed: redraw the desktop icons and open file windows.
function fsChanged() {
    if (desk) refreshDesktop();
}

// What kind of file is it? Used by "file" and the desktop file manager.
function fileType(name, node) {
    if (isDir(node)) return 'directory';
    if (/\.(jpe?g)$/i.test(name)) return 'JPEG image data';
    if (/\.png$/i.test(name)) return 'PNG image data';
    if (node === '') return 'empty';
    if (node.startsWith('\x7fELF')) return 'ELF 64-bit LSB executable, x86-64, dynamically linked';
    if (node.startsWith('#!')) return 'Bourne-Again shell script, ASCII text executable';
    return /[^\x00-\x7f]/.test(node) ? 'UTF-8 Unicode text' : 'ASCII text';
}
