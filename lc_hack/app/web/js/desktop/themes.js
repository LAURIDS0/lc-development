// =====================================================================
//  Desktops (Ubuntu, Kali, macOS, ChromeOS, Linux Mint, Fedora)
//  Same apps on all of them; the names, icons and look change.
//  App names and icons per desktop are in each app (apps/*.js).
//  Files come from the same filesystem as the CLI (js/terminal).
//  The look of each desktop, its apps and its terminal is in
//  css/desktop/themes. All icons are Font Awesome.
// =====================================================================

// Per desktop (add one here and a css/desktop/themes/<name>.css to add a desktop):
//   process       = the desktop's process in "ps aux"
//   menuIcon/menu = the start menu / launcher in the panel
//   menus         = extra menu names in the panel (macOS menu bar)
//   root          = name of "/" in the Files sidebar
//   longClock     = show the date next to the time
//   dockTrash     = Trash in the dock instead of on the desktop
//   tray          = wifi / volume / battery icons next to the clock
const THEMES = {
    ubuntu: {
        process: '/usr/bin/gnome-shell',
        menuIcon: 'fa-brands fa-ubuntu', menu: 'Activities',
        home: 'Home', trash: 'Trash', root: 'Computer', logout: 'Log Out', tray: true,
    },
    kali: {
        process: 'xfce4-session',
        menuIcon: 'fa-solid fa-dragon', menu: 'Applications',
        home: 'Home', trash: 'Trash', root: 'File System', logout: 'Log Out',
    },
    macos: {
        process: '/System/Library/CoreServices/Finder.app/Contents/MacOS/Finder',
        menuIcon: 'fa-brands fa-apple', menu: 'Finder', menus: ['File', 'Edit', 'View', 'Go', 'Window', 'Help'],
        home: 'Macintosh HD', homeIcon: 'fa-solid fa-hard-drive', trash: 'Trash', root: 'Macintosh HD', logout: 'Log Out',
        longClock: true, dockTrash: true, tray: true,
    },
    chromeos: {
        process: '/opt/google/chrome/chrome --type=ash',
        menuIcon: 'fa-regular fa-circle', menu: '',
        home: 'My files', trash: 'Trash', root: 'Linux files', logout: 'Sign out', tray: true,
    },
    mint: {
        process: 'cinnamon --replace',
        menuIcon: 'fa-solid fa-leaf', menu: '',
        home: 'Home', homeIcon: 'fa-solid fa-house-chimney', trash: 'Trash', root: 'File System', logout: 'Log Out', tray: true,
    },
    fedora: {
        process: '/usr/bin/gnome-shell',
        menuIcon: 'fa-brands fa-fedora', menu: 'Activities',
        home: 'Home', trash: 'Trash', root: 'Computer', logout: 'Log Out', tray: true,
    },
};

// Font Awesome icons used on every desktop
const ICONS = {
    terminal: 'fa-solid fa-terminal',
    home: 'fa-solid fa-house',
    trash: 'fa-solid fa-trash-can',
    power: 'fa-solid fa-power-off',
    close: 'fa-solid fa-xmark',
    minimize: 'fa-solid fa-minus',
    maximize: 'fa-regular fa-square',
    up: 'fa-solid fa-arrow-up',
    back: 'fa-solid fa-arrow-left',
    forward: 'fa-solid fa-arrow-right',
    reload: 'fa-solid fa-rotate-right',
    folder: 'fa-solid fa-folder',
    desktop: 'fa-solid fa-desktop',
    documents: 'fa-solid fa-file-lines',
    downloads: 'fa-solid fa-download',
    pictures: 'fa-solid fa-images',
    drive: 'fa-solid fa-hard-drive',
    lock: 'fa-solid fa-lock',
    file: 'fa-solid fa-file-lines',
    image: 'fa-solid fa-file-image',
    script: 'fa-solid fa-file-code',
    binary: 'fa-solid fa-gear',
    warning: 'fa-solid fa-triangle-exclamation',
    save: 'fa-solid fa-floppy-disk',
    wifi: 'fa-solid fa-wifi',
    volume: 'fa-solid fa-volume-high',
    battery: 'fa-solid fa-battery-three-quarters',
};

// ---------- Apps ----------
// Every app registers itself (apps/*.js); the dock shows them in that order.
//   open  = starts the app
//   name  / names  = its name, and the name per desktop where it differs
//   icon  / icons  = its icon, and the icon per desktop where it differs
const APPS = {};

function registerApp(id, app) {
    APPS[id] = app;
}

// Name of an app on the open desktop
function appName(id) {
    const app = APPS[id];
    return (app.names && app.names[desk.theme]) || app.name;
}

// Icon of an app on the open desktop
function appIcon(id) {
    const app = APPS[id];
    return (app.icons && app.icons[desk.theme]) || app.icon;
}
