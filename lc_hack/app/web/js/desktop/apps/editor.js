// =====================================================================
//  App: Text editor (TextEdit, gedit, Mousepad, Xed, ...)
// =====================================================================

registerApp('editor', {
    open: () => openEditor(null),
    name: 'Text Editor', names: { kali: 'Mousepad', macos: 'TextEdit', chromeos: 'Text', mint: 'Xed' },
    icon: 'fa-solid fa-file-pen',
});

// Text editor: opens a file to edit and save. path = null opens a new document,
// saved to the path typed in the path field (relative paths start in the home directory).
function openEditor(path) {
    const s = desk.session;
    let content = '';

    if (path) {
        const node = withSession(s, () => getNode(path));
        const name = path[path.length - 1];
        if (node === null) return showError(`You don't have permission to open "${name}".`);
        if (typeof node !== 'string') return showError(`"${name}" can't be opened.`);
        content = node; // Binary files show up as garbage, like in a real editor
    }

    const body = el('div', 'editor');
    const toolbar = el('div', 'editor-toolbar');
    const pathField = el('input', 'editor-path');
    pathField.spellcheck = false;
    pathField.value = path ? displayPath(path) : 'Desktop/untitled.txt';
    const save = iconButton('editor-save', ICONS.save, 'Save', 'Save');
    const status = el('span', 'editor-status');
    toolbar.append(pathField, save, status);
    const text = el('textarea', 'editor-text');
    text.spellcheck = false;
    text.value = content;
    body.append(toolbar, text);

    const win = createWindow(`${path ? path[path.length - 1] : 'Untitled'} - ${appName('editor')}`, body, { width: 580, height: 380, app: 'editor' });
    const title = win.querySelector('.win-title');

    // Turns the path field into a path list. Relative paths start in the home directory.
    const target = () => {
        let value = pathField.value.trim();
        if (!value.startsWith('/') && !value.startsWith('~')) value = '~/' + value;
        return withSession(s, () => resolve(value));
    };

    const doSave = () => {
        const p = target();
        const error = withSession(s, () => writeFile(p, text.value));
        if (error) return showError(`Could not save "${p[p.length - 1] || '/'}": ${error}.`);
        pathField.value = displayPath(p);
        title.textContent = `${p[p.length - 1]} - ${appName('editor')}`;
        status.textContent = 'Saved';
        setTimeout(() => { status.textContent = ''; }, 1500);
    };

    save.onclick = doSave;
    text.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            doSave();
        }
    });
    text.addEventListener('input', () => { status.textContent = 'Unsaved'; });
    text.focus();
}
