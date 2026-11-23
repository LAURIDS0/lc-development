-- =====================================================================
--  lc_hack - config
--  Only loaded on the server, so passwords here never reach players.
-- =====================================================================

return {
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
