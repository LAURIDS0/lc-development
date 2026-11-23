// =====================================================================
//  App: Web browser (Safari, Firefox, Chrome)
//  Works like curl from the desktop's machine: same /etc/hosts, DNS,
//  network and firewall. A page is a file in /var/www/html on the
//  machine: http://northbank.com/ = index.html, /about.html = about.html.
//
//  Static websites only: pages are shown in a sandboxed iframe where
//  scripts never run. The browser fills in stylesheets and images from
//  the same server and follows links itself.
//  Players can write pages on the always-on servers, so a page is never
//  trusted: nothing on it may load anything from outside (that would leak
//  the IP of everyone viewing it).
//
//  Forms are sent by the browser too (GET, as a query string). A page
//  with an element marked data-search gets the search results for ?q=
//  put in it: every page on every website in the DNS (see searchWeb).
//  The address bar searches with config.search, like a real browser.
// =====================================================================

registerApp('browser', {
    open: () => openBrowser(),
    name: 'Firefox', names: { kali: 'Firefox ESR', macos: 'Safari', chromeos: 'Chrome' },
    icon: 'fa-brands fa-firefox-browser', icons: { macos: 'fa-brands fa-safari', chromeos: 'fa-brands fa-chrome' },
});

const BROWSER_HOME = 'about:home';

// The browser starts on the search engine's front page, if there is one
function openBrowser(start = searchUrl ? searchUrl.replace(/[^/]*$/, '') : BROWSER_HOME) {
    const body = el('div', 'browser');
    const toolbar = el('div', 'browser-toolbar');
    const back = iconButton('browser-btn', ICONS.back, 'Back');
    const reload = iconButton('browser-btn', ICONS.reload, 'Reload');
    const address = el('input', 'browser-address');
    address.spellcheck = false;
    address.placeholder = 'Search or enter address';
    toolbar.append(back, reload, address);
    const view = el('div', 'browser-view');
    body.append(toolbar, view);

    const win = createWindow(appName('browser'), body, { width: 760, height: 500, app: 'browser' });
    const title = win.querySelector('.win-title');
    const history = [];
    let loading = null;

    // A page made by the browser itself (start page, errors)
    const notice = (heading, text) => {
        const page = el('div', 'browser-notice');
        page.append(el('h2', '', heading), el('p', '', text));
        view.replaceChildren(page);
        title.textContent = `${heading} - ${appName('browser')}`;
    };

    const go = (url, push = true) => {
        url = url.trim();
        if (!url) return;
        // Not an address (spaces, or one word that isn't a known host): search for it
        if (searchUrl && url !== BROWSER_HOME && (/\s/.test(url) || (!/[.:/]/.test(url) && !asDesk(() => lookup(url))))) {
            url = `${searchUrl}?q=${encodeURIComponent(url)}`;
        }
        clearTimeout(loading);
        if (push && history[history.length - 1] !== url) history.push(url);
        address.value = url === BROWSER_HOME ? '' : url;
        if (url === BROWSER_HOME) return notice('New Tab', 'Type an address, e.g. northbank.com');

        const [, scheme, host, port, path] = url.match(/^(?:(https?):\/\/)?([^:/\s]+)(?::(\d+))?(\/\S*)?$/) || [];
        if (!host) return notice("Hmm. We're having trouble finding that site.", `"${url}" is not a valid address.`);
        const portNum = Number(port || (scheme === 'https' ? 443 : 80));
        const origin = `${scheme || 'http'}://${host}${port ? ':' + port : ''}`;

        const ip = asDesk(() => lookup(host));
        if (!ip) return notice("Hmm. We're having trouble finding that site.", `We can't connect to the server at ${host}. (DNS_PROBE_FINISHED_NXDOMAIN)`);
        const r = asDesk(() => reach(ip, portNum));

        // Like curl: a firewall drops the traffic, so it takes a while before the error
        view.replaceChildren(el('div', 'browser-loading', `Connecting to ${host}...`));
        loading = setTimeout(() => {
            if (r.status !== 'ok') {
                return notice('Unable to connect', `${host} took too long to respond or refused the connection. (${CONNECT_ERRORS[r.status]})`);
            }
            const file = (path || '/').replace(/[?#].*$/, '');
            const query = new URLSearchParams(((path || '').split('#')[0].split('?')[1]) || '');
            const page = pageFile(r.machine, file);
            if (page === undefined) return notice('404 Not Found', `The requested URL ${file} was not found on this server.`);
            showPage(r.machine, origin, file, page, query);
        }, r.status === 'blocked' ? 1500 : 300);
    };

    // Shows a page. Text files are shown as plain text, like a real browser.
    const showPage = (machine, origin, file, page, query) => {
        const frame = el('iframe', 'browser-frame');
        // No allow-scripts: nothing on the page can run. Same origin so the browser can follow its links.
        frame.setAttribute('sandbox', 'allow-same-origin');
        const isHtml = /\.html?$/i.test(file) || !/\.\w+$/.test(file); // A folder serves its index.html
        frame.srcdoc = isHtml ? lockedDown(page, machine, file, query) : `<pre style="white-space:pre-wrap;font:13px monospace">${escapeHtml(page)}</pre>`;
        frame.onload = () => {
            const doc = frame.contentDocument;
            if (!doc) return;
            title.textContent = `${doc.title || origin.replace(/^\w+:\/\//, '')} - ${appName('browser')}`;
            if (isHtml) followLinks(doc, origin, file, go);
        };
        view.replaceChildren(frame);
    };

    address.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(address.value); });
    back.onclick = () => {
        if (history.length < 2) return;
        history.pop();
        go(history[history.length - 1], false);
    };
    reload.onclick = () => go(history[history.length - 1] || BROWSER_HOME, false);
    go(start);
    address.focus();
}

