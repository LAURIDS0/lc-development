-- =====================================================================
--  lc_hack - config
--  Only loaded on the server, so passwords here never reach players.
-- =====================================================================

return {
    -- The player's own laptop. "scan" finds the devices other resources add with
    -- registerDevice (lc_phonehack, lc_keyclone, ...), "connect <ID>" connects to one.
    -- With ox_inventory, the "laptop" item opens it (see README).
    laptop = {
        -- Without ox_inventory: a command that opens the laptop. false = no command.
        -- restricted = an ace, e.g. 'group.admin', or false for everyone
        command = { name = 'laptop', restricted = false },

        -- 'kali', 'ubuntu', 'macos', 'chromeos', 'mint', 'fedora', 'random' or false for a terminal only
        desktop = 'kali',

        -- Wrong passwords allowed before the laptop closes
        attempts = 4,

        -- Most devices "scan" lists at once, closest first
        maxDevices = 10,
    },

    -- Servers that are always on. They are part of every hack, and every machine can
    -- reach them (like the internet) unless their firewall blocks it.
    -- Same fields as a machine in a HackConfig's network, plus:
    --   website = folder in this resource with a static website (HTML, CSS and images).
    --             It starts at index.html; every page, stylesheet and image it links to
    --             is loaded, and served from /var/www/html. Scripts never run.
    -- Servers with a website and no ports get { 22, 80, 443 }.
    servers = {
        {
            ip = '82.103.40.12',
            host = 'northbank-web',
            user = 'webadmin',
            password = 'N0rth!Web',
            rootPassword = 'Vault-2049',
            website = 'websites/northbank',
            firewall = { open = { 22, 80, 443 }, ping = true }, -- ssh and the website are open to everyone
        },
    },

    -- DNS: name -> IP. Used by the browser, curl, ping, ssh, ... on every machine.
    -- A machine's own /etc/hosts is checked first, like on Linux.
    dns = {
        ['northbank.com'] = '82.103.40.12',
        ['www.northbank.com'] = '82.103.40.12',
    },
}
