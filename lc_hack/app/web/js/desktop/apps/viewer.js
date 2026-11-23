// =====================================================================
//  App: Image viewer (Preview, Image Viewer, Ristretto, Gallery, ...)
//  Shows the images in a folder, with previous / next.
//
//  What an image file contains decides what is shown:
//    'data:image/...' or 'https://...'  -> that image
//    '<svg ...>...</svg>'               -> the SVG (handy for hiding a hint in a picture)
//    anything else                      -> a picture generated from the file name
// =====================================================================

registerApp('viewer', {
    open: () => openViewer(null),
    name: 'Image Viewer', names: { kali: 'Ristretto', macos: 'Preview', chromeos: 'Gallery', mint: 'Xviewer' },
    icon: 'fa-solid fa-image',
});

function imageSrc(name, content) {
    if (/^data:image\//.test(content) || /^https?:\/\//.test(content)) return content;
    const svg = content.trimStart().startsWith('<svg') ? content : generatedImage(name);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); // In an <img>, so scripts never run
}

// Same name = same picture: a landscape with colors picked from the name
function generatedImage(name) {
    let hash = 0;
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    const hue = hash % 360;
    const sunX = 120 + (hash % 560);
    const ridge = (y, step, amp) => {
        let d = `M0 450 L0 ${y}`;
        for (let x = 0; x <= 800; x += step) d += ` L${x} ${y - ((hash >> (x % 13)) % amp)}`;
        return d + ' L800 450 Z';
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
        <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="hsl(${hue},70%,55%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},80%,80%)"/>
        </linearGradient></defs>
        <rect width="800" height="450" fill="url(#sky)"/>
        <circle cx="${sunX}" cy="120" r="48" fill="hsl(${(hue + 180) % 360},90%,85%)" opacity=".9"/>
        <path d="${ridge(300, 80, 120)}" fill="hsl(${hue},30%,35%)"/>
        <path d="${ridge(360, 50, 60)}" fill="hsl(${hue},35%,22%)"/>
        <rect y="400" width="800" height="50" fill="hsl(${hue},40%,15%)"/>
    </svg>`;
}

// Opens an image. path = null opens the first picture in ~/Pictures.
function openViewer(path) {
    const s = desk.session;
    if (!path) {
        const pictures = [...s.home, 'Pictures'];
        const node = asDesk(() => getNode(pictures));
        const first = isDir(node) && folderNames(node, false).find(n => isImage(n) && typeof node[n] === 'string');
        path = first ? [...pictures, first] : null;
    }

    const body = el('div', 'viewer');
    const stage = el('div', 'viewer-stage');
    const img = el('img', 'viewer-img');
    img.draggable = false;
    stage.append(img);
    const bar = el('div', 'viewer-bar');
    const prev = iconButton('viewer-btn', ICONS.back, 'Previous');
    const next = iconButton('viewer-btn', ICONS.forward, 'Next');
    const label = el('span', 'viewer-name');
    bar.append(prev, label, next);
    body.append(stage, bar);

    const win = createWindow(appName('viewer'), body, { width: 620, height: 440, app: 'viewer' });
    const title = win.querySelector('.win-title');

    if (!path) {
        stage.replaceChildren(el('div', 'files-empty', 'No pictures found in ~/Pictures'));
        prev.disabled = next.disabled = true;
        return;
    }

    // Every readable image in the same folder, so previous / next work
    const folder = path.slice(0, -1);
    let names = [];
    let index = 0;
    const load = () => {
        const node = asDesk(() => getNode(folder));
        names = isDir(node) ? folderNames(node, false).filter(n => isImage(n) && typeof node[n] === 'string') : [];
        index = Math.max(0, names.indexOf(path[path.length - 1]));
    };
    const show = () => {
        const name = names[index];
        const content = asDesk(() => getNode([...folder, name]));
        if (typeof content !== 'string') return showError(`"${name}" can't be opened.`);
        path = [...folder, name];
        img.src = imageSrc(name, content);
        img.alt = name;
        label.textContent = `${name}  (${index + 1} / ${names.length})`;
        title.textContent = `${name} - ${appName('viewer')}`;
    };

    load();
    if (!names.length) {
        win.remove();
        return showError(`"${path[path.length - 1]}" can't be opened.`);
    }
    prev.onclick = () => { index = (index - 1 + names.length) % names.length; show(); };
    next.onclick = () => { index = (index + 1) % names.length; show(); };
    show();
}
