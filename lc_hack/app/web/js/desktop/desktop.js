// =====================================================================
//  Opening / closing the desktop: panel, dock and desktop icons.
//  The desktop icons are the files in ~/Desktop, so anything saved or
//  moved there shows up on the desktop, and the other way around.
// =====================================================================

const desktopEl = document.getElementById('desktop');

// The open desktop: { session, theme, remote, z, terminalWin, clock, timer, icons, refreshers }
//   refreshers = redraw functions of open file windows, called when files change
let desk = null;

// ---------- Helpers ----------

// Creates an element.  el('div', 'class', 'text')
function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
}

// Creates a Font Awesome icon.  icon('fa-solid fa-folder')
function icon(classes) {
    const i = document.createElement('i');
    i.className = classes;
    return i;
}

// A button with an icon (and an optional text)
function iconButton(className, iconClass, title, text) {
    const b = el('button', className);
    b.append(icon(iconClass));
    if (text) b.append(document.createTextNode(' ' + text));
    if (title) b.title = title;
    return b;
}

// Shows a path, e.g. /home/jens
function displayPath(path) {
    return '/' + path.join('/');
}

// Runs fn as the desktop's login (so it keeps working after ssh-ing elsewhere in the terminal)
function asDesk(fn) {
    return withSession(desk.session, fn);
}

// Updates the clock in the panel. macOS shows the date too: "Mon 23 Nov 07:04"
function updateClock() {
    if (!desk) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    desk.clock.textContent = THEMES[desk.theme].longClock
        ? `${now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')}  ${time}`
        : time;
}

// ---------- Open / close ----------

// Opens the desktop for a login. remote = opened with rdp (logging out also logs off the machine).
function openDesktop(s, remote) {
    closeDesktop();
    const theme = s.machine.desktop;
    const t = THEMES[theme];
    desk = { session: s, theme, remote, z: 10, terminalWin: null, clock: null, timer: null, icons: null, refreshers: new Set() };

    desktopEl.className = 'theme-' + theme;
    desktopEl.innerHTML = '';
    desktopEl.hidden = false;
    term.hidden = true;        // The CLI only shows up inside the terminal window
    term.dataset.os = theme;   // The terminal looks like this desktop's terminal

    // --- Panel: menu, hostname, tray, clock, log out ---
    const panel = el('div', 'panel');
    const menu = el('span', 'menu');
    menu.append(icon(t.menuIcon));
    if (t.menu) menu.append(el('span', 'menu-app', t.menu));
    for (const name of t.menus || []) menu.append(el('span', 'menu-item', name));
    panel.append(menu, el('span', 'host', `${s.user}@${s.machine.host}`));
    if (t.tray) {
        const tray = el('span', 'tray');
        tray.append(icon(ICONS.wifi), icon(ICONS.volume), icon(ICONS.battery));
        panel.append(tray);
    }
    desk.clock = el('span', 'clock');
    const power = iconButton('power', ICONS.power, t.logout);
    power.onclick = logoutDesktop;
    panel.append(desk.clock, power);

    // --- Dock: apps ---
    const dock = el('div', 'dock');
    dock.append(...Object.keys(APPS).map(dockButton));
    if (t.dockTrash) {
        const trash = iconButton('dock-item app-trash', ICONS.trash, t.trash);
        trash.onclick = () => openFiles(s.home, `${t.trash} is empty.`);
        dock.append(el('span', 'dock-sep'), trash);
    }

    // --- Desktop icons ---
    desk.icons = el('div', 'icons');

    desktopEl.append(desk.icons, panel, dock);
    renderDesktopIcons();
    updateClock();
    desk.timer = setInterval(updateClock, 10000);
}

