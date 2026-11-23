// =====================================================================
//  Browser test mode
//  Outside FiveM there is no client or server, so this file stands in
//  for them: it answers the NUI callbacks and opens the /hack example.
//  It reads the real config.lua and the example in server/commands.lua,
//  so there is nothing to keep in sync. In FiveM, GetParentResourceName
//  exists and this file does nothing.
//
//  Run in the resource folder:  python3 -m http.server 8000
//  and open http://localhost:8000/web/
//    ?desktop=macos|kali|ubuntu|chromeos|mint|fedora|random  the player's desktop
//    ?desktop=none                                           the plain terminal
//    ?hack=../myresource/hacks/office.lua   your own hack instead of /hack: a Lua file
//      with "return { ... }" (or "local name = { ... }"), relative to the lc_hack folder.
//      Serve your resources folder to reach other resources.
//  Changes on the always-on servers are kept in this browser (localStorage).
// =====================================================================

// Reads a Lua table literal: the config files are plain data. Supports strings
// ('', "" with escapes), numbers, true/false/nil, comments and { a = 1, ['b'] = 2, 3 }.
function parseLua(src, start = 0) {
    let i = start;
    const skip = () => {
        for (;;) {
            while (/\s/.test(src[i])) i++;
            if (!src.startsWith('--', i)) return;
            i = src.startsWith('--[[', i) ? src.indexOf(']]', i) + 2 : src.indexOf('\n', i);
            if (i < 1) i = src.length;
        }
    };
    const string = () => {
        const quote = src[i++];
        let out = '';
        while (src[i] !== quote) {
            if (i >= src.length) throw new Error('lua: unfinished string');
            if (src[i] === '\\') {
                const c = src[++i];
                out += { n: '\n', t: '\t', r: '\r' }[c] ?? c;
            } else out += src[i];
            i++;
        }
        i++;
        return out;
    };
    const value = () => {
        skip();
        if (src[i] === '{') return table();
        if (src[i] === '"' || src[i] === "'") return string();
        const m = /-?\d+(\.\d+)?|true|false|nil/y;
        m.lastIndex = i;
        const word = m.exec(src);
        if (!word) throw new Error('lua: unexpected ' + src.slice(i, i + 30));
        i = m.lastIndex;
        return { true: true, false: false, nil: undefined }[word[0]] ?? Number(word[0]);
    };
    const table = () => {
        i++;
        const list = [];
        const obj = {};
        let keyed = false;
        for (;;) {
            skip();
            if (src[i] === '}') { i++; break; }
            let key = null;
            if (src[i] === '[') {
                i++;
                key = value();
                skip(); i++; // ]
                skip(); i++; // =
            } else {
                const name = /([A-Za-z_]\w*)\s*=(?!=)/y;
                name.lastIndex = i;
                const m = name.exec(src);
                if (m) { key = m[1]; i = name.lastIndex; }
            }
            const v = value();
            if (key === null) list.push(v);
            else { keyed = true; obj[key] = v; }
            skip();
            if (src[i] === ',' || src[i] === ';') i++;
        }
        if (!keyed) return list;
        list.forEach((v, n) => { obj[n + 1] = v; });
        return obj;
    };
    return value();
}

