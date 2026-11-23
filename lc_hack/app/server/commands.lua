-- =====================================================================
--  lc_hack - test commands (admins only)
--  Uses the same functions as the exports, so it doubles as an example.
-- =====================================================================

local api = require 'server.api'

-- Example: workstation -> backup-srv (sits on both networks) -> db-server (behind a firewall).
-- Solution: read the mail, ssh backup, read /opt/backup.sh, ssh dbadmin@db-server, read ~/.mysql_history, su.
local example = {
    -- The player's own machine
    ip = '10.0.0.20',
    host = 'workstation',
    user = 'alex',
    desktop = 'ubuntu',
    rootPassword = 'Qw7#local', -- Not written anywhere: su here only burns attempts
    attempts = 5,
    target = '192.168.1.5',     -- Root on db-server wins
    files = {
        ['~/Desktop/note.txt'] = 'The backup server is at 10.0.0.12. IT mailed me the login.',
        ['~/Pictures/whiteboard.svg'] = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f4f4f0"/><rect x="110" y="60" width="180" height="170" fill="#ffe66d" transform="rotate(-4 200 145)"/><text x="200" y="120" font-family="Comic Sans MS, cursive" font-size="20" text-anchor="middle" transform="rotate(-4 200 145)">wifi: Office-5G</text><text x="200" y="160" font-family="Comic Sans MS, cursive" font-size="20" text-anchor="middle" transform="rotate(-4 200 145)">Pa55w0rd!</text></svg>', -- A decoy hint in a picture
        ['/var/mail/alex'] = 'From: it@company.com\nSubject: Backup access\n\nUser: backup\nPassword: Secure2026',
    },

    network = {
        {   -- Backup server: sits on both networks, so the player can hop on from there
            ip = { '10.0.0.12', '192.168.1.10' },
            host = 'backup-srv',
            desktop = 'random', -- rdp backup@10.0.0.12 gives a random desktop
            user = 'backup',
            password = 'Secure2026',
            rootPassword = 'B4ckup!root',
            files = {
                ['~/notes.txt'] = 'db-server has a firewall now. Only this machine may connect.',
                ['/etc/hosts'] = '127.0.0.1\tlocalhost\n127.0.1.1\tbackup-srv\n192.168.1.5\tdb-server',
                ['/opt/backup.sh'] = '#!/bin/bash\nDB_USER=dbadmin\nDB_PASS=Tr0ll3y!\nmysqldump -h db-server -u $DB_USER -p$DB_PASS --all-databases > /var/backups/db.sql',
            },
        },
        {   -- Web server: doesn't answer ping, but port 80 is open (nmap/curl)
            ip = '10.0.0.30',
            host = 'web01',
            user = 'www',
            password = 'w3b!2026',
            ports = { 22, 80 },
            firewall = { open = { 80 } },
            files = {
                ['/var/www/html/index.html'] = '<html><body><h1>Company intranet</h1><!-- backups run from 10.0.0.12 --></body></html>',
            },
        },
        {   -- The target: only backup-srv may connect
            ip = '192.168.1.5',
            host = 'db-server',
            user = 'dbadmin',
            password = 'Tr0ll3y!',
            rootPassword = 'Fjord#88',
            ports = { 22, 3306 },
            firewall = { allow = { '192.168.1.10' } },
            processes = { '/usr/sbin/mysqld --user=mysql --skip-grant-tables=0' },
            files = {
                ['~/.mysql_history'] = "SHOW DATABASES;\nALTER USER 'root'@'localhost' IDENTIFIED BY 'Fjord#88';\nexit",
            },
        },
    },
}

-- /hack: opens the example on yourself
lib.addCommand('hack', { help = 'Open the lc_hack example', restricted = 'group.admin' }, function(source)
    api.startHack(source, example, function(success)
        print(('[lc_hack] %s finished the example: %s'):format(GetPlayerName(source), success and 'success' or 'failed'))
    end)
end)

-- /hackterminal: creates a test terminal where you stand, with a screen 1.5 m in front of you
lib.addCommand('hackterminal', { help = 'Create an lc_hack test terminal at your position', restricted = 'group.admin' }, function(source)
    local ped = GetPlayerPed(source)
    local coords = GetEntityCoords(ped)
    local heading = GetEntityHeading(ped)
    local rad = math.rad(heading)
    local forward = vector3(-math.sin(rad), math.cos(rad), 0.0)

    api.createTerminal({
        name = 'test',
        coords = coords,
        label = 'Hack test terminal',
        screen = {
            coords = coords + forward * 1.5 + vector3(0.0, 0.0, 0.6),
            heading = heading, -- Faces you, since you are looking at it
            width = 1.6,
        },
        config = example,
        onSuccess = function(player) print(('[lc_hack] %s hacked the test terminal'):format(GetPlayerName(player))) end,
        onFail = function(player) print(('[lc_hack] %s failed the test terminal'):format(GetPlayerName(player))) end,
    })
end)
