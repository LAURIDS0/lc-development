// =====================================================================
//  Machines and logins
// =====================================================================

// Remote desktop (rdp) connects over VNC
const VNC_PORT = 5900;

// Cameras stream video over RTSP
const CAMERA_PORT = 554;

// Running processes on a machine, for "ps aux" and the System Monitor app.
// own = the logged in user's own processes, e.g. ['-bash', 'ps aux']
function processList(m, user, own) {
    const list = [
        ['root', '/sbin/init splash'],
        ['root', '/lib/systemd/systemd-journald'],
        ['root', '/usr/sbin/cron -f'],
        ['syslog', '/usr/sbin/rsyslogd -n -iNONE'],
        ['root', 'sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups'],
        ...(m.desktop ? [['root', THEMES[m.desktop].process]] : []),
        ...m.processes.map(p => ['root', p]),          // From config
        ...own.map(p => [user, p]),
    ];
    return list.map(([u, cmd], i) => ({
        user: u, cmd,
        pid: i < 5 ? [1, 312, 655, 702, 811][i] : 1200 + i * 37,
        cpu: `0.${i % 7}`, mem: `0.${(i * 3) % 9}`,
    }));
}

// Builds a machine from config (the player's own, or one from config.network).
function buildMachine(cfg) {
    // Desktop: one of THEMES (js/desktop/themes.js), a random one for 'random', or null (CLI only)
    const desktops = Object.keys(THEMES);
    const desktop = cfg.desktop === 'random'
        ? desktops[Math.floor(Math.random() * desktops.length)]
        : desktops.includes(cfg.desktop) ? cfg.desktop : null;

    // Without ports in config: ssh, plus remote desktop if the machine has one
    // A camera streams video (RTSP, 554) and has a web page (80)
    const defaultPorts = cfg.camera ? [80, CAMERA_PORT] : desktop ? [22, VNC_PORT] : [22];

    const m = {
        desktop,
        processes: toList(cfg.processes),                     // Extra processes for "ps aux"
        camera: cfg.camera || null,                           // { coords, rotation, fov }: a camera in the world (view)
        ips: toList(cfg.ip),                                  // A machine can have several IPs (several networks)
        host: cfg.host || 'pc',
        user: cfg.user || 'user',
        internet: !!cfg.internet,                             // An always-on server: reachable from every network
        index: cfg.index,                                     // The server's number for this machine
        hasPassword: !!cfg.hasPassword,                       // Does ssh/rdp login need a password?
        hasRootPassword: !!cfg.hasRootPassword,               // Does su/sudo need a password?
        ports: toList(cfg.ports ?? defaultPorts).map(Number), // Open services, e.g. 22 (ssh), 80 (web)
        firewall: cfg.firewall ? {
            enabled: true,
            allow: toList(cfg.firewall.allow),                // IPs that may do anything
            open: toList(cfg.firewall.open).map(Number),      // Ports anyone may use
            ping: cfg.firewall.ping === true,                 // Does it answer ping from anyone?
        } : null,
        fs: {},
        locked: new Set(),                                    // Paths only root can read
        arp: new Set(),                                       // IPs this machine has "seen" on the network
    };

    // Build the filesystem: default files first, then the machine's own files on top.
    const base = { cwd: [], home: ['home', m.user] };
    const files = { ...defaultFiles(m), ...cfg.files };
    for (const path in files) addPath(m.fs, resolve(path, base), path.endsWith('/'), files[path]);
    for (const path of [...DEFAULT_LOCKED, ...toList(cfg.locked)]) m.locked.add('/' + resolve(path, base).join('/'));

    // Always-on servers: what players changed on them (saved on the game server). Deletions first.
    for (const path of Object.keys(cfg.deleted || {})) removePath(m.fs, resolve(path, base));
    for (const [path, content] of Object.entries(cfg.written || {})) addPath(m.fs, resolve(path, base), content === false, content);

    return m;
}

// Runs fn as another login than the top one (e.g. the desktop's), then restores it.
// Used by the file manager, so it keeps showing the desktop's machine after ssh-ing elsewhere.
function withSession(s, fn) {
    const old = session;
    session = s;
    try { return fn(); } finally { session = old; }
}

// Logs in to a machine and pushes the login onto the stack.
function login(machine, user, root = false, cwd = null) {
    const home = root ? ['root'] : ['home', user];
    session = { machine, user: root ? 'root' : user, root, home, cwd: cwd || [...home] };
    sessions.push(session);
}

// Becomes root on the current machine (the server has accepted the password).
function becomeRoot() {
    login(session.machine, 'root', true, [...session.cwd]);
}

