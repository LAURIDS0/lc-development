// =====================================================================
//  Networking
//  Machines can only reach each other directly when they have an IP in
//  the same /24 (first three numbers match). To reach another network,
//  the player has to ssh into a machine that sits on both.
//  The always-on servers (config.lua) are the exception: like the
//  internet, every machine can reach them.
// =====================================================================

// "10.0.0.20" -> "10.0.0"
function subnet(ip) {
    return ip.split('.').slice(0, 3).join('.');
}

// Finds the machine with a given IP.
function findMachine(ip) {
    return machines.find(m => m.ips.includes(ip));
}

// Builds a fake but stable MAC address from an IP.
function mac(ip) {
    return '52:54:00:' + ip.split('.').slice(1).map(n => Number(n).toString(16).padStart(2, '0')).join(':');
}

// Random LAN ping time, e.g. "0.412"
function latency() {
    return (Math.random() * 0.8 + 0.2).toFixed(3);
}

// Turns a hostname into an IP: /etc/hosts on the current machine first, then DNS.
// An IP is returned as is. An unknown name returns null.
function lookup(name) {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return name;
    const hosts = session.machine.fs.etc && session.machine.fs.etc.hosts;
    for (const line of typeof hosts === 'string' ? hosts.split('\n') : []) {
        const [ip, ...names] = line.trim().split(/\s+/);
        if (!ip.startsWith('#') && names.includes(name)) return ip;
    }
    return has(dns, name.toLowerCase()) ? dns[name.toLowerCase()] : null;
}

// A file the web server on a machine serves, from /var/www/html.
// 'about.html', 'careers/' -> careers/index.html. The web server can read it, locked or not.
function pageFile(machine, path) {
    let node = machine.fs;
    for (const part of ['var', 'www', 'html', ...path.split('/').filter(Boolean)]) {
        if (!isDir(node) || !has(node, part)) return undefined;
        node = node[part];
    }
    if (isDir(node)) node = node['index.html'];
    return typeof node === 'string' ? node : undefined;
}

// Does the machine's firewall let the traffic through?
// port is a port number, or 'icmp' for ping.
function firewallAllows(machine, port, srcIp) {
    const fw = machine.firewall;
    if (!fw || !fw.enabled) return true;          // No firewall = everything is allowed
    if (fw.allow.includes(srcIp)) return true;    // This IP may do anything
    return port === 'icmp' ? fw.ping : fw.open.includes(port);
}

// Tries to reach an IP on a port from the current machine.
// Returns a status:
//   'noroute' = not on the same network        'nohost' = no machine on that IP
//   'blocked' = the firewall drops the traffic  'closed' = the machine doesn't run that service
//   'ok'      = it gets through
function reach(ip, port) {
    const me = session.machine;
    if (ip.startsWith('127.') || me.ips.includes(ip)) {
        // Itself: the firewall doesn't apply from the inside
        return { status: port === 'icmp' || me.ports.includes(port) ? 'ok' : 'closed', machine: me, src: ip };
    }

    const other = findMachine(ip);
    // Our IP on the same network. An always-on server is reachable from anywhere.
    const src = me.ips.find(a => subnet(a) === subnet(ip)) || (other && other.internet ? me.ips[0] : null);
    if (!src) return { status: 'noroute' };
    if (!other) return { status: 'nohost', src };
    me.arp.add(ip); // ARP sees the machine even when the firewall blocks, like in real life

    if (!firewallAllows(other, port, src)) return { status: 'blocked', machine: other, src };
    if (port !== 'icmp' && !other.ports.includes(port)) return { status: 'closed', machine: other, src };
    return { status: 'ok', machine: other, src };
}

// Error text when a connection fails (used by ssh, rdp and curl).
const CONNECT_ERRORS = {
    noroute: 'Network is unreachable',
    nohost: 'No route to host',
    blocked: 'Connection timed out',
    closed: 'Connection refused',
};

// Builds the nmap report for one IP. Returns null if the host seems to be down.
function scanHost(ip, skipPing, onlyPing) {
    const ping = reach(ip, 'icmp');
    if (ping.status === 'noroute' || ping.status === 'nohost') return null;
    const m = ping.machine;
    const open = m.ports.filter(p => reach(ip, p).status === 'ok');

    // nmap checks if a host is up with ping and a probe on port 80/443.
    // If neither answers, it looks down (unless -Pn is used).
    const up = ping.status === 'ok' || open.includes(80) || open.includes(443);
    if (!up && !skipPing) return null;

    const lines = ['', `Nmap scan report for ${m.host} (${ip})`, `Host is up (0.000${Math.floor(Math.random() * 900 + 100)}s latency).`];
    if (onlyPing) return lines;

    // Ports the machine runs but the firewall blocks are shown as "filtered".
    const shown = [...m.ports].sort((a, b) => a - b);
    const hidden = m.firewall && m.firewall.enabled && !open.length ? 'filtered' : 'closed';
    lines.push(`Not shown: ${1000 - shown.length} ${hidden} ports`);
    lines.push('PORT      STATE    SERVICE');
    for (const p of shown) {
        const state = open.includes(p) ? 'open' : 'filtered';
        lines.push(`${(p + '/tcp').padEnd(10)}${state.padEnd(9)}${SERVICES[p] || 'unknown'}`);
    }
    return lines;
}
