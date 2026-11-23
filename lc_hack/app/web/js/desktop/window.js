// =====================================================================
//  App windows: move, minimize, maximize, close, bring to the front.
//  Every window has all three buttons; each theme shows them its own way
//  (macOS traffic lights on the left, GNOME only a close button, ...).
// =====================================================================

// Creates a window.  app = the app it belongs to (the dock brings back its minimized windows)
function createWindow(title, body, { width = 520, height = 340, app = '' } = {}) {
    const win = el('div', 'window');
    win.dataset.app = app;
    const bar = el('div', 'titlebar');
    const controls = el('div', 'win-controls');
    const min = iconButton('win-btn win-min', ICONS.minimize, 'Minimize');
    const max = iconButton('win-btn win-max', ICONS.maximize, 'Maximize');
    const close = iconButton('win-btn win-close', ICONS.close, 'Close');
    controls.append(min, max, close);
    bar.append(el('span', 'win-title', title), controls);
    win.append(bar, body);
    body.classList.add('win-body');

    // Offset windows a little so they don't cover each other completely
    const offset = (desktopEl.querySelectorAll('.window').length % 6) * 28;
    win.style.width = width + 'px';
    win.style.height = height + 'px';
    win.style.left = 180 + offset + 'px';
    win.style.top = 60 + offset + 'px';

    const focus = () => { win.style.zIndex = ++desk.z; };
    const toggleMax = () => win.classList.toggle('maximized');
    win.addEventListener('mousedown', focus);
    close.onclick = () => win.remove();
    min.onclick = () => win.classList.add('minimized');
    max.onclick = toggleMax;
    bar.ondblclick = (e) => { if (!controls.contains(e.target)) toggleMax(); };

    // Drag the title bar to move the window (kept inside the desktop)
    bar.addEventListener('mousedown', (e) => {
        if (controls.contains(e.target) || win.classList.contains('maximized')) return;
        const startX = e.clientX - win.offsetLeft;
        const startY = e.clientY - win.offsetTop;
        const move = (ev) => {
            const maxX = desktopEl.clientWidth - 80;
            const maxY = desktopEl.clientHeight - 30;
            win.style.left = Math.min(Math.max(ev.clientX - startX, -width + 80), maxX) + 'px';
            win.style.top = Math.min(Math.max(ev.clientY - startY, 0), maxY) + 'px';
        };
        const up = () => {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    });

    desktopEl.append(win);
    focus();
    return win;
}

// A small error dialog, e.g. for locked files
function showError(message) {
    const body = el('div', 'dialog');
    const iconEl = el('div', 'dialog-icon');
    iconEl.append(icon(ICONS.warning));
    body.append(iconEl, el('div', 'dialog-text', message));
    createWindow('Error', body, { width: 360, height: 150 });
}
