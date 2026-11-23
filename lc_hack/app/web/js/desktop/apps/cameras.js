// =====================================================================
//  App: Cameras
//  Every camera opened with "view <ip>" gets its own window, and several
//  can be open at once. The game can only show one camera at a time, so
//  one window is live: the client renders that camera and the window is
//  a hole in the NUI the game shows through. The others freeze on their
//  last picture (taken with screenshot-basic) until they are clicked.
// =====================================================================

registerApp('cameras', {
    open: () => openCameraList(),
    name: 'Cameras',
    icon: 'fa-solid fa-video',
});

const cameras = []; // Open camera windows: { machine, ip, win, feed, still, time, frozenAt }
let liveCamera = null;
let holeFrame = null;

// Asks the client for something and waits for the answer (fetch to client/terminal.lua)
function ask(name, data = {}) {
    return fetch(`https://${GetParentResourceName()}/${name}`, { method: 'POST', body: JSON.stringify(data) })
        .then(res => res.json())
        .catch(() => false);
}

// Opens a camera's window, or brings it to the front if it is open
function openCamera(machine, ip) {
    const open = cameras.find(c => c.machine === machine);
    if (open) {
        open.win.classList.remove('minimized');
        open.win.style.zIndex = ++desk.z;
        return makeLive(open);
    }

    const body = el('div', 'camera');
    const feed = el('div', 'camera-feed');
    const still = el('img', 'camera-still');
    still.alt = '';
    const top = el('div', 'camera-overlay camera-top');
    top.append(el('span', 'camera-rec', '● REC'), el('span', '', `${machine.host}  ${ip}`));
    const bottom = el('div', 'camera-overlay camera-bottom');
    const state = el('span', 'camera-state');
    const time = el('span', 'camera-time');
    bottom.append(state, time);
    // The bars sit above and below the picture, outside the hole, so they always show
    const picture = el('div', 'camera-picture');
    picture.append(still, feed);
    body.append(top, picture, bottom);

    const win = createWindow(`${machine.host} - ${appName('cameras')}`, body, { width: 480, height: 300, app: 'cameras' });
    const cam = { machine, ip, win, feed, still, state, time, frozenAt: null };
    cameras.push(cam);

    win.addEventListener('mousedown', () => makeLive(cam));
    win.querySelector('.win-close').onclick = () => closeCamera(cam);
    win.querySelector('.win-min').addEventListener('click', () => { if (liveCamera === cam) stopLive(); });
    makeLive(cam);
}

// Makes a camera the live one: the one before freezes on its last picture
async function makeLive(cam) {
    if (liveCamera === cam) return;
    const previous = liveCamera;
    liveCamera = cam;
    if (previous) {
        const picture = await ask('cameraSnapshot');
        freeze(previous, picture);
    }
    if (liveCamera !== cam) return; // Another one was clicked while waiting
    cam.frozenAt = null;
    cam.win.classList.add('live');
    cam.win.classList.remove('frozen');
    cam.state.textContent = 'LIVE';
    watchHole(); // Sends the camera to the client, fitted to the window
}

// Shows the last picture of a camera that is no longer live
function freeze(cam, picture) {
    cam.win.classList.remove('live');
    cam.win.classList.add('frozen');
    cam.frozenAt = new Date();
    if (picture) cam.still.src = picture;
    cam.state.textContent = `FROZEN ${cam.frozenAt.toLocaleTimeString('en-GB')}`;
}

// No live camera: the game shows the player's own view again
function stopLive() {
    if (!liveCamera) return;
    freeze(liveCamera, null);
    liveCamera = null;
    ask('cameraOff');
    setHole(null);
}

function closeCamera(cam) {
    if (liveCamera === cam) stopLive();
    cameras.splice(cameras.indexOf(cam), 1);
    cam.win.remove();
}

// Every camera window closes with the desktop
function closeCameras() {
    for (const cam of [...cameras]) closeCamera(cam);
}

// ---------- The hole the live camera shows through ----------

const MAX_FOV = 130; // The widest the game can render

