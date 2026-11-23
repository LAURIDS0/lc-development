// Commands: Cameras
Object.assign(commands, {
    // Opens a camera's live view in a window.  view [user@]<ip | name>
    // Needs a desktop, a route to the camera (port 554) and the camera's password.
    view(args) {
        const arg = args.find(a => !a.startsWith('-'));
        if (!arg) return print('usage: view [user@]<camera ip>');
        if (!desk) return print('view: cannot open display. Start a desktop first (startx).');
        const [user, host] = arg.includes('@') ? arg.split('@') : [null, arg];

        const ip = lookup(host);
        if (!ip) return print(`view: could not resolve ${host}`);
        const r = reach(ip, CAMERA_PORT);
        if (r.status !== 'ok') {
            const msg = `view: rtsp://${host}:${CAMERA_PORT}: ${CONNECT_ERRORS[r.status]}`;
            return printSlow([null, msg], r.status === 'blocked' ? 1500 : 200);
        }
        const m = r.machine;
        if (!m.camera) return print(`view: rtsp://${host}:${CAMERA_PORT}: no video stream`);

        const login = user || m.user;
        const needPrompt = m.hasPassword || login !== m.user;
        askPassword(`${login}@${host} password: `, needPrompt, value => verify(m, 'login', login, value, () => {
            print(`Opening rtsp://${ip}:${CAMERA_PORT}/stream1`);
            openCamera(m, ip);
        }, 'view: 401 Unauthorized'));
    },
});