// Only inline styles and data: images/fonts may load; the browser fills those in itself.
const PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";

// A page made ready and safe to show, before it is shown. DOMParser is inert, so nothing loads here.
//   <meta http-equiv> is removed: a refresh would navigate the frame to the real internet.
//   Stylesheets and images come from the same server and are put in the page itself;
//   anything from outside is dropped. The CSP blocks whatever is left.
function lockedDown(html, machine, file, query = new URLSearchParams()) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    showSearch(doc, query.get('q') || '');
    const local = (url) => url && !/^([a-z]+:|\/\/|#)/i.test(url);
    const fromServer = (url) => (local(url) ? pageFile(machine, resolveLink(file, url.replace(/[?#].*$/, ''))) : undefined);

    doc.querySelectorAll('meta[http-equiv]').forEach(m => m.remove());
    for (const link of doc.querySelectorAll('link[rel~="stylesheet"]')) {
        const style = doc.createElement('style');
        style.textContent = fromServer(link.getAttribute('href')) || '';
        link.replaceWith(style);
    }
    for (const img of doc.querySelectorAll('img')) {
        const src = img.getAttribute('src');
        const content = fromServer(src);
        img.removeAttribute('srcset');
        if (content === undefined) img.removeAttribute('src');
        else img.setAttribute('src', imageSrc(src, content));
    }
    const csp = doc.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = PAGE_CSP;
    doc.head.prepend(csp);
    return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
}

// Resolves a link on a page: 'about.html' on /careers/index.html -> /careers/about.html
function resolveLink(file, href) {
    const dir = file.split('/').filter(Boolean);
    if (!file.endsWith('/')) dir.pop(); // '/careers/index.html' -> careers, '/careers/' -> careers
    const parts = href.startsWith('/') ? [] : dir;
    for (const part of href.split('/')) {
        if (part === '..') parts.pop();
        else if (part !== '.' && part !== '') parts.push(part);
    }
    return '/' + parts.join('/') + (href.endsWith('/') ? '/' : '');
}

// Links on a page are followed by the browser itself (the sandbox doesn't let the page navigate).
// Forms too: the sandbox blocks them before they even fire "submit", so Enter and submit buttons
// are caught here, and the form is sent as a GET with its fields in the query string.
function followLinks(doc, origin, file, go) {
    const send = (form) => {
        const params = new URLSearchParams();
        for (const f of form.elements) {
            if (!f.name || f.disabled || /^(submit|button|reset|file|image)$/.test(f.type)) continue;
            if (/^(checkbox|radio)$/.test(f.type) && !f.checked) continue;
            params.append(f.name, f.value);
        }
        const action = (form.getAttribute('action') || file).replace(/[?#].*$/, '');
        go(`${/^https?:\/\//i.test(action) ? action : origin + resolveLink(file, action)}?${params}`);
    };
    doc.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || !e.target.form) return;
        e.preventDefault();
        send(e.target.form);
    });
    doc.addEventListener('click', (e) => {
        const button = e.target.closest('button, input[type="submit"]');
        if (button && button.form && button.type === 'submit') {
            e.preventDefault();
            return send(button.form);
        }
        const a = e.target.closest('a[href]');
        if (!a) return;
        e.preventDefault();
        const href = a.getAttribute('href');
        if (href.startsWith('#')) return;
        go(/^https?:\/\//i.test(href) ? href : origin + resolveLink(file, href));
    });
}

// ---------- Search ----------

// Every HTML page in a web root: [path, html]. index.html is served as its folder.
function webPages(node, dir = '/') {
    const pages = [];
    for (const [name, child] of Object.entries(node)) {
        if (isDir(child)) pages.push(...webPages(child, `${dir}${name}/`));
        else if (typeof child === 'string' && /\.html?$/i.test(name)) pages.push([name === 'index.html' ? dir : dir + name, child]);
    }
    return pages;
}

// Searches every page on every website in the DNS, like a search engine that crawled them all.
// Every word must be found; a word in the title counts most, then the address, the description and the text.
// Pages players changed on the servers are searched as they are now.
function searchWeb(query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const engine = searchUrl && dns[searchUrl.split('/')[0].toLowerCase()];
    const seen = new Set([engine]); // The search engine doesn't list itself
    const results = [];
    // Shortest name first, so northbank.com wins over www.northbank.com
    for (const [name, ip] of Object.entries(dns).sort(([a], [b]) => a.length - b.length)) {
        if (seen.has(ip)) continue;
        seen.add(ip);
        const m = findMachine(ip);
        const root = m && isDir(m.fs.var) && isDir(m.fs.var.www) && m.fs.var.www.html;
        if (!isDir(root)) continue;
        for (const [path, html] of webPages(root)) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const title = doc.title.trim() || name;
            const meta = doc.querySelector('meta[name="description"]');
            const description = meta ? meta.getAttribute('content') || '' : '';
            doc.querySelectorAll('script, style, nav, header, footer').forEach(n => n.remove());
            // Text node by text node, so <b>Bleeder</b><small>Beef</small> reads "Bleeder Beef"
            const parts = [];
            const walker = doc.createTreeWalker(doc.body || doc, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
            const text = parts.join(' ').replace(/\s+/g, ' ').trim();
            const url = name + path;
            const lower = { title: title.toLowerCase(), url: url.toLowerCase(), description: description.toLowerCase(), text: text.toLowerCase() };
            let score = 0;
            for (const w of words) {
                const s = (lower.title.includes(w) ? 5 : 0) + (lower.url.includes(w) ? 3 : 0) + (lower.description.includes(w) ? 2 : 0) + (lower.text.includes(w) ? 1 : 0);
                if (!s) { score = 0; break; }
                score += s;
            }
            if (!score) continue;
            // The description, or the text around the first word found
            const at = lower.text.indexOf(words[0]);
            const start = at > 60 ? text.indexOf(' ', at - 60) + 1 : 0; // From the start of a word
            const snippet = description || (start ? '... ' : '') + text.slice(start, start + 170) + (text.length > start + 170 ? ' ...' : '');
            results.push({ score, title, url: 'http://' + url, snippet });
        }
    }
    return results.sort((a, b) => b.score - a.score);
}

// Fills in a search page before it is shown (the page can't run scripts itself):
//   [data-search]          the results, each a div.result with cite, a > h3 and p
//   [data-search-query]    the words searched for
//   [data-search-count]    "12 results"
//   input[name="q"]        keeps the words, so the player can change them
function showSearch(doc, query) {
    doc.querySelectorAll('[data-search-query]').forEach(n => { n.textContent = query; });
    doc.querySelectorAll('input[name="q"]').forEach(n => n.setAttribute('value', query));
    const boxes = doc.querySelectorAll('[data-search]');
    if (!boxes.length && !doc.querySelector('[data-search-count]')) return;
    const results = searchWeb(query);
    doc.querySelectorAll('[data-search-count]').forEach(n => { n.textContent = `${results.length} result${results.length === 1 ? '' : 's'}`; });
    const make = (tag, className, text) => {
        const n = doc.createElement(tag);
        if (className) n.className = className;
        if (text !== undefined) n.textContent = text;
        return n;
    };
    for (const box of boxes) {
        box.replaceChildren(...results.map(r => {
            const item = make('div', 'result');
            const link = make('a');
            link.setAttribute('href', r.url);
            link.append(make('h3', '', r.title));
            item.append(make('cite', '', r.url.replace(/^http:\/\//, '').replace(/\/$/, '')), link, make('p', '', r.snippet));
            return item;
        }));
        if (query && !results.length) box.append(make('p', 'no-results', `Your search - ${query} - did not match any websites.`));
    }
}

function escapeHtml(text) {
    return text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
