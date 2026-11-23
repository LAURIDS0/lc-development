// =====================================================================
//  LC Development docs
//  resources.json lists the scripts. A released script has its pages in
//  content/<id>.html: a <nav data-nav> for the sidebar and one <article>
//  per page. Page ids in there are relative ("config", "guides/hack",
//  "index" is the overview). Links "#/config" stay in the same script,
//  "#~/lc_phonehack" goes to another one.
//
//  URLs:  #/                      every script
//         #/lc_hack               a script's overview
//         #/lc_hack/config/dns    a page and a section on it
// =====================================================================

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let RESOURCES = [];
const PAGES = []; // { id, title, crumb, resource, article }
let current = null;
let spy = null;

// ---------- Theme (dark by default, the choice is remembered) ----------
function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $('#theme i').className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    try { localStorage.setItem('lc_docs_theme', theme); } catch { /* not kept */ }
}
setTheme(document.documentElement.dataset.theme || 'dark');
$('#theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

// ---------- Code: a tiny highlighter for lua, js and cfg ----------
const KEYWORDS = {
    lua: new Set('local function end if then else elseif return for in do while not and or nil true false require'.split(' ')),
    js: new Set('const let var function return if else for of in new true false null undefined try catch'.split(' ')),
    cfg: new Set('ensure start setr set'.split(' ')),
};
function highlight(code, lang) {
    const kw = KEYWORDS[lang] || new Set();
    const comment = lang === 'lua' ? /--[^\n]*/y : lang === 'cfg' ? /#[^\n]*/y : /\/\/[^\n]*/y;
    const rules = [[comment, 'tc'], [/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/y, 'ts'], [/\b\d+(?:\.\d+)?\b/y, 'tn'], [/[A-Za-z_]\w*/y, 'w']];
    let out = '', i = 0;
    outer: while (i < code.length) {
        for (const [re, type] of rules) {
            re.lastIndex = i;
            const m = re.exec(code);
            if (!m) continue;
            const t = m[0];
            if (type !== 'w') out += `<span class="${type}">${esc(t)}</span>`;
            else if (kw.has(t)) out += `<span class="tk">${t}</span>`;
            else if (code[i + t.length] === '(' || code[i + t.length] === ':') out += `<span class="tf">${t}</span>`;
            else out += esc(t);
            i += t.length;
            continue outer;
        }
        out += esc(code[i++]);
    }
    return out;
}

// ---------- Pages ----------

// A page id inside a script -> the full id.  ('lc_hack', 'index') -> 'lc_hack'
const fullId = (resource, rel) => (rel === 'index' ? resource.id : `${resource.id}/${rel}`);

// Link to a section on a page. The docs home has the id ''.
const sectionHref = (pageId, sectionId) => `#/${pageId ? pageId + '/' : ''}${sectionId}`;

// A link in a script's content -> a real link
function resolveHref(resource, href) {
    if (href.startsWith('#~/')) return '#/' + href.slice(3);
    const rel = href.slice(2);
    return '#/' + (rel === 'index' || rel.startsWith('index/') ? resource.id + rel.slice(5) : `${resource.id}/${rel}`);
}

// Breadcrumb, "Last updated", heading anchors, code blocks and link icons
function preparePage(article, resource) {
    const id = article.dataset.page;
    const h1 = article.querySelector('h1');
    article.hidden = true;

    if (article.dataset.crumb) {
        const crumb = document.createElement('div');
        crumb.className = 'crumb';
        crumb.innerHTML = article.dataset.crumb.split(' / ').map(esc).join('<i class="fa-solid fa-chevron-right"></i>');
        h1.before(crumb);
    }
    if (resource && resource.updated) {
        const updated = document.createElement('div');
        updated.className = 'updated';
        updated.textContent = `Last updated on ${resource.updated}`;
        h1.after(updated);
    }

    for (const h of $$('h2, h3', article)) {
        h.id = slug(h.textContent);
        const a = document.createElement('a');
        a.className = 'anchor';
        a.href = sectionHref(id, h.id);
        a.setAttribute('aria-label', 'Link to section');
        a.innerHTML = '<i class="fa-solid fa-link"></i>';
        h.append(a);
    }

    for (const pre of $$('pre', article)) {
        const raw = pre.textContent;
        pre.innerHTML = highlight(raw, pre.dataset.lang);
        const wrap = document.createElement('div');
        wrap.className = 'code';
        pre.before(wrap);
        wrap.append(pre);
        const copy = document.createElement('button');
        copy.className = 'copy';
        copy.type = 'button';
        copy.setAttribute('aria-label', 'Copy code');
        copy.innerHTML = '<i class="fa-regular fa-copy"></i>';
        copy.onclick = () => {
            const done = () => { copy.innerHTML = '<i class="fa-solid fa-check"></i>'; setTimeout(() => { copy.innerHTML = '<i class="fa-regular fa-copy"></i>'; }, 1500); };
            if (navigator.clipboard) navigator.clipboard.writeText(raw).then(done, done); else done();
        };
        wrap.append(copy);
    }

    for (const a of $$('a[target="_blank"]', article)) {
        if (!a.classList.contains('button')) a.insertAdjacentHTML('beforeend', ' <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:.7em"></i>');
    }

    PAGES.push({ id, title: h1.firstChild.textContent, crumb: article.dataset.crumb || '', resource, article });
}

const badge = (r) => (r.status === 'soon' ? '<span class="badge">Coming soon</span>' : '<span class="badge released">Released</span>');

// #/ : every script as a card
function homePage() {
    const article = document.createElement('article');
    article.dataset.page = '';
    article.innerHTML = `<h1>Documentation</h1>
        <p>Guides and references for the free FiveM scripts by LC Development. Pick a script to get started, or press <code>Ctrl K</code> to search all of them.</p>
        <div class="resources">${RESOURCES.map(r => `
            <a class="resource-card${r.status === 'soon' ? ' soon' : ''}" href="#/${r.id}">
                ${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy">` : `<div class="no-image"><i class="${esc(r.icon)}"></i></div>`}
                <div class="body"><div class="card-title">${esc(r.name)} ${badge(r)}</div><p>${esc(r.description)}</p></div>
            </a>`).join('')}
        </div>
        <h2>Getting started</h2>
        <ul>
            <li>Every script needs <a href="https://github.com/overextended/ox_lib" target="_blank" rel="noopener">ox_lib</a>.</li>
            <li>The hacking scripts build on <a href="#/lc_hack">LC Hack</a>: install it first.</li>
            <li>Found a bug or have an idea? Open an issue on the script's GitHub.</li>
        </ul>`;
    return article;
}

// A script that isn't released yet
function soonPage(r) {
    const article = document.createElement('article');
    article.dataset.page = r.id;
    article.dataset.crumb = 'Documentation';
    article.innerHTML = `<h1>${esc(r.name)}</h1>
        <p>${badge(r)}</p>
        <p>${esc(r.description)}</p>
        <div class="callout"><i class="fa-solid fa-circle-info"></i><div><p>This script isn't released yet. Its documentation shows up here when it is. Meanwhile, see <a href="#/lc_hack">LC Hack</a>, the core it builds on.</p></div></div>`;
    return article;
}

// ---------- Sidebar: every script, the open one with its pages ----------
function buildNav(resource, nav) {
    const box = document.createElement('div');
    box.className = 'side-nav';
    box.dataset.resource = resource.id;
    const add = (parent, el) => {
        if (el.matches('a[data-page]')) {
            const a = document.createElement('a');
            a.className = 'side-link';
            a.dataset.page = fullId(resource, el.dataset.page);
            a.href = '#/' + a.dataset.page;
            a.textContent = el.textContent;
            parent.append(a);
        } else if (el.matches('[data-folder]')) {
            const button = document.createElement('button');
            button.className = 'side-folder';
            button.type = 'button';
            button.innerHTML = `${esc(el.dataset.folder)} <i class="fa-solid fa-chevron-down"></i>`;
            button.onclick = () => button.classList.toggle('closed');
            const children = document.createElement('div');
            children.className = 'side-children';
            [...el.children].forEach(child => add(children, child));
            parent.append(button, children);
        }
    };
    [...nav.children].forEach(child => add(box, child));
    return box;
}

function buildSidebar() {
    const sidebar = $('#sidebar');
    sidebar.innerHTML = '<a class="side-link side-root" href="#/" data-page=""><i class="fa-solid fa-book"></i>Documentation</a><div class="side-group-title">Scripts</div>';
    for (const r of RESOURCES) {
        const link = document.createElement('a');
        link.className = 'side-resource';
        link.href = '#/' + r.id;
        link.dataset.resource = r.id;
        link.innerHTML = `<i class="${esc(r.icon)}"></i>${esc(r.name)}${r.status === 'soon' ? '<span class="badge">Soon</span>' : ''}`;
        sidebar.append(link);
        if (r.nav) sidebar.append(buildNav(r, r.nav));
    }
}

// ---------- Routing ----------
function route() {
    const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    // Longest page id that matches the start of the hash, the rest is the section
    const page = PAGES.filter(p => p.id && (hash === p.id || hash.startsWith(p.id + '/'))).sort((a, b) => b.id.length - a.id.length)[0]
        || PAGES.find(p => p.id === '');
    const anchor = page.id ? hash.slice(page.id.length + 1) : hash;
    const resource = page.resource;

    if (current !== page) {
        current = page;
        PAGES.forEach(p => { p.article.hidden = p !== page; });
        $$('.side-link').forEach(a => a.classList.toggle('active', a.dataset.page === page.id));
        $$('.side-resource').forEach(a => a.classList.toggle('active', !!resource && a.dataset.resource === resource.id));
        $$('.side-nav').forEach(n => { n.hidden = !resource || n.dataset.resource !== resource.id; });
        document.title = !resource ? 'Documentation - LC Development'
            : page.title === resource.name ? `${resource.name} | LC Development` : `${page.title} - ${resource.name} | LC Development`;
        $('#page-footer').hidden = !resource || resource.status === 'soon';
        if (resource) $('#edit').href = `https://github.com/LAURIDS0/lc-development/blob/main/docs/content/${resource.id}.html`;
        buildToc();
        buildPager(page);
        window.scrollTo(0, 0);
    }
    $('#sidebar').classList.remove('open');
    if (anchor) {
        // Look in the page itself: two pages can have a heading with the same id
        const el = page.article.querySelector(`[id="${CSS.escape(anchor)}"]`);
        if (el) el.scrollIntoView();
    }
}
window.addEventListener('hashchange', route);

// "On this page", with the section on screen highlighted
function buildToc() {
    const heads = $$('h2, h3', current.article);
    const toc = $('#toc');
    toc.innerHTML = heads.length ? '<div class="toc-title"><i class="fa-solid fa-align-left"></i>On this page</div>' : '';
    let step = 0;
    for (const h of heads) {
        const a = document.createElement('a');
        a.href = sectionHref(current.id, h.id);
        a.className = h.tagName.toLowerCase();
        a.dataset.id = h.id;
        if (h.closest('.steps')) a.innerHTML = `<span class="step">${++step}</span>`;
        a.append(h.firstChild.textContent);
        toc.append(a);
    }
    if (spy) spy.disconnect();
    spy = new IntersectionObserver((entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) $$('.toc a').forEach(a => a.classList.toggle('active', a.dataset.id === visible.target.id));
    }, { rootMargin: '-70px 0px -70% 0px' });
    heads.forEach(h => spy.observe(h));
}

// Previous / Next Page, within the same script
function buildPager(page) {
    const pages = PAGES.filter(p => p.resource && p.resource === page.resource);
    const i = pages.indexOf(page);
    const prev = pages[i - 1], next = pages[i + 1];
    $('#pager').innerHTML =
        (prev ? `<a class="card" href="#/${prev.id}"><small><i class="fa-solid fa-chevron-left"></i>Previous Page</small>${esc(prev.title)}</a>` : '') +
        (next ? `<a class="card next" href="#/${next.id}"><small>Next Page<i class="fa-solid fa-chevron-right"></i></small>${esc(next.title)}</a>` : '');
}

$('#menu').onclick = () => $('#sidebar').classList.toggle('open');

// ---------- Search (Ctrl K) over every script, page and section ----------
const searchIndex = [];
function buildSearch() {
    for (const page of PAGES) {
        if (!page.id) continue;
        let entry = { page, id: '', title: page.title, text: '' };
        searchIndex.push(entry);
        for (const el of page.article.children) {
            if (/^H[23]$/.test(el.tagName)) {
                entry = { page, id: el.id, title: el.firstChild.textContent, text: '' };
                searchIndex.push(entry);
            }
            entry.text += ' ' + el.textContent.toLowerCase();
        }
    }
}
const overlay = $('#search');
const searchInput = $('#search-input');
const results = $('#results');
let selected = 0;

function openSearch() { overlay.classList.add('open'); searchInput.value = ''; renderResults(); searchInput.focus(); }
function closeSearch() { overlay.classList.remove('open'); }
function renderResults() {
    const q = searchInput.value.trim().toLowerCase();
    const hits = (q ? searchIndex
        .map(e => ({ e, score: (e.title.toLowerCase().includes(q) ? 2 : 0) + (e.text.includes(q) ? 1 : 0) }))
        .filter(h => h.score).sort((a, b) => b.score - a.score).map(h => h.e)
        : searchIndex.filter(e => !e.id)).slice(0, 12);
    selected = 0;
    results.innerHTML = hits.length
        ? hits.map((e, i) => {
            const where = e.page.crumb ? `${e.page.crumb} / ${e.page.title}` : e.page.title;
            return `<a class="result${i === 0 ? ' active' : ''}" href="#/${e.page.id}${e.id ? '/' + e.id : ''}"><i class="fa-solid ${e.id ? 'fa-hashtag' : 'fa-file-lines'}"></i><span>${esc(e.title)}<small>${esc(where)}</small></span></a>`;
        }).join('')
        : '<div class="result-empty">No results found.</div>';
}
$('#search-open').onclick = openSearch;
searchInput.addEventListener('input', renderResults);
searchInput.addEventListener('keydown', (e) => {
    const items = $$('.result', results);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!items.length) return;
        selected = (selected + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((a, i) => a.classList.toggle('active', i === selected));
        items[selected].scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter' && items[selected]) { location.hash = items[selected].getAttribute('href'); closeSearch(); }
});
results.addEventListener('click', closeSearch);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSearch(); });
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') closeSearch();
});

// ---------- Load everything ----------
async function load() {
    RESOURCES = await (await fetch('resources.json', { cache: 'no-cache' })).json();
    // Every script's content at once, kept in the order of resources.json
    const contents = await Promise.all(RESOURCES.map(r => (r.status === 'soon'
        ? null
        : fetch(`content/${r.id}.html`, { cache: 'no-cache' }).then(res => (res.ok ? res.text() : null)).catch(() => null))));

    const pages = $('#pages');
    const home = homePage();
    pages.append(home);
    preparePage(home, null);

    RESOURCES.forEach((r, i) => {
        if (!contents[i]) {
            const page = soonPage(r);
            pages.append(page);
            preparePage(page, r);
            return;
        }
        const template = document.createElement('template');
        template.innerHTML = contents[i];
        r.nav = template.content.querySelector('[data-nav]');
        for (const article of template.content.querySelectorAll('article')) {
            article.dataset.page = fullId(r, article.dataset.page);
            for (const a of article.querySelectorAll('a[href^="#/"], a[href^="#~/"]')) a.setAttribute('href', resolveHref(r, a.getAttribute('href')));
            pages.append(article);
            preparePage(article, r);
        }
    });

    buildSidebar();
    buildSearch();
    route();
}
load();
