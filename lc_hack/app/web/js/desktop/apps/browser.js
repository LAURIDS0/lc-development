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
// =====================================================================

registerApp('browser', {
    open: () => openBrowser(),
    name: 'Firefox', names: { kali: 'Firefox ESR', macos: 'Safari', chromeos: 'Chrome' },
    icon: 'fa-brands fa-firefox-browser', icons: { macos: 'fa-brands fa-safari', chromeos: 'fa-brands fa-chrome' },
});

const BROWSER_HOME = 'about:home';

function openBrowser(start = BROWSER_HOME) {
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
            const page = pageFile(r.machine, file);
            if (page === undefined) return notice('404 Not Found', `The requested URL ${file} was not found on this server.`);
            showPage(r.machine, origin, file, page);
        }, r.status === 'blocked' ? 1500 : 300);
    };

    // Shows a page. Text files are shown as plain text, like a real browser.
    const showPage = (machine, origin, file, page) => {
        const frame = el('iframe', 'browser-frame');
        // No allow-scripts: nothing on the page can run. Same origin so the browser can follow its links.
        frame.setAttribute('sandbox', 'allow-same-origin');
        const isHtml = /\.html?$/i.test(file) || !/\.\w+$/.test(file); // A folder serves its index.html
        frame.srcdoc = isHtml ? lockedDown(page, machine, file) : `<pre style="white-space:pre-wrap;font:13px monospace">${escapeHtml(page)}</pre>`;
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
function lockedDown(html, machine, file) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
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

// Links on a page are followed by the browser itself (the sandbox doesn't let the page navigate)
function followLinks(doc, origin, file, go) {
    doc.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]');
        if (!a) return;
        e.preventDefault();
        const href = a.getAttribute('href');
        if (href.startsWith('#')) return;
        go(/^https?:\/\//i.test(href) ? href : origin + resolveLink(file, href));
    });
}

function escapeHtml(text) {
    return text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