// Closes the desktop and puts the CLI back in the whole box.
function closeDesktop() {
    if (!desk) return;
    useTerm(mainTerm);
    closeExtraTerms();
    closeCameras();
    clearInterval(desk.timer);
    box.prepend(term);         // Move the CLI out of the terminal window again
    term.hidden = false;
    term.dataset.os = '';
    desktopEl.hidden = true;
    desktopEl.innerHTML = '';
    desk = null;
    updatePrompt();
    input.focus();
}

// The "Log Out" button. If the desktop was opened with rdp, it also logs off the machine.
function logoutDesktop() {
    const d = desk;
    closeDesktop();
    if (d.remote && sessions.includes(d.session)) {
        while (sessions[sessions.length - 1] !== d.session) sessions.pop();
        commands.exit();
        updatePrompt();
    }
}

// Files changed (filesystem.js): redraw the desktop icons and every open file window
function refreshDesktop() {
    renderDesktopIcons();
    for (const fn of desk.refreshers) fn();
}

// ---------- Dock ----------

// Starts an app, or brings back its minimized windows.
// app = id in APPS; also used as a class, so themes can style each app (.app-terminal)
function dockButton(app) {
    const b = iconButton('dock-item app-' + app, appIcon(app), appName(app));
    b.onclick = () => {
        const minimized = desktopEl.querySelectorAll(`.window.minimized[data-app="${app}"]`);
        if (!minimized.length) return APPS[app].open();
        minimized.forEach(w => {
            w.classList.remove('minimized');
            w.style.zIndex = ++desk.z;
        });
    };
    return b;
}

// ---------- Desktop icons ----------

// Home and Trash, then everything in ~/Desktop
function renderDesktopIcons() {
    const s = desk.session;
    const t = THEMES[desk.theme];
    const icons = [desktopIcon(t.homeIcon || ICONS.home, t.home, () => openFiles(s.home))];
    if (!t.dockTrash) icons.push(desktopIcon(ICONS.trash, t.trash, () => openFiles(s.home, `${t.trash} is empty.`)));

    const dir = [...s.home, 'Desktop'];
    const node = asDesk(() => getNode(dir));
    if (isDir(node)) {
        for (const name of folderNames(node, false)) {
            const path = [...dir, name];
            const item = desktopIcon(fileIconFor(path, node[name]), name, () => openFile(path));
            item.classList.add('icon-file');
            makeDraggable(item, path);
            icons.push(item);
        }
    }
    desk.icons.replaceChildren(...icons);
}

function desktopIcon(iconClass, label, onOpen) {
    const d = el('div', 'icon');
    const img = el('div', 'icon-img');
    img.append(icon(iconClass));
    d.append(img, el('div', 'icon-label', label));
    d.ondblclick = onOpen;
    // Click selects, like on a real desktop
    d.onmousedown = () => {
        desktopEl.querySelectorAll('.icon.selected').forEach(i => i.classList.remove('selected'));
        d.classList.add('selected');
    };
    return d;
}

// ---------- Drag and drop between the desktop and file windows ----------

const DRAG_TYPE = 'application/x-lc-path';

// Files dropped on the desktop (not on a window) move to ~/Desktop
desktopEl.addEventListener('dragover', (e) => { if (desk && !e.target.closest('.window')) e.preventDefault(); });
desktopEl.addEventListener('drop', (e) => {
    if (!desk || e.target.closest('.window')) return;
    e.preventDefault();
    dropFile(e, [...desk.session.home, 'Desktop']);
});

function makeDraggable(item, path) {
    item.draggable = true;
    item.addEventListener('dragstart', (e) => e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(path)));
}

// Moves the dragged file into the folder "to"
function dropFile(e, to) {
    const data = e.dataTransfer.getData(DRAG_TYPE);
    if (!data) return;
    const from = JSON.parse(data);
    if (from.slice(0, -1).join('/') === to.join('/')) return; // Dropped in the folder it is already in
    const error = asDesk(() => moveFile(from, to));
    if (error) showError(`Could not move "${from[from.length - 1]}": ${error}.`);
}