if (typeof GetParentResourceName !== 'function' && !MIRROR) {
    document.body.classList.add('dev');
    const realFetch = window.fetch.bind(window);
    const readText = async (path) => {
        const res = await realFetch(path).catch(() => null);
        return res && res.ok ? res.text() : null;
    };

    // ---------- Like server/servers.lua: the always-on servers and their websites ----------

    const toDataUrl = (blob) => new Promise(done => {
        const reader = new FileReader();
        reader.onload = () => done(reader.result);
        reader.readAsDataURL(blob);
    });

    // Loads a website from index.html, following its links
    const loadWebsite = async (folder) => {
        const files = {};
        const queue = ['index.html'];
        while (queue.length && Object.keys(files).length < 200) {
            const path = queue.shift();
            if (path in files) continue;
            files[path] = null;
            const res = await realFetch(`../${folder}/${path}`).catch(() => null);
            if (!res || !res.ok) { console.warn(`[lc_hack] website ${folder}: ${path} not found`); continue; }
            files[path] = /\.(png|jpe?g|gif|webp)$/i.test(path) ? await toDataUrl(await res.blob()) : await res.text();
            if (!/\.html?$/i.test(path)) continue;
            for (const [, raw] of files[path].matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/g)) {
                const url = raw.replace(/[?#].*$/, '');
                if (!url || /^([a-z]+:|\/\/)/i.test(url)) continue;
                let next = resolveLink('/' + path, url).slice(1);
                if (!next || next.endsWith('/')) next += 'index.html';
                queue.push(next);
            }
        }
        return files;
    };

    // Changes players made on the servers: serverdata.json on a real server, localStorage here
    const DEV_KEY = 'lc_hack_dev_servers';
    let devSaved = {};
    try { devSaved = JSON.parse(localStorage.getItem(DEV_KEY)) || {}; } catch { /* private window: not kept */ }
    const serverKey = (m) => (Array.isArray(m.ip) ? m.ip[0] : m.ip);

    const loadConfig = async () => {
        const text = await readText('../config.lua');
        if (!text) return { servers: [], dns: {} };
        const config = parseLua(text, text.search(/^return\b/m) + 6);
        const servers = await Promise.all(toList(config.servers).map(async ({ website, ...server }) => {
            const files = { ...server.files };
            if (typeof website === 'string') {
                for (const [path, data] of Object.entries(await loadWebsite(website))) if (data !== null) files['/var/www/html/' + path] = data;
            }
            if (website === true) files['/var/www/html/'] = '';
            const saved = devSaved[serverKey(server)] || {};
            return {
                ...server, files, internet: true,
                ports: server.ports || (website ? [22, 80, 443] : undefined),
                written: saved.written || {}, deleted: saved.deleted || {},
            };
        }));
        const dns = {};
        for (const [name, ip] of Object.entries(config.dns || {})) dns[name.toLowerCase()] = ip;
        return { servers, dns };
    };

    // Like servers.apply, without the checks (this is only for testing)
    const serverFiles = (m, ops) => {
        for (const op of ops) {
            if (op.op === 'write') { m.written[op.path] = op.content; delete m.deleted[op.path]; }
            if (op.op === 'mkdir') { if (!(op.path in m.written)) m.written[op.path] = false; delete m.deleted[op.path]; }
            if (op.op === 'delete') {
                for (const p of Object.keys(m.written)) if (p === op.path || p.startsWith(op.path + '/')) delete m.written[p];
                m.deleted[op.path] = true;
            }
        }
        devSaved[serverKey(m)] = { written: m.written, deleted: m.deleted };
        try { localStorage.setItem(DEV_KEY, JSON.stringify(devSaved)); } catch { /* not kept */ }
    };

    // ---------- Like server/session.lua: start, publicMachine and lc_hack:verify ----------

    const hasIp = (m, ip) => (Array.isArray(m.ip) ? m.ip.includes(ip) : m.ip === ip);
    const publicMachine = (m, index) => {
        const { password, rootPassword, network, ...copy } = m;
        return { ...copy, hasPassword: password !== undefined, hasRootPassword: rootPassword !== undefined, index };
    };

    let s = null;
    const start = (example, config) => {
        const machines = [example, ...toList(example.network).filter(m => m.ip), ...config.servers];
        const target = example.target === false ? null : machines.find(m => example.target && hasIp(m, example.target)) || machines[0];
        const pub = publicMachine(example, 1);
        pub.network = machines.slice(1).map((m, i) => publicMachine(m, i + 2));
        pub.dns = config.dns;
        s = { machines, target, attempts: example.attempts || 3 };
        window.postMessage({ action: 'open', config: pub }, '*');
    };

    const verify = (data) => {
        if (!s) return { ok: false, lost: true };
        const m = s.machines[Number(data.machine) - 1];
        if (!m) return { ok: false, attempts: s.attempts };
        const value = String(data.value ?? '');
        const ok = data.kind === 'root'
            ? m.rootPassword === undefined || value === m.rootPassword
            : data.user === m.user && (m.password === undefined || value === m.password);
        if (ok) {
            if (data.kind === 'root' && m === s.target) { s = null; console.log('[lc_hack] win'); return { ok: true, win: true }; }
            return { ok: true };
        }
        if (--s.attempts <= 0) { s = null; console.log('[lc_hack] lost'); return { ok: false, lost: true }; }
        return { ok: false, attempts: s.attempts };
    };

    // ---------- Start: read the Lua files, then answer the NUI like client/terminal.lua ----------

    (async () => {
        const params = new URLSearchParams(location.search);
        const file = '../' + (params.get('hack') || 'server/commands.lua');
        const lua = await readText(file);
        if (!lua) {
            return console.error(`[lc_hack] Browser test mode: ${file} not found. Run the web server in the resource folder and open /web/`);
        }
        // The hack is the first "return {" or "local name = {" at the start of a line
        const at = lua.search(/^return\s*\{/m) >= 0 ? lua.search(/^return\s*\{/m) : lua.search(/^local \w+\s*=\s*\{/m);
        const example = parseLua(lua, lua.indexOf('{', at));
        const desktop = params.get('desktop');
        if (desktop) example.desktop = desktop === 'none' ? undefined : desktop;
        const config = await loadConfig();

        let liveFeed = null;
        window.GetParentResourceName = () => 'lc_hack';
        window.fetch = (url, opts) => {
            const name = String(url).match(/^https:\/\/lc_hack\/(\w+)$/)?.[1];
            if (!name) return realFetch(url, opts);
            const data = JSON.parse(opts?.body || '{}');
            let res = 'ok';
            if (name === 'verify') res = verify(data);
            // Cameras: the page's background plays the game's camera, with a picture per camera
            if (name === 'cameraView') {
                // The test mode puts the camera's picture right in the window, like the fitted game camera does
                liveFeed = imageSrc(`camera ${JSON.stringify(data.coords)}`, '');
                const r = data.rect;
                document.body.style.background = `#000 url("${liveFeed}") ${r.x}px ${r.y}px / ${r.w}px ${r.h}px no-repeat`;
                res = true;
            }
            if (name === 'cameraOff') { document.body.style.background = ''; liveFeed = null; res = true; }
            if (name === 'cameraSnapshot') res = liveFeed || false;
            if (name === 'serverFiles' && s) {
                const m = s.machines[Number(data.machine) - 1];
                if (m && m.internet) serverFiles(m, data.ops);
            }
            if (name === 'close') {
                // Hide the window, then start over so you can keep testing
                s = null;
                window.postMessage({ action: 'close' }, '*');
                setTimeout(() => start(example, config), 1000);
            }
            return Promise.resolve(new Response(JSON.stringify(res)));
        };

        start(example, config);
    })();
}
