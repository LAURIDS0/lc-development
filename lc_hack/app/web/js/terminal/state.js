// =====================================================================
//  Fake Linux terminal with networking (minigame)
//  Goal: get root on the target machine. Players may have to hop between
//  machines with ssh, find passwords in files and get past firewalls.
//  Everything is configured on the server, which also checks passwords.
// =====================================================================

// ---------- Elements from index.html ----------
const box = document.getElementById('box');       // The whole window (80% of the screen)
// The active terminal's elements (see instances.js; the main terminal starts active)
let term = document.getElementById('term');     // The CLI (output + input line)
let output = document.getElementById('output'); // All printed text goes here
let prompt = document.getElementById('prompt'); // "user@host:~$ " in front of the input
let input = document.getElementById('input');   // The input field

// ---------- State ----------
let machines = [];     // All machines: the player's own (first) + config.network
let target = null;     // The machine the player needs root on to win
let sessions = [];     // Login stack: ssh and su push a login, exit pops it
let session = null;    // The top login = where the player "is" right now
let history = [];      // Every command typed (for arrow keys and "history")
let historyIndex = 0;  // Position in history while pressing up/down
let serverCommands = []; // Commands from config.commands: they run on the server
let dns = {};          // name -> IP for the always-on servers (config.lua on the server)
let searchUrl = null;  // The search engine's results page (config.lua), e.g. 'eyefind.info/search.html'
let pending = null;    // When set, the terminal is waiting for a password: { label, onValue }

// Known ports and their service names (used by nmap)
const SERVICES = {
    21: 'ftp', 22: 'ssh', 23: 'telnet', 25: 'smtp', 53: 'domain', 80: 'http', 110: 'pop3',
    143: 'imap', 443: 'https', 445: 'microsoft-ds', 3306: 'mysql', 3389: 'ms-wbt-server',
    554: 'rtsp', 5432: 'postgresql', 5900: 'vnc', 6379: 'redis', 8080: 'http-proxy', 9100: 'jetdirect', 27017: 'mongodb',
};

// Paths only root can read by default. "~" is the machine user's home directory.
const DEFAULT_LOCKED = [
    '/root', '/etc/shadow', '/etc/gshadow', '/etc/sudoers', '/etc/sudoers.d', '/var/backups/shadow.bak', '~/.ssh/id_rsa',
    '/etc/ssh/ssh_host_ed25519_key', '/etc/mysql/debian.cnf', '/var/lib/mysql', '/var/spool/cron/crontabs', '/var/log/auth.log',
];