// The game renders the camera on the whole screen, but only the window's hole shows it.
// So the game camera is turned and widened until the camera's own view (its rotation
// and fov) fills exactly the hole, wherever the window is and however big it is.
function fitCamera(camera, rect) {
    const W = window.innerWidth, H = window.innerHeight;
    const rad = d => (d * Math.PI) / 180;
    const deg = r => (r * 180) / Math.PI;
    const fov = camera.fov || 60; // Vertical, like the game's
    const tanScreen = Math.min(Math.tan(rad(fov / 2)) * (H / rect.h), Math.tan(rad(MAX_FOV / 2)));
    // Where the window's center is on the screen, as an angle from the screen's center
    const dx = rect.x + rect.w / 2 - W / 2;
    const dy = rect.y + rect.h / 2 - H / 2;
    const yaw = deg(Math.atan((dx / (W / 2)) * tanScreen * (W / H)));
    const pitch = deg(Math.atan((-dy / (H / 2)) * tanScreen));
    const rot = camera.rotation || {};
    return {
        coords: camera.coords,
        rotation: { x: (rot.x || 0) - pitch, y: rot.y || 0, z: (rot.z || 0) + yaw },
        fov: deg(2 * Math.atan(tanScreen)),
        rect, // Only used by the browser test mode
    };
}

// Cuts a rectangle out of the window (box), so the game shows through it
function setHole(rect) {
    const style = box.style;
    if (!rect) {
        style.webkitMask = style.mask = '';
        return;
    }
    // Two layers: everything, and the hole. Where they overlap (xor / exclude), nothing is drawn.
    const full = 'linear-gradient(#000, #000) 0 0 / 100% 100% no-repeat';
    const hole = `linear-gradient(#000, #000) ${rect.x}px ${rect.y}px / ${rect.w}px ${rect.h}px no-repeat`;
    style.webkitMask = style.mask = `${full}, ${hole}`;
    style.webkitMaskComposite = 'xor'; // After the shorthand, which resets it
    style.maskComposite = 'exclude';
}

// Keeps the hole on the live window while it moves, until there is no live camera
function watchHole() {
    if (holeFrame) return;
    let last = '';
    const tick = () => {
        if (!liveCamera || !liveCamera.win.isConnected || liveCamera.win.classList.contains('minimized')) {
            holeFrame = null;
            setHole(null);
            last = '';
            return;
        }
        const feed = liveCamera.feed.getBoundingClientRect();
        const origin = box.getBoundingClientRect();
        const rect = { x: Math.round(feed.left - origin.left), y: Math.round(feed.top - origin.top), w: Math.round(feed.width), h: Math.round(feed.height) };
        const key = `${rect.x},${rect.y},${rect.w},${rect.h},${liveCamera.ip}`;
        if (key !== last && rect.w > 0 && rect.h > 0) {
            setHole(rect);
            last = key;
            // The camera, fitted to where the window is on the screen
            ask('cameraView', fitCamera(liveCamera.machine.camera, { x: Math.round(feed.left), y: Math.round(feed.top), w: rect.w, h: rect.h }));
        }
        holeFrame = requestAnimationFrame(tick);
    };
    holeFrame = requestAnimationFrame(tick);
}

// The clock on every camera
setInterval(() => {
    const now = new Date().toLocaleTimeString('en-GB');
    for (const cam of cameras) cam.time.textContent = now;
}, 1000);

// ---------- The app: the cameras opened so far ----------

function openCameraList() {
    const body = el('div', 'camera-list');
    const render = () => {
        body.replaceChildren(el('p', 'camera-hint', 'Open a camera from the terminal with: view <ip>'));
        for (const cam of cameras) {
            const row = el('button', 'camera-row');
            row.append(icon('fa-solid fa-video'), el('span', '', `${cam.machine.host}  ${cam.ip}`), el('span', 'camera-row-state', cam === liveCamera ? 'live' : 'frozen'));
            row.onclick = () => openCamera(cam.machine, cam.ip);
            body.append(row);
        }
    };
    createWindow(appName('cameras'), body, { width: 360, height: 260, app: 'cameras' });
    render();
    const timer = setInterval(() => (body.isConnected ? render() : clearInterval(timer)), 1000);
}
