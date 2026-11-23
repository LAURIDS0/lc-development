// =====================================================================
//  Default files
//  Every machine gets a full, normal-looking filesystem, built with its
//  own user, host, IPs and OS. Lots of files to look through, some with
//  fake passwords to mislead the player. A path ending with "/" is an
//  empty directory. The HackConfig's own files are added on top.
//  Small things (documents, logs) vary a little from machine to machine.
// =====================================================================

const BIN = '\x7fELF\x02\x01\x01\x00\x00\x00 >\x00\x01 @\x00 (binary file)'; // Looks like a program

// A number from a text that is the same every time, to vary files per machine
function stableHash(text) {
    let h = 0;
    for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h;
}

function defaultFiles(m) {
    const { user, host, ips } = m;
    const os = osOf(m);
    const h = stableHash(host);
    const pick = (list, salt = 0) => list[(h + salt) % list.length];
    const ip = ips[0] || '127.0.0.1';
    const gateway = ip.split('.').slice(0, 3).join('.') + '.1';
    const debian = os.family === 'debian';
    const kernel = os.kernel;

    const files = {
        // ================= /boot, /dev, /sys, /proc =================
        [`/boot/vmlinuz-${kernel}`]: BIN,
        [`/boot/initrd.img-${kernel}`]: BIN,
        [`/boot/config-${kernel}`]: 'CONFIG_64BIT=y\nCONFIG_X86_64=y\nCONFIG_SMP=y\nCONFIG_MODULES=y',
        [`/boot/System.map-${kernel}`]: BIN,
        '/boot/grub/grub.cfg': `set default="0"\nset timeout=5\nmenuentry "${os.pretty}" {\n  linux /boot/vmlinuz-${kernel} root=/dev/sda1 ro quiet splash\n  initrd /boot/initrd.img-${kernel}\n}`,
        '/dev/null': '', '/dev/zero': '', '/dev/random': BIN, '/dev/urandom': BIN, '/dev/tty': '', '/dev/sda': BIN, '/dev/sda1': BIN, '/dev/sda2': BIN,
        '/dev/shm/': null,
        '/sys/class/net/eth0/address': typeof mac === 'function' ? mac(ip) : '52:54:00:12:34:56',
        '/sys/class/net/eth0/operstate': 'up',
        '/sys/class/net/lo/operstate': 'unknown',
        '/sys/kernel/hostname': host,
        '/proc/version': `Linux version ${kernel} (buildd@lcy02-amd64-045) (gcc 12.3.0) ${os.build}`,
        '/proc/cpuinfo': [0, 1, 2, 3].map(n => `processor\t: ${n}\nvendor_id\t: GenuineIntel\nmodel name\t: Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz\ncpu MHz\t\t: 2394.454\ncache size\t: 35840 KB\ncores\t\t: 4`).join('\n\n'),
        '/proc/meminfo': 'MemTotal:        8148344 kB\nMemFree:          912504 kB\nMemAvailable:    5120440 kB\nBuffers:          201644 kB\nCached:          3810220 kB\nSwapTotal:       2097148 kB\nSwapFree:        2097148 kB',
        '/proc/uptime': '1209384.21 4630118.40',
        '/proc/loadavg': '0.08 0.12 0.10 1/312 4821',
        '/proc/cmdline': `BOOT_IMAGE=/boot/vmlinuz-${kernel} root=/dev/sda1 ro quiet splash`,
        '/proc/mounts': '/dev/sda1 / ext4 rw,relatime 0 0\nproc /proc proc rw,nosuid,nodev,noexec 0 0\ntmpfs /run tmpfs rw,nosuid,nodev 0 0',
        '/proc/net/route': `Iface\tDestination\tGateway\tFlags\neth0\t00000000\t${gateway}\t0003`,

        // ================= /etc: system configuration =================
        '/etc/hostname': host,
        '/etc/hosts': `127.0.0.1\tlocalhost\n127.0.1.1\t${host}\n\n# The following lines are desirable for IPv6 capable hosts\n::1     ip6-localhost ip6-loopback\nff02::1 ip6-allnodes`,
        '/etc/hosts.allow': '# /etc/hosts.allow: list of hosts that are allowed to access the system.\nsshd: 10.0.0.0/8',
        '/etc/hosts.deny': '# /etc/hosts.deny: list of hosts that are _not_ allowed to access the system.\nsshd: 185.23.11.4',
        '/etc/passwd': [
            'root:x:0:0:root:/root:/bin/bash',
            'daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin',
            'bin:x:2:2:bin:/bin:/usr/sbin/nologin',
            'sys:x:3:3:sys:/dev:/usr/sbin/nologin',
            'sync:x:4:65534:sync:/bin:/bin/sync',
            'games:x:5:60:games:/usr/games:/usr/sbin/nologin',
            'man:x:6:12:man:/var/cache/man:/usr/sbin/nologin',
            'mail:x:8:8:mail:/var/mail:/usr/sbin/nologin',
            'www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',
            'backup:x:34:34:backup:/var/backups:/usr/sbin/nologin',
            'nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin',
            'systemd-network:x:100:102:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin',
            'sshd:x:110:65534::/run/sshd:/usr/sbin/nologin',
            'mysql:x:111:116:MySQL Server,,,:/nonexistent:/bin/false',
            'redis:x:112:117::/var/lib/redis:/usr/sbin/nologin',
            `${user}:x:1000:1000:${user},,,:/home/${user}:/bin/bash`,
        ].join('\n'),
        '/etc/group': `root:x:0:\nadm:x:4:syslog,${user}\nsudo:x:27:${user}\nwww-data:x:33:\nbackup:x:34:\ndocker:x:998:${user}\n${user}:x:1000:`,
        '/etc/shadow': `root:$6$Vx8rT2qL$3kQ0b9Zp1mW7yHc2NfE5sJ4uRgT8vXa0LdKoP6iB1nM:19682:0:99999:7:::\ndaemon:*:19682:0:99999:7:::\nwww-data:*:19682:0:99999:7:::\n${user}:$6$aP3nZ7wQ$9fLm2XcV8bN1kJ4hG6dS0qWeR5tY7uIoP3aZxCvBnM:19682:0:99999:7:::`,
        '/etc/gshadow': `root:*::\nsudo:*::${user}\n${user}:!::`,
        '/etc/sudoers': 'Defaults env_reset\nDefaults secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"\nroot  ALL=(ALL:ALL) ALL\n%sudo ALL=(ALL:ALL) ALL\n@includedir /etc/sudoers.d',
        '/etc/sudoers.d/README': '# Files in this directory are read by sudo.\n# Use "visudo -f" to edit them.',
        '/etc/os-release': `NAME="${os.name}"\nVERSION="${os.version}"\nID=${os.id}\nPRETTY_NAME="${os.pretty}"\nVERSION_CODENAME=${os.codename}\nHOME_URL="https://www.${os.id === 'linuxmint' ? 'linuxmint' : os.id}.com/"`,
        '/etc/issue': `${os.pretty} \\n \\l`,
        '/etc/motd': pick([
            'Authorized access only. All activity is logged.',
            `Welcome to ${host}.\nMaintenance window: Sundays 02:00-04:00.`,
            'This system is managed by IT. Report problems to it@company.local',
        ]),
        '/etc/timezone': pick(['Europe/Copenhagen', 'America/Los_Angeles', 'UTC', 'Europe/London']),
        '/etc/locale.gen': 'en_US.UTF-8 UTF-8\nda_DK.UTF-8 UTF-8',
        '/etc/environment': 'PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"',
        '/etc/profile': '# /etc/profile: system-wide .profile file for the Bourne shell\nif [ -d /etc/profile.d ]; then\n  for i in /etc/profile.d/*.sh; do . $i; done\nfi',
        '/etc/profile.d/proxy.sh': '# export http_proxy=http://proxy.company.local:3128',
        '/etc/bash.bashrc': '# System-wide .bashrc file for interactive bash(1) shells.\n[ -z "$PS1" ] && return\nshopt -s checkwinsize',
        '/etc/shells': '/bin/sh\n/bin/bash\n/usr/bin/bash\n/bin/dash\n/usr/bin/zsh',
        '/etc/login.defs': 'MAIL_DIR        /var/mail\nPASS_MAX_DAYS   99999\nPASS_MIN_DAYS   0\nUID_MIN         1000\nENCRYPT_METHOD  SHA512',
        '/etc/fstab': 'UUID=3f1c2e7a-91b4-4d2e-a1f0-7c9d8e2b1a44 /         ext4 errors=remount-ro 0 1\nUUID=9C2E-1A4F                            /boot/efi vfat umask=0077      0 1\n/swapfile                                 none      swap sw              0 0\n//fileserver/share /mnt/share cifs credentials=/root/.smbcredentials 0 0',
        '/etc/resolv.conf': `nameserver 127.0.0.53\nnameserver ${gateway}\noptions edns0 trust-ad\nsearch company.local`,
        '/etc/nsswitch.conf': 'passwd:         files systemd\ngroup:          files systemd\nhosts:          files dns\nnetworks:       files',
        '/etc/crontab': 'SHELL=/bin/sh\nPATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin\n# m h dom mon dow user command\n17 *  * * *  root  cd / && run-parts --report /etc/cron.hourly\n25 6  * * *  root  test -x /usr/sbin/anacron || run-parts --report /etc/cron.daily\n0 3  * * *  root  /opt/backup.sh',
        '/etc/cron.d/e2scrub_all': '30 3 * * 0 root test -e /run/systemd/system || /usr/lib/x86_64-linux-gnu/e2fsprogs/e2scrub_all_cron',
        '/etc/cron.daily/logrotate': '#!/bin/sh\n/usr/sbin/logrotate /etc/logrotate.conf',
        '/etc/cron.daily/apt-compat': '#!/bin/sh\nexec /usr/lib/apt/apt.systemd.daily',
        '/etc/cron.hourly/': null,
        '/etc/logrotate.conf': 'weekly\nsu root adm\nrotate 4\ncreate\ninclude /etc/logrotate.d',
        '/etc/logrotate.d/nginx': '/var/log/nginx/*.log {\n  daily\n  missingok\n  rotate 14\n  compress\n}',
        '/etc/ssh/ssh_config': 'Host *\n    SendEnv LANG LC_*\n    HashKnownHosts yes',
        '/etc/ssh/sshd_config': 'Port 22\nPermitRootLogin no\nPasswordAuthentication yes\nPubkeyAuthentication yes\nX11Forwarding yes\nAllowUsers ' + user,
        '/etc/ssh/ssh_host_ed25519_key': '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\n-----END OPENSSH PRIVATE KEY-----',
        '/etc/ssh/ssh_host_ed25519_key.pub': `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHk2pQ8w root@${host}`,
        '/etc/ufw/ufw.conf': 'ENABLED=yes\nLOGLEVEL=low',
        '/etc/ufw/user.rules': '*filter\n:ufw-user-input - [0:0]\n-A ufw-user-input -p tcp --dport 22 -j ACCEPT\nCOMMIT',
        '/etc/iptables/rules.v4': '*filter\n:INPUT DROP [0:0]\n:FORWARD DROP [0:0]\n:OUTPUT ACCEPT [0:0]\n-A INPUT -i lo -j ACCEPT\n-A INPUT -p tcp --dport 22 -j ACCEPT\nCOMMIT',
        // Network setup, shows the machine's real IP addresses
        '/etc/netplan/01-netcfg.yaml': 'network:\n  version: 2\n  ethernets:\n' +
            ips.map((a, i) => `    eth${i}:\n      addresses: [${a}/24]${i === 0 ? `\n      routes:\n        - to: default\n          via: ${gateway}` : ''}`).join('\n'),
        '/etc/network/interfaces': 'auto lo\niface lo inet loopback',
        '/etc/sysctl.conf': '#net.ipv4.ip_forward=1\nnet.ipv4.conf.all.rp_filter=1\nkernel.printk = 3 4 1 3',
        '/etc/security/limits.conf': '# <domain> <type> <item> <value>\n*  soft  nofile  65535\n*  hard  nofile  65535',
        '/etc/skel/.bashrc': '# ~/.bashrc: executed by bash(1) for non-login shells.\nHISTSIZE=1000',
        '/etc/skel/.profile': '# ~/.profile: executed by the command interpreter for login shells.',
        '/etc/mysql/my.cnf': '[mysqld]\nbind-address = 127.0.0.1\nmax_connections = 200\n# the password is NOT stored here anymore',
        '/etc/mysql/debian.cnf': '[client]\nhost     = localhost\nuser     = debian-sys-maint\npassword = sYs8mAint2024\nsocket   = /var/run/mysqld/mysqld.sock',
        '/etc/nginx/nginx.conf': 'user www-data;\nworker_processes auto;\nevents { worker_connections 768; }\nhttp {\n  include /etc/nginx/sites-enabled/*;\n}',
        '/etc/nginx/sites-available/default': 'server {\n  listen 80 default_server;\n  root /var/www/html;\n  index index.html index.php;\n  location /admin {\n    auth_basic "Restricted";\n    auth_basic_user_file /etc/nginx/.htpasswd;\n  }\n}',
        '/etc/nginx/.htpasswd': 'admin:$apr1$Kx81dQ2a$3nY0bPj7Wq0cE5u1HzM9b/',
        '/etc/redis/redis.conf': 'bind 127.0.0.1 ::1\nport 6379\nrequirepass R3d1s_cache!\nmaxmemory 256mb',
        '/etc/php/8.1/fpm/php.ini': '[PHP]\nmemory_limit = 256M\nupload_max_filesize = 20M\ndisplay_errors = Off',
        '/etc/docker/daemon.json': '{\n  "log-driver": "json-file",\n  "log-opts": { "max-size": "10m" }\n}',
        '/etc/systemd/system/webapp.service': `[Unit]\nDescription=Company web app\nAfter=network.target\n\n[Service]\nUser=www-data\nWorkingDirectory=/opt/webapp\nEnvironment=APP_ENV=production\nEnvironment=API_TOKEN=tok_live_7d1f0c2e9a\nExecStart=/usr/bin/python3 /opt/webapp/app.py\nRestart=always\n\n[Install]\nWantedBy=multi-user.target`,
        '/etc/systemd/system/backup.timer': '[Timer]\nOnCalendar=*-*-* 03:00:00\nPersistent=true\n\n[Install]\nWantedBy=timers.target',
        '/etc/systemd/journald.conf': '[Journal]\nStorage=persistent\nSystemMaxUse=500M',

        // ================= /var: logs, web, data =================
        '/var/log/syslog': [
            `Nov 22 06:25:01 ${host} CRON[1003]: (root) CMD (test -x /usr/sbin/anacron || run-parts --report /etc/cron.daily)`,
            `Nov 22 08:01:12 ${host} systemd[1]: Started Daily apt download activities.`,
            `Nov 22 08:14:55 ${host} CRON[1123]: (root) CMD (/opt/backup.sh)`,
            `Nov 22 08:15:02 ${host} backup.sh[1124]: tar: Removing leading '/' from member names`,
            `Nov 22 09:30:02 ${host} kernel: [UFW BLOCK] IN=eth0 OUT= SRC=185.23.11.4 DST=${ip} PROTO=TCP DPT=23`,
            `Nov 22 10:02:44 ${host} systemd[1]: webapp.service: Main process exited, code=exited, status=1/FAILURE`,
            `Nov 22 10:02:49 ${host} systemd[1]: webapp.service: Scheduled restart job, restart counter is at 1.`,
        ].join('\n'),
        '/var/log/auth.log': [
            `Nov 22 07:58:01 ${host} sshd[901]: Failed password for root from 185.23.11.4 port 51022 ssh2`,
            `Nov 22 07:58:04 ${host} sshd[901]: Failed password for root from 185.23.11.4 port 51022 ssh2`,
            `Nov 22 07:58:09 ${host} sshd[901]: Failed password for invalid user admin from 185.23.11.4 port 51030 ssh2`,
            `Nov 22 08:02:40 ${host} sudo: ${user} : TTY=pts/0 ; PWD=/home/${user} ; USER=root ; COMMAND=/usr/bin/apt update`,
            `Nov 22 08:10:13 ${host} sshd[1040]: Accepted password for ${user} from ${gateway} port 50122 ssh2`,
            `Nov 22 08:10:13 ${host} sshd[1040]: pam_unix(sshd:session): session opened for user ${user}(uid=1000)`,
        ].join('\n'),
        '/var/log/kern.log': `Nov 22 07:00:01 ${host} kernel: [    0.000000] Linux version ${kernel}\nNov 22 07:00:01 ${host} kernel: [    1.204411] e1000: eth0 NIC Link is Up 1000 Mbps Full Duplex`,
        '/var/log/dmesg': `[    0.000000] Linux version ${kernel}\n[    0.412003] ACPI: Core revision 20210730\n[    1.204411] e1000: eth0 NIC Link is Up\n[    2.881020] EXT4-fs (sda1): mounted filesystem with ordered data mode`,
        '/var/log/boot.log': '[  OK  ] Started Journal Service.\n[  OK  ] Reached target Network.\n[  OK  ] Started OpenBSD Secure Shell server.\n[FAILED] Failed to start Company web app.',
        '/var/log/ufw.log': `Nov 22 09:30:02 ${host} kernel: [UFW BLOCK] IN=eth0 SRC=185.23.11.4 DPT=23\nNov 22 09:30:07 ${host} kernel: [UFW BLOCK] IN=eth0 SRC=185.23.11.4 DPT=3389`,
        '/var/log/lastlog': BIN,
        '/var/log/wtmp': BIN,
        '/var/log/faillog': BIN,
        '/var/log/apt/history.log': `Start-Date: 2026-11-20  10:11:58\nCommandline: apt install mysql-server nginx redis-server\nRequested-By: ${user} (1000)\nInstall: mysql-server:amd64 (8.0.35), nginx:amd64 (1.18.0), redis-server:amd64 (6.0.16)\nEnd-Date: 2026-11-20  10:13:44`,
        '/var/log/apt/term.log': 'Log started: 2026-11-20  10:11:58\nSetting up mysql-server (8.0.35) ...\nSetting up nginx (1.18.0) ...',
        '/var/log/dpkg.log': '2026-11-20 10:12:01 install mysql-server:amd64 <none> 8.0.35\n2026-11-20 10:13:44 install apache2:amd64 <none> 2.4.52\n2026-11-20 10:13:50 install redis-server:amd64 <none> 6.0.16',
        '/var/log/apache2/access.log': '185.23.11.4 - - [22/Nov/2026:09:31:10] "GET /admin HTTP/1.1" 403 199\n10.0.0.12 - - [22/Nov/2026:09:40:01] "GET / HTTP/1.1" 200 512',
        '/var/log/apache2/error.log': '[Sat Nov 22 09:31:10 2026] [error] [client 185.23.11.4] client denied by server configuration: /var/www/html/admin',
        '/var/log/nginx/access.log': [
            `${gateway} - - [22/Nov/2026:09:12:44 +0000] "GET / HTTP/1.1" 200 612 "-" "Mozilla/5.0"`,
            '185.23.11.4 - - [22/Nov/2026:09:31:10 +0000] "GET /wp-login.php HTTP/1.1" 404 162 "-" "curl/7.81.0"',
            '185.23.11.4 - - [22/Nov/2026:09:31:12 +0000] "GET /.env HTTP/1.1" 403 162 "-" "curl/7.81.0"',
            `${gateway} - admin [22/Nov/2026:10:05:03 +0000] "GET /admin/ HTTP/1.1" 200 1840 "-" "Mozilla/5.0"`,
        ].join('\n'),
        '/var/log/nginx/error.log': '2026/11/22 09:31:12 [error] 811#811: *14 access forbidden by rule, client: 185.23.11.4, request: "GET /.env HTTP/1.1"',
        '/var/log/mysql/error.log': '2026-11-22T07:00:12.311Z 0 [System] [MY-010116] /usr/sbin/mysqld (mysqld 8.0.35) starting as process 702\n2026-11-22T08:40:01.002Z 12 [Warning] Access denied for user \'root\'@\'localhost\' (using password: YES)',
        '/var/log/redis/redis-server.log': '702:M 22 Nov 2026 07:00:12.441 * Ready to accept connections tcp',
        '/var/log/journal/': null,
        '/var/www/html/index.html': '<html><body><h1>It works!</h1></body></html>',
        '/var/www/html/robots.txt': 'User-agent: *\nDisallow: /admin/\nDisallow: /backup/',
        '/var/www/html/.htaccess': 'Options -Indexes\n<Files "config.php">\n  Require all denied\n</Files>',
        '/var/www/html/config.php': "<?php\n$db_host = 'db-server';\n$db_user = 'webapp';\n$db_pass = 'Pa$$w0rd!';\n?>",
        '/var/www/html/uploads/': null,
        '/var/www/html/admin/index.php': "<?php\nrequire '../config.php';\n// TODO: move admin panel behind VPN\necho 'Admin panel';",
        '/var/backups/passwd.bak': 'root:x:0:0:root:/root:/bin/bash\nold_admin:x:1001:1001::/home/old_admin:/bin/bash',
        '/var/backups/shadow.bak': 'root:$6$oLd5aLt$Qm3n8Bv2Cx7Zl1Kj4Hg6Fd9Sa0PoIuYtReWq:18900:0:99999:7:::\nold_admin:$6$Zz9Yy8Xx$Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0Uv:18900:0:99999:7:::',
        '/var/backups/home.tar.gz': BIN,
        '/var/backups/dpkg.status.0': 'Package: openssh-server\nStatus: install ok installed\nVersion: 1:8.9p1-3ubuntu0.6',
        '/var/lib/mysql/ibdata1': BIN,
        '/var/lib/mysql/mysql/user.ibd': BIN,
        '/var/lib/redis/dump.rdb': BIN,
        '/var/lib/dpkg/status': 'Package: bash\nStatus: install ok installed\nVersion: 5.1-6ubuntu1\n\nPackage: openssh-server\nStatus: install ok installed',
        '/var/cache/apt/pkgcache.bin': BIN,
        '/var/spool/cron/crontabs/root': '# m h dom mon dow command\n*/5 * * * * /opt/scripts/healthcheck.sh',
        [`/var/spool/cron/crontabs/${user}`]: `# m h dom mon dow command\n0 * * * * /home/${user}/scripts/cleanup.sh`,
        '/var/mail/': null,
        '/var/tmp/': null,
        '/var/run/sshd.pid': '811',

        // ================= /opt, /srv, /mnt, /media, /tmp =================
        '/opt/backup.sh': '#!/bin/bash\n# Nightly backup\nPASS="changeme"\ntar -czf /var/backups/home.tar.gz /home',
        '/opt/scripts/healthcheck.sh': '#!/bin/bash\ncurl -fs http://localhost/ > /dev/null || systemctl restart nginx',
        '/opt/webapp/app.py': 'from flask import Flask\nimport os\n\napp = Flask(__name__)\n\n@app.route("/")\ndef index():\n    return "OK"\n\nif __name__ == "__main__":\n    app.run(port=int(os.environ.get("PORT", 5000)))',
        '/opt/webapp/requirements.txt': 'flask==3.0.0\ngunicorn==21.2.0\nredis==5.0.1',
        '/opt/monitoring/agent.yml': `server: monitor.company.local:8125\nhostname: ${host}\napi_key: 4f1c9e2a7b3d8f6e0a5c1b9d2e7f3a8c\ninterval: 60`,
        '/srv/ftp/': null,
        '/mnt/share/': null,
        '/media/usb/': null,
        '/tmp/.X11-unix/': null,
        '/tmp/.ICE-unix/': null,
        '/tmp/systemd-private-8f2a1c-nginx.service-Xk2Lq/': null,
        '/tmp/sess_a81f9c2b': 'user_id|i:1;logged_in|b:0;',
        '/tmp/install.log': 'Downloading packages...\nUnpacking...\nDone.',

        // ================= /root: root only =================
        '/root/.bashrc': '# ~/.bashrc for root\nexport PS1="\\u@\\h:\\w# "',
        '/root/.bash_history': 'ufw status\ncat /etc/shadow\nmysql -u root\napt upgrade -y\nreboot',
        '/root/.ssh/authorized_keys': `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN0pQx admin@it-laptop`,
        '/root/.smbcredentials': 'username=svc_backup\npassword=Sh4re-2023\ndomain=COMPANY',
        '/root/notes.txt': 'Rotate the backup password after the audit.\nDisable the old_admin account.',

        // ================= The user's home directory (~) =================
        '~/.bashrc': '# ~/.bashrc\nHISTSIZE=1000\nHISTFILESIZE=2000\nalias ll="ls -la"\nalias la="ls -a"\nalias update="sudo apt update && sudo apt upgrade"\nexport PATH=$PATH:/opt:~/scripts',
        '~/.profile': '# ~/.profile\nif [ -f ~/.bashrc ]; then . ~/.bashrc; fi\nif [ -d "$HOME/bin" ]; then PATH="$HOME/bin:$PATH"; fi',
        '~/.bash_logout': '# ~/.bash_logout\nclear',
        '~/.bash_history': 'ls -la\ncd Documents\nnano passwords.txt\nrm passwords.txt\nmysql -u root -ptoor\nssh admin@10.0.0.5\nsudo apt update\ncd ~/projects/webapp\ngit pull\nhistory -c',
        '~/.gitconfig': `[user]\n\tname = ${user}\n\temail = ${user}@company.local\n[credential]\n\thelper = store`,
        '~/.git-credentials': `https://${user}:ghp_old7Tq2Lw9x@git.company.local`,
        '~/.vimrc': 'syntax on\nset number\nset tabstop=4',
        '~/.viminfo': `# Last edited files:\n> ~/Documents/notes.txt\n> /etc/nginx/sites-available/default`,
        '~/.wget-hsts': '# HSTS 1.0 Known Hosts database for GNU Wget.\ngithub.com\t0\t1\t1700000000\t31536000',
        '~/.selected_editor': 'SELECTED_EDITOR="/bin/nano"',
        '~/.ssh/known_hosts': '10.0.0.5 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMq...\n10.0.0.12 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBx7...',
        '~/.ssh/id_rsa': '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn\n-----END OPENSSH PRIVATE KEY-----',
        '~/.ssh/id_rsa.pub': `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7Lq ${user}@${host}`,
        '~/.ssh/config': 'Host fileserver\n    HostName fileserver.company.local\n    User backup\n\nHost *\n    ServerAliveInterval 60',
        '~/.ssh/authorized_keys': `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN0pQx admin@it-laptop`,
        '~/.cache/motd.legal-displayed': '',
        '~/.cache/thumbnails/': null,
        '~/.config/htop/htoprc': 'fields=0 48 17 18 38 39 40 2 46 47 49 1\nsort_key=46',
        '~/.config/user-dirs.dirs': 'XDG_DESKTOP_DIR="$HOME/Desktop"\nXDG_DOWNLOAD_DIR="$HOME/Downloads"\nXDG_DOCUMENTS_DIR="$HOME/Documents"\nXDG_PICTURES_DIR="$HOME/Pictures"',
        '~/.config/autostart/': null,
        '~/.local/share/recently-used.xbel': `<?xml version="1.0"?>\n<xbel>\n  <bookmark href="file:///home/${user}/Documents/budget_2026.csv"/>\n  <bookmark href="file:///home/${user}/Documents/meeting_notes.txt"/>\n</xbel>`,
        '~/.local/share/Trash/': null,
        '~/.mozilla/firefox/profiles.ini': '[Profile0]\nName=default-release\nIsRelative=1\nPath=k2x8p1qz.default-release\nDefault=1',
        '~/.mozilla/firefox/k2x8p1qz.default-release/bookmarks.html': '<DT><A HREF="http://intranet.company.local/">Intranet</A>\n<DT><A HREF="http://webmail.company.local/">Webmail</A>\n<DT><A HREF="https://bank.example.com/">Bank</A>',
        '~/.mozilla/firefox/k2x8p1qz.default-release/places.sqlite': BIN,
        '~/.mozilla/firefox/k2x8p1qz.default-release/logins.json': '{"nextId":3,"logins":[{"hostname":"http://intranet.company.local","encryptedUsername":"MDoEEPgAAAAA...","encryptedPassword":"MEIEEPgAAAAA..."}]}',
        '~/Desktop/': null,
        '~/Documents/todo.txt': pick([
            '- Call the bank\n- Change password (again!)\n- Delete old backups',
            '- Renew the domain\n- Ask IT about the VPN\n- Clean up Downloads',
            '- Finish the quarterly report\n- Book meeting room\n- Update the wiki',
        ]),
        '~/Documents/old_passwords.txt': 'facebook: summer2019\ngmail: Football123\nwifi: 12345678',
        '~/Documents/report_q3.txt': 'Quarterly report Q3\nRevenue grew by 4%.\nCosts were 2% under budget.',
        '~/Documents/meeting_notes.txt': pick([
            'Meeting 14/11\n- New servers arrive in December\n- Everyone must change passwords every 90 days\n- Backups move to the file server',
            'Standup 18/11\n- Web app keeps crashing after deploys\n- IT will look at the firewall rules\n- Remember: no passwords in chat!',
        ], 1),
        '~/Documents/budget_2026.csv': 'Month,Income,Expenses\nJanuary,42000,38100\nFebruary,39500,40200\nMarch,44100,39900',
        '~/Documents/contacts.csv': 'Name,Phone,Email\nMaria Holt,555-0141,maria@company.local\nJonas Berg,555-0177,jonas@company.local\nIT Support,555-0100,it@company.local',
        '~/Documents/notes.txt': pick([
            'Wifi in the meeting room: guest / Welcome2026',
            'Printer on 2nd floor needs a new toner.',
            'Parking spot 14 is mine from January.',
        ], 2),
        '~/Downloads/setup.sh': '#!/bin/bash\necho "Installing..."\nsudo apt install -y htop',
        '~/Downloads/cat.jpg': BIN,
        '~/Downloads/invoice_2026-11.pdf': '%PDF-1.7\n%âãÏÓ\n1 0 obj << /Type /Catalog >> endobj\n(Invoice 2026-11, total 1.249,00)',
        '~/Downloads/vpn-client_2.4.1_amd64.deb': BIN,
        '~/Pictures/vacation.png': BIN,
        '~/Pictures/mountains.jpg': BIN,
        '~/Pictures/beach.jpg': BIN,
        '~/Pictures/Screenshots/screenshot_2026-11-20.png': BIN,
        '~/Music/': null,
        '~/Videos/': null,
        '~/Templates/': null,
        '~/Public/': null,
        '~/scripts/cleanup.sh': `#!/bin/bash\n# Removes old downloads\nfind /home/${user}/Downloads -mtime +30 -delete`,
        '~/scripts/db_dump.sh': '#!/bin/bash\nmysqldump -u webapp -p"$DB_PASS" webapp > /tmp/webapp.sql',
        '~/projects/webapp/README.md': '# Web app\n\nRun with `python3 app.py`. Settings come from `.env`.',
        '~/projects/webapp/app.py': 'import os\nfrom flask import Flask\n\napp = Flask(__name__)\nDB_PASS = os.environ["DB_PASS"]',
        '~/projects/webapp/.env': 'APP_ENV=development\nDB_HOST=localhost\nDB_USER=webapp\nDB_PASS=devpass123\nSECRET_KEY=dev-secret-change-me',
        '~/projects/webapp/.gitignore': '.env\n__pycache__/\n*.pyc',
        '~/projects/webapp/.git/config': '[core]\n\trepositoryformatversion = 0\n\tbare = false\n[remote "origin"]\n\turl = https://git.company.local/web/webapp.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n[branch "main"]\n\tremote = origin',
        '~/projects/webapp/.git/HEAD': 'ref: refs/heads/main',
        '~/projects/webapp/.git/logs/HEAD': `0000000 a1b2c3d ${user} <${user}@company.local> 1700000000 +0100\tcommit (initial): First version\na1b2c3d e4f5a6b ${user} <${user}@company.local> 1700500000 +0100\tcommit: Remove secrets from config`,
    };

    // Programs: just binary files
    const programs = {
        '/bin/': ['bash', 'sh', 'dash', 'ls', 'cat', 'cp', 'mv', 'rm', 'mkdir', 'rmdir', 'ln', 'chmod', 'chown', 'grep', 'sed', 'tar', 'gzip', 'su', 'ps', 'kill', 'ping', 'ip', 'ss', 'mount', 'date', 'echo', 'hostname', 'uname'],
        '/sbin/': ['reboot', 'shutdown', 'iptables', 'ufw', 'ifconfig', 'fdisk', 'mkfs.ext4', 'sysctl', 'useradd', 'usermod'],
        '/usr/bin/': ['python3', 'perl', 'ssh', 'scp', 'curl', 'wget', 'vim', 'nano', 'less', 'htop', 'top', 'mysql', 'mysqldump', 'redis-cli', 'nmap', 'arp', 'netstat', 'sudo', 'git', 'find', 'awk', 'sort', 'uniq', 'wc', 'head', 'tail', 'tree', 'du', 'df', 'file', 'strings', 'base64', 'openssl', 'gpg', 'zip', 'unzip', 'crontab', 'passwd', 'who', 'w', 'last', 'docker', 'systemctl', 'journalctl'],
        '/usr/sbin/': ['sshd', 'nginx', 'mysqld', 'cron', 'rsyslogd', 'logrotate', 'adduser', 'visudo'],
        '/usr/local/bin/': ['backup-db', 'deploy'],
        '/usr/lib/x86_64-linux-gnu/': ['libc.so.6', 'libssl.so.3', 'libcrypto.so.3', 'libz.so.1', 'libpthread.so.0'],
        '/lib/x86_64-linux-gnu/': ['libc.so.6', 'libm.so.6'],
    };
    for (const [dir, names] of Object.entries(programs)) for (const name of names) files[dir + name] = BIN;
    files['/usr/local/bin/backup-db'] = '#!/bin/bash\n# Dumps every database to /var/backups\nmysqldump --defaults-file=/etc/mysql/debian.cnf --all-databases > /var/backups/all.sql';
    files['/usr/local/bin/deploy'] = '#!/bin/bash\ncd /opt/webapp && git pull && systemctl restart webapp';
    for (const pkg of ['bash', 'openssh-server', 'nginx', 'mysql-server', 'python3', 'curl', 'git']) {
        files[`/usr/share/doc/${pkg}/copyright`] = `This is the ${pkg} package.\nIt is distributed under the terms of its license.`;
    }
    files['/usr/share/man/man1/'] = null;
    files['/usr/share/zoneinfo/'] = null;
    files['/usr/share/wordlists/'] = null;
    files['/usr/src/'] = null;

    // Per OS: the package manager's files
    if (debian) {
        files['/etc/apt/sources.list'] = `deb http://archive.ubuntu.com/ubuntu ${os.codename} main restricted universe\ndeb http://archive.ubuntu.com/ubuntu ${os.codename}-updates main restricted universe\ndeb http://security.ubuntu.com/ubuntu ${os.codename}-security main`;
        files['/etc/apt/apt.conf.d/20auto-upgrades'] = 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";';
        files['/etc/lsb-release'] = `DISTRIB_ID=${os.name.split(' ')[0]}\nDISTRIB_RELEASE=${os.version.split(' ')[0]}\nDISTRIB_CODENAME=${os.codename}\nDISTRIB_DESCRIPTION="${os.pretty}"`;
    } else if (os.family === 'redhat') {
        files['/etc/dnf/dnf.conf'] = '[main]\ngpgcheck=True\ninstallonly_limit=3\nclean_requirements_on_remove=True';
        files['/etc/yum.repos.d/fedora.repo'] = '[fedora]\nname=Fedora $releasever - $basearch\nmetalink=https://mirrors.fedoraproject.org/metalink?repo=fedora-$releasever&arch=$basearch\nenabled=1';
        files['/etc/selinux/config'] = 'SELINUX=enforcing\nSELINUXTYPE=targeted';
    }
    if (os.id === 'kali') {
        files['/etc/apt/sources.list'] = 'deb http://http.kali.org/kali kali-rolling main contrib non-free non-free-firmware';
        files['/usr/share/wordlists/rockyou.txt.gz'] = BIN;
        files['/usr/share/wordlists/README'] = 'Wordlists for password testing. rockyou.txt.gz must be unpacked first.';
        for (const name of ['hydra', 'john', 'sqlmap', 'nikto', 'gobuster', 'msfconsole', 'aircrack-ng']) files['/usr/bin/' + name] = BIN;
    }
    if (os.family === 'darwin') {
        files['/System/Library/CoreServices/SystemVersion.plist'] = `<plist version="1.0"><dict>\n<key>ProductName</key><string>macOS</string>\n<key>ProductVersion</key><string>${os.version.split(' ')[0]}</string>\n</dict></plist>`;
        files['/Applications/Safari.app/'] = null;
        files['/Applications/Utilities/Terminal.app/'] = null;
        files['/Library/Preferences/'] = null;
        files['~/Library/Preferences/com.apple.finder.plist'] = BIN;
        files['~/Library/Keychains/login.keychain-db'] = BIN;
    }

    return files;
}
