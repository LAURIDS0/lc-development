// =====================================================================
//  App: Files (Finder, Nautilus, Thunar, Nemo, ...)
//  A sidebar with places, and the folder's contents. Files can be
//  dragged between windows, folders and the desktop.
// =====================================================================

registerApp('files', {
    open: () => openFiles(desk.session.home),
    name: 'Files', names: { kali: 'Thunar', macos: 'Finder', mint: 'Nemo' },
    icon: 'fa-solid fa-folder-open', icons: { macos: 'fa-solid fa-face-smile', chromeos: 'fa-solid fa-folder' },
});

// Sidebar places: [label, icon, path from home (or null = "/")]
const PLACES = [
    ['Home', ICONS.home, []],
    ['Desktop', ICONS.desktop, ['Desktop']],
    ['Documents', ICONS.documents, ['Documents']],
    ['Downloads', ICONS.downloads, ['Downloads']],
    ['Pictures', ICONS.pictures, ['Pictures']],
    [null, ICONS.drive, null], // "/", named by the theme
];

// Names in a folder: folders first, hidden files (".x") only when asked
function folderNames(node, showHidden) {
    return Object.keys(node)
        .filter(n => showHidden || !n.startsWith('.'))
        .sort((a, b) => (isDir(node[b]) - isDir(node[a])) || a.localeCompare(b));
}

function isImage(name) {
    return /\.(jpe?g|png|gif|svg|webp)$/i.test(name);
}

// Icon for a file or folder on the desktop's machine
function fileIconFor(path, node) {
    if (asDesk(() => isLocked(path))) return ICONS.lock;
    if (isDir(node)) return ICONS.folder;
    const name = path[path.length - 1];
    if (isImage(name)) return ICONS.image;
    if (/\.(sh|py|php)$/i.test(name) || node.startsWith('#!')) return ICONS.script;
    if (node.startsWith('\x7fELF')) return ICONS.binary;
    return ICONS.file;
}

// Opens a file with the right app: folder = Files, image = viewer, the rest = text editor
function openFile(path) {
    const node = asDesk(() => getNode(path));
    const name = path[path.length - 1];
    if (node === null) return showError(`You don't have permission to open "${name}".`);
    if (node === undefined) return showError('The file no longer exists.');
    if (isDir(node)) return openFiles(path);
    if (isImage(name)) return openViewer(path);
    openEditor(path);
}

// Files: shows a folder on the desktop's machine. message = show a text instead of files.
function openFiles(startPath, message) {
    const s = desk.session;
    const t = THEMES[desk.theme];
    let path = [...startPath];

    // Toolbar: up, path, hidden files
    const body = el('div', 'files');
    const toolbar = el('div', 'files-toolbar');
    const up = iconButton('files-btn', ICONS.up, 'Up');
    const pathEl = el('div', 'files-path');
    const hiddenLabel = el('label', 'files-hidden');
    const hiddenBox = el('input');
    hiddenBox.type = 'checkbox';
    hiddenLabel.append(hiddenBox, document.createTextNode(' Hidden'));
    toolbar.append(up, pathEl, hiddenLabel);

    // Sidebar and contents
    const main = el('div', 'files-main');
    const sidebar = el('div', 'files-sidebar');
    const list = el('div', 'files-list');
    main.append(sidebar, list);
    body.append(toolbar, main);

    const win = createWindow(appName('files'), body, { width: 640, height: 400, app: 'files' });
    const title = win.querySelector('.win-title');

    const go = (p) => {
        path = p;
        message = null;
        render();
    };

    const places = PLACES.map(([label, iconClass, rel]) => {
        const target = rel ? [...s.home, ...rel] : [];
        const item = el('div', 'place');
        item.append(icon(iconClass), el('span', '', label || t.root));
        item.onclick = () => go(target);
        sidebar.append(item);
        return { item, target };
    });

    // Draws the contents of the current folder
    const render = () => {
        if (!win.isConnected) return desk.refreshers.delete(render);
        list.innerHTML = '';
        pathEl.textContent = displayPath(path);
        title.textContent = `${path[path.length - 1] || t.root} - ${appName('files')}`;
        for (const p of places) p.item.classList.toggle('active', p.target.join('/') === path.join('/'));
        if (message) return list.append(el('div', 'files-empty', message));

        const node = asDesk(() => getNode(path));
        if (!isDir(node)) return list.append(el('div', 'files-empty', node === null ? 'Permission denied' : 'Folder not found'));
        const names = folderNames(node, hiddenBox.checked);
        if (!names.length) list.append(el('div', 'files-empty', 'This folder is empty'));
        for (const name of names) {
            const childPath = [...path, name];
            const dir = isDir(node[name]);
            const iconClass = fileIconFor(childPath, node[name]);
            const item = el('div', 'file');
            const iconEl = el('div', 'file-icon' + (iconClass === ICONS.lock ? ' locked' : dir ? ' folder' : ''));
            iconEl.append(icon(iconClass));
            item.append(iconEl, el('div', 'file-name', name));
            item.ondblclick = () => (dir ? go(childPath) : openFile(childPath));
            makeDraggable(item, childPath);
            // Drop on a folder = move into it
            if (dir) {
                item.addEventListener('dragover', (e) => e.preventDefault());
                item.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); dropFile(e, childPath); });
            }
            list.append(item);
        }
    };

    // Drop in the window = move into the folder it shows
    list.addEventListener('dragover', (e) => e.preventDefault());
    list.addEventListener('drop', (e) => { e.preventDefault(); if (!message) dropFile(e, path); });

    up.onclick = () => { if (path.length) go(path.slice(0, -1)); };
    hiddenBox.onchange = render;
    desk.refreshers.add(render);
    render();
}
