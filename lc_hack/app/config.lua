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
        desktop = 'chromeos',

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
        -- The search engine and the brand websites: their passwords are only for server owners (to hand to an RP business), nothing hints at them.
        { ip = '91.198.10.1', host = 'eyefind-crawler', user = 'crawler', password = 'Ey3find!Index', rootPassword = 'Crawl#AllTheThings', website = 'websites/eyefind', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Eyefind
        { ip = '104.44.12.20', host = 'mazebank-web', user = 'webteam', password = 'Mz-Tower!62', rootPassword = 'MazeR00t#1991', website = 'websites/mazebank', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Maze Bank
        { ip = '104.44.18.31', host = 'fleeca-web', user = 'branchit', password = 'Fl33ca!Branch', rootPassword = 'Vault-Keypad-6', website = 'websites/fleeca', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Fleeca
        { ip = '52.84.21.7', host = 'burgershot-web', user = 'marketing', password = 'Bleeder4.99!', rootPassword = 'HeartStopper#3', website = 'websites/burgershot', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Burger Shot
        { ip = '52.84.33.12', host = 'cluckinbell-web', user = 'webmaster', password = 'Cluck11Herbs!', rootPassword = 'Paleto-Farm-71', website = 'websites/cluckinbell', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Cluckin' Bell
        { ip = '52.84.40.3', host = 'beanmachine-web', user = 'barista', password = 'ColdBrew20h!', rootPassword = 'HustleShot#4x', website = 'websites/beanmachine', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Bean Machine
        { ip = '69.171.20.15', host = 'lifeinvader-web', user = 'deploy', password = 'Sh4re-Everything', rootPassword = 'Invade#Privacy0', website = 'websites/lifeinvader', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Lifeinvader
        { ip = '151.101.12.80', host = 'weazel-cms', user = 'editor', password = 'Breaking!News24', rootPassword = 'W3azel-Newsroom', website = 'websites/weazelnews', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Weazel News
        { ip = '185.60.41.9', host = 'pdm-web', user = 'sales', password = 'Zentorno725k!', rootPassword = 'PDM-Showroom#9', website = 'websites/pdm', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Premium Deluxe Motorsport
        { ip = '185.60.47.22', host = 'lscustoms-web', user = 'garage', password = 'Respray!Matte', rootPassword = 'Turbo-Level4#', website = 'websites/lscustoms', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Los Santos Customs
        { ip = '143.231.2.10', host = 'lspd-web', user = 'pio', password = 'MissionRow!911', rootPassword = 'LSPD-Dispatch#7', website = 'websites/lspd', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Los Santos Police Department
        { ip = '143.231.8.44', host = 'pillbox-web', user = 'itdesk', password = 'Elgin-Ave!ER', rootPassword = 'Trauma#Bay320', website = 'websites/pillbox', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Pillbox Hill Medical Center
        { ip = '23.92.55.17', host = 'ammunation-web', user = 'storeops', password = 'Range-Time!25', rootPassword = 'Since1952#Ammo', website = 'websites/ammunation', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Ammu-Nation
        { ip = '23.92.61.8', host = 'store247-web', user = 'franchise', password = 'Always0pen!', rootPassword = 'Register#Till7', website = 'websites/twentyfourseven', firewall = { open = { 22, 80, 443 }, ping = true } }, -- 24/7 Supermarket
        { ip = '77.88.14.6', host = 'vangelico-web', user = 'atelier', password = 'Panther-212ct', rootPassword = 'Portola#1938', website = 'websites/vangelico', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Vangelico
        { ip = '77.88.19.25', host = 'ponsonbys-web', user = 'stylist', password = 'Tailored!3pc', rootPassword = 'Cashmere#Camel', website = 'websites/ponsonbys', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Ponsonbys
        { ip = '64.29.17.8', host = 'dynasty8-web', user = 'agent', password = 'EclipseT0wers!', rootPassword = 'WildOats#Villa', website = 'websites/dynasty8', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Dynasty 8
        { ip = '64.29.23.40', host = 'downtowncab-web', user = 'dispatch', password = 'Fare$2.50mile', rootPassword = 'Strawberry#Depot', website = 'websites/downtowncab', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Downtown Cab Co.
        { ip = '88.221.91.5', host = 'diamond-web', user = 'marketing', password = 'HighRoller!777', rootPassword = 'Penthouse#Vault', website = 'websites/diamondcasino', firewall = { open = { 22, 80, 443 }, ping = true } }, -- The Diamond Casino & Resort
        { ip = '46.105.33.7', host = 'g6-web', user = 'comms', password = 'Armored!Truck140', rootPassword = 'CashInTransit#6', website = 'websites/gruppesechs', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Gruppe Sechs
        { ip = '88.221.95.14', host = 'bahamas-web', user = 'promoter', password = 'TikiBar!Coconut', rootPassword = 'Neon#Saturday4am', website = 'websites/bahamamamas', firewall = { open = { 22, 80, 443 }, ping = true } }, -- Bahama Mamas West
    },

    -- DNS: name -> IP. Used by the browser, curl, ping, ssh, ... on every machine.
    -- A machine's own /etc/hosts is checked first, like on Linux.
    dns = {
        ['northbank.com'] = '82.103.40.12',
        ['www.northbank.com'] = '82.103.40.12',
        ['eyefind.info'] = '91.198.10.1', ['www.eyefind.info'] = '91.198.10.1',
        ['mazebank.com'] = '104.44.12.20', ['www.mazebank.com'] = '104.44.12.20',
        ['fleeca.com'] = '104.44.18.31', ['www.fleeca.com'] = '104.44.18.31',
        ['burgershot.com'] = '52.84.21.7', ['www.burgershot.com'] = '52.84.21.7',
        ['cluckinbell.com'] = '52.84.33.12', ['www.cluckinbell.com'] = '52.84.33.12',
        ['beanmachine.com'] = '52.84.40.3', ['www.beanmachine.com'] = '52.84.40.3',
        ['lifeinvader.com'] = '69.171.20.15', ['www.lifeinvader.com'] = '69.171.20.15',
        ['weazelnews.com'] = '151.101.12.80', ['www.weazelnews.com'] = '151.101.12.80',
        ['premiumdeluxemotorsport.com'] = '185.60.41.9', ['www.premiumdeluxemotorsport.com'] = '185.60.41.9',
        ['pdm.com'] = '185.60.41.9', ['www.pdm.com'] = '185.60.41.9',
        ['lscustoms.com'] = '185.60.47.22', ['www.lscustoms.com'] = '185.60.47.22',
        ['lspd.gov'] = '143.231.2.10', ['www.lspd.gov'] = '143.231.2.10',
        ['pillboxmedical.com'] = '143.231.8.44', ['www.pillboxmedical.com'] = '143.231.8.44',
        ['ammu-nation.com'] = '23.92.55.17', ['www.ammu-nation.com'] = '23.92.55.17',
        ['ammunation.com'] = '23.92.55.17', ['www.ammunation.com'] = '23.92.55.17',
        ['247store.com'] = '23.92.61.8', ['www.247store.com'] = '23.92.61.8',
        ['vangelico.com'] = '77.88.14.6', ['www.vangelico.com'] = '77.88.14.6',
        ['ponsonbys.com'] = '77.88.19.25', ['www.ponsonbys.com'] = '77.88.19.25',
        ['dynasty8.com'] = '64.29.17.8', ['www.dynasty8.com'] = '64.29.17.8',
        ['dynasty8realestate.com'] = '64.29.17.8', ['www.dynasty8realestate.com'] = '64.29.17.8',
        ['downtowncab.com'] = '64.29.23.40', ['www.downtowncab.com'] = '64.29.23.40',
        ['downtowncab.co'] = '64.29.23.40', ['www.downtowncab.co'] = '64.29.23.40',
        ['thediamondcasino.com'] = '88.221.91.5', ['www.thediamondcasino.com'] = '88.221.91.5',
        ['diamondcasino.com'] = '88.221.91.5', ['www.diamondcasino.com'] = '88.221.91.5',
        ['gruppesechs.com'] = '46.105.33.7', ['www.gruppesechs.com'] = '46.105.33.7',
        ['bahamamamas.com'] = '88.221.95.14', ['www.bahamamamas.com'] = '88.221.95.14',
    },

    -- The search engine's results page. The browser starts on its front page and searches
    -- with it from the address bar. A page with an element marked data-search shows the
    -- results for ?q= (see websites/eyefind/search.html). false = no search engine.
    search = 'eyefind.info/search.html',
}
