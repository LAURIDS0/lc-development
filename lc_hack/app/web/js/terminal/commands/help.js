// =====================================================================
//  Commands
//  Every command gets a list of arguments (the words after the command).
//  New command? Just add a function here and it works with Tab too.
// =====================================================================
const commands = {};

// Commands: Help
Object.assign(commands, {
    help() {
        print('Files:    ls, la, ll, cd, pwd, cat, less, head, tail, grep, find, tree, stat, file, wc, sort, uniq, strings, base64');
        print('Edit:     touch, mkdir, rmdir, cp, mv, rm, echo > file');
        print('System:   whoami, id, hostname, uname, date, ps, crontab, du, df, history, echo, clear');
        print('Network:  ifconfig, ip, ping, nmap, arp, netstat, curl, ssh, rdp, ufw');
        print('Access:   su, sudo, startx, exit');
        print('Cameras:  view <ip>');
        if (serverCommands.length) print(`Tools:    ${serverCommands.join(', ')}`);
        if (target) print(`Goal: get root access on ${target.host}.`);
    },
});
