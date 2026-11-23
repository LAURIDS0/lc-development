// Commands: Network
Object.assign(commands, {
    // Prints the machine's network interfaces and IPs.
    ifconfig() {
        session.machine.ips.forEach((ip, i) => {
            print(`eth${i}: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500`);
            print(`        inet ${ip}  netmask 255.255.255.0  broadcast ${subnet(ip)}.255`);
            print(`        ether ${mac(ip)}  txqueuelen 1000  (Ethernet)`);
            print('');
        });
        print('lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536');
        print('        inet 127.0.0.1  netmask 255.0.0.0');
    },

    // "ip a" prints IPs, "ip r" prints which networks are reachable.
    ip(args) {
        const sub = args[0] || '';
        const ips = session.machine.ips;
        if (sub && 'addr'.startsWith(sub)) {
            print('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN');
            print('    inet 127.0.0.1/8 scope host lo');
            ips.forEach((ip, i) => {
                print(`${i + 2}: eth${i}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP`);
                print(`    link/ether ${mac(ip)} brd ff:ff:ff:ff:ff:ff`);
                print(`    inet ${ip}/24 brd ${subnet(ip)}.255 scope global eth${i}`);
            });
        } else if (sub && 'route'.startsWith(sub)) {
            ips.forEach((ip, i) => print(`${subnet(ip)}.0/24 dev eth${i} proto kernel scope link src ${ip}`));
        } else {
            print('Usage: ip [ addr | route ]');
        }
    },

    // Pings an IP or a name from /etc/hosts.  ping [-c count] <host>   (default 4)
    ping(args) {
        const cIndex = args.indexOf('-c');
        const count = Math.min(Math.max(Number(args[cIndex + 1]) || 4, 1), 10); // 1-10, so it never runs forever
        const host = args.filter((a, i) => !a.startsWith('-') && !(cIndex >= 0 && i === cIndex + 1)).pop();
        if (!host) return print('ping: usage error: Destination address required');
        const ip = lookup(host);
        if (!ip) return print(`ping: ${host}: Name or service not known`);

        const r = reach(ip, 'icmp');
        if (r.status === 'noroute') return print('ping: connect: Network is unreachable');

        const lines = [`PING ${host} (${ip}) 56(84) bytes of data.`];
        for (let i = 1; i <= count; i++) {
            if (r.status === 'ok') lines.push(`64 bytes from ${ip}: icmp_seq=${i} ttl=64 time=${latency()} ms`);
            else if (r.status === 'nohost') lines.push(`From ${r.src} icmp_seq=${i} Destination Host Unreachable`);
            else lines.push(null); // Firewall: no reply, just waiting
        }
        const received = r.status === 'ok' ? count : 0;
        const errors = r.status === 'nohost' ? `+${count} errors, ` : '';
        lines.push('', `--- ${host} ping statistics ---`,
            `${count} packets transmitted, ${received} received, ${errors}${received ? 0 : 100}% packet loss, time ${(count - 1) * 1001}ms`);
        printSlow(lines, 500);
    },

    // Scans a host or a whole network for open ports.
    //   nmap 10.0.0.5        one host
    //   nmap 10.0.0.0/24     the whole network
    //   -Pn                  scan even if the host doesn't answer ping
    //   -sn                  only find hosts, don't scan ports
    nmap(args) {
        const arg = args.find(a => !a.startsWith('-'));
        if (!arg) return print('Usage: nmap [-Pn] [-sn] <host | ip | net/24>');
        const skipPing = args.includes('-Pn');
        const onlyPing = args.includes('-sn');
        const isNet = arg.endsWith('/24');

        let ips;
        if (isNet) {
            const net = subnet(arg.replace('/24', ''));
            ips = machines.flatMap(m => m.ips).filter(ip => subnet(ip) === net);
        } else {
            const ip = lookup(arg);
            if (!ip) return print(`Failed to resolve "${arg}".`);
            ips = [ip];
        }

        const lines = ['Starting Nmap 7.80 ( https://nmap.org )', null, null]; // null = "scanning..."
        let up = 0;
        for (const ip of ips) {
            const report = scanHost(ip, skipPing, onlyPing);
            if (report) { up++; lines.push(...report); }
        }
        if (!isNet && !up && !skipPing) lines.push('Note: Host seems down. If it is really up, but blocking our ping probes, try -Pn');
        const count = isNet ? '256 IP addresses' : '1 IP address';
        lines.push(`Nmap done: ${count} (${up} host${up === 1 ? '' : 's'} up) scanned in ${(1 + Math.random() * 2).toFixed(2)} seconds`);
        printSlow(lines, 300);
    },

    // Prints the machines this machine has talked to on the network.
    arp() {
        const me = session.machine;
        for (const ip of me.arp) {
            const eth = me.ips.findIndex(a => subnet(a) === subnet(ip));
            print(`? (${ip}) at ${mac(ip)} [ether] on eth${eth}`);
        }
    },

    // Prints the ports this machine listens on.
    netstat() {
        print('Active Internet connections (only servers)');
        print('Proto Recv-Q Send-Q Local Address           Foreign Address         State');
        for (const p of session.machine.ports) {
            print(`tcp        0      0 ${('0.0.0.0:' + p).padEnd(24)}0.0.0.0:*               LISTEN`);
        }
    },

    // Fetches a web page.  curl 10.0.0.30   /   curl http://northbank.com/about.html
    // Prints the file from the machine's /var/www/html (index.html by default)
    curl(args) {
        const arg = args.find(a => !a.startsWith('-'));
        if (!arg) return print("curl: try 'curl --help' for more information");
        const [, host, port, path] = arg.replace(/^https?:\/\//, '').match(/^([^:/]+)(?::(\d+))?(\/\S*)?/) || [];
        if (!host) return print('curl: (3) URL using bad/illegal format');
        const portNum = Number(port || (arg.startsWith('https') ? 443 : 80));

        const ip = lookup(host);
        if (!ip) return print(`curl: (6) Could not resolve host: ${host}`);

        const r = reach(ip, portNum);
        if (r.status !== 'ok') {
            const msg = `curl: (7) Failed to connect to ${host} port ${portNum}: ${CONNECT_ERRORS[r.status]}`;
            return printSlow([null, msg], r.status === 'blocked' ? 1500 : 200); // Firewall = long wait
        }
        const page = pageFile(r.machine, path || '/');
        printSlow([null, page ?? '<html><body><h1>404 Not Found</h1></body></html>'], 300);
    },

    // Logs in to another machine.  ssh user@ip   /   ssh ip (uses the same username)
    ssh(args) {
        const arg = args.find(a => !a.startsWith('-'));
        if (!arg) return print('usage: ssh [user@]hostname');
        const [user, host] = arg.includes('@') ? arg.split('@') : [session.user, arg];

        const ip = lookup(host);
        if (!ip) return print(`ssh: Could not resolve hostname ${host}: Name or service not known`);

        const r = reach(ip, 22);
        if (r.status !== 'ok') {
            const msg = `ssh: connect to host ${host} port 22: ${CONNECT_ERRORS[r.status]}`;
            return printSlow([null, msg], r.status === 'blocked' ? 1500 : 200);
        }

        const m = r.machine;
        // Wrong username (or root): Linux still asks for a password, but the server says no.
        const needPrompt = m.hasPassword || user !== m.user;
        askPassword(`${user}@${host}'s password: `, needPrompt, value => verify(m, 'login', user, value, () => {
            print(bannerOf(m));
            print('');
            print(`Last login: ${new Date().toDateString()} from ${r.src}`);
            login(m, user);
        }, 'Permission denied, please try again.'));
    },

    // Firewall (root only).  ufw status | enable | disable | allow <port> | allow from <ip>
    ufw(args) {
        if (!session.root) return print('ERROR: You need to be root to run this script');
        const m = session.machine;
        const fw = m.firewall || (m.firewall = { enabled: false, allow: [], open: [], ping: false });

        if (args[0] === 'status') {
            if (!fw.enabled) return print('Status: inactive');
            print('Status: active');
            print('');
            print('To                         Action      From');
            print('--                         ------      ----');
            for (const p of fw.open) print(`${String(p).padEnd(27)}ALLOW       Anywhere`);
            for (const ip of fw.allow) print(`${'Anywhere'.padEnd(27)}ALLOW       ${ip}`);
        } else if (args[0] === 'disable') {
            fw.enabled = false;
            print('Firewall stopped and disabled on system startup');
        } else if (args[0] === 'enable') {
            fw.enabled = true;
            print('Firewall is active and enabled on system startup');
        } else if (args[0] === 'allow' && args[1] === 'from' && args[2]) {
            fw.allow.push(args[2]);
            print('Rule added');
        } else if (args[0] === 'allow' && Number(args[1])) {
            fw.open.push(Number(args[1]));
            print('Rule added');
        } else {
            print('Usage: ufw status | enable | disable | allow <port> | allow from <ip>');
        }
    },
});
