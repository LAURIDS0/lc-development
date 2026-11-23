// =====================================================================
//  Screens (Direct-Rendered UI)
//  Hacker: when the terminal was opened from a terminal with a screen,
//  a copy of the window is sent to the server every time it changes.
//  Screen: the same page loaded as a DUI with "?mirror" shows that copy.
//  The copy comes from another player, so it is sanitized before use.
// =====================================================================

const MIRROR = new URLSearchParams(location.search).has('mirror');

// =====================================================================
//  Hacker side
// =====================================================================

let mirrorEnabled = false; // Only while a hack from a terminal with a screen is open
let mirrorTimer = null;
let mirrorLast = '';

const MIRROR_LINES = 80;   // Lines of terminal output sent to the screen
const MIRROR_DELAY = 150;  // ms to wait for more changes before sending

// A copy of the window as HTML. What is typed in fields isn't part of the HTML,
// so it is copied over. Password fields are always sent empty.
function mirrorSnapshot() {
    const originals = box.querySelectorAll('input, textarea');
    const clone = box.cloneNode(true);
    const copies = clone.querySelectorAll('input, textarea');
    originals.forEach((field, i) => {
        const copy = copies[i];
        if (field.tagName === 'TEXTAREA') copy.textContent = field.value;
        else if (field.type === 'password') copy.setAttribute('value', '');
        else if (field.type === 'checkbox') field.checked ? copy.setAttribute('checked', '') : copy.removeAttribute('checked');
        else copy.setAttribute('value', field.value);
    });
    const out = clone.querySelector('.output');
    while (out.children.length > MIRROR_LINES) out.firstElementChild.remove();
    return clone.innerHTML;
}

// Waits a moment so a burst of changes becomes one update
function mirrorQueue() {
    if (!mirrorEnabled || mirrorTimer) return;
    mirrorTimer = setTimeout(mirrorSend, MIRROR_DELAY);
}

function mirrorSend() {
    mirrorTimer = null;
    if (!mirrorEnabled) return;
    const html = mirrorSnapshot();
    if (html === mirrorLast) return; // Nothing changed
    mirrorLast = html;
    post('mirror', { html, width: box.clientWidth, height: box.clientHeight });
}

if (!MIRROR) {
    // Start / stop together with the terminal (terminal.js handles the rest of these messages)
    window.addEventListener('message', (e) => {
        if (e.data.action === 'open') {
            mirrorEnabled = !!(e.data.config && e.data.config.mirror);
            mirrorLast = '';
            mirrorQueue();
        }
        if (e.data.action === 'close') mirrorEnabled = false;
    });

    // Any change in the window, and typing in any field (the CLI, the text editor...)
    new MutationObserver(mirrorQueue).observe(box, { subtree: true, childList: true, attributes: true, characterData: true });
    box.addEventListener('input', mirrorQueue);
}

// =====================================================================
//  Screen side
// =====================================================================

const ALLOWED_TAGS = new Set(['DIV', 'SPAN', 'BUTTON', 'I', 'PRE', 'LABEL', 'INPUT', 'TEXTAREA']);
const ALLOWED_ATTRIBUTES = new Set(['class', 'id', 'hidden', 'title', 'style', 'type', 'value', 'checked', 'data-os']);

// Keeps only the tags and attributes the terminal and desktops use. Everything else
// (scripts, images, event handlers, url() in styles) is removed.
function sanitize(html) {
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
    const clean = (node) => {
        for (const child of [...node.children]) {
            if (!ALLOWED_TAGS.has(child.tagName)) {
                child.remove();
                continue;
            }
            for (const attr of [...child.attributes]) {
                const name = attr.name.toLowerCase();
                const unsafeStyle = name === 'style' && /url\s*\(|expression|@import|javascript:/i.test(attr.value);
                if (!ALLOWED_ATTRIBUTES.has(name) || unsafeStyle) child.removeAttribute(attr.name);
            }
            clean(child);
        }
    };
    clean(doc.body);
    return doc.body.innerHTML;
}

// Shown while nobody is using the terminal
function showIdle(label) {
    box.style.cssText = 'width: 100vw; height: 100vh;';
    box.innerHTML = '';
    const idle = document.createElement('div');
    idle.className = 'mirror-idle';
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-terminal';
    const title = document.createElement('div');
    title.className = 'mirror-title';
    title.textContent = label || 'Terminal';
    const status = document.createElement('div');
    status.className = 'mirror-status';
    status.textContent = 'Waiting for connection';
    const cursor = document.createElement('span');
    cursor.className = 'mirror-cursor';
    status.append(cursor);
    idle.append(icon, title, status);
    box.append(idle);
}

// Shows a copy of the hacker's window, scaled to fill the screen
function showMirror(state) {
    const width = Number(state.width) || 1280;
    const height = Number(state.height) || 720;
    const scale = Math.min(window.innerWidth / width, window.innerHeight / height);
    box.style.cssText = `width: ${width}px; height: ${height}px; transform: scale(${scale}); ` +
        `left: ${(window.innerWidth - width * scale) / 2}px; top: ${(window.innerHeight - height * scale) / 2}px;`;
    box.innerHTML = sanitize(String(state.html || ''));
    const view = box.querySelector('.term');
    if (view) view.scrollTop = view.scrollHeight; // Newest output, like on the hacker's screen
}

if (MIRROR) {
    document.body.classList.add('mirror');
    showIdle();

    // Messages from client/screens.lua (SendDuiMessage)
    window.addEventListener('message', (e) => {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data || data.action !== 'mirror') return;
        if (data.state) showMirror(data.state);
        else showIdle(data.label);
    });
}
