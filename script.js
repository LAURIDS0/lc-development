// =====================================================================
//  lc-development.com front page
//  Shows the scripts from config.json as cards. A card's README is
//  fetched from GitHub when it is opened.
//
//  A script in config.json:
//    fullLink      the GitHub repository
//    name, description, tags
//    readmeBranch  the branch with the README (default main)
//    docs          optional link to its documentation, e.g. "docs/#/lc_hack"
//    image         { src, alt, objectFit, objectPosition }
// =====================================================================

const $ = (s, r = document) => r.querySelector(s);

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// https://github.com/owner/repo -> the raw README on that branch
function readmeUrl(script) {
    const match = (script.fullLink || '').match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/i);
    return match ? `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${script.readmeBranch || 'main'}/README.md` : '';
}

// ---------- Theme: shared with the docs ----------
function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $('#theme i').className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    try { localStorage.setItem('lc_docs_theme', theme); } catch { /* not kept */ }
}
setTheme(document.documentElement.dataset.theme || 'dark');
$('#theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

// ---------- Cards ----------
function renderImage(image = {}) {
    if (!image.src) return '<div class="script-image empty"><i class="fa-solid fa-cube"></i></div>';
    const style = `object-fit: ${escapeHtml(image.objectFit || 'cover')}; object-position: ${escapeHtml(image.objectPosition || 'center')};`;
    return `<img class="script-image" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || '')}" style="${style}" loading="lazy">`;
}

function renderScripts(scripts) {
    const grid = $('#scripts-grid');
    $('#count').textContent = scripts.length ? `${scripts.length} free` : '';
    if (!scripts.length) {
        grid.innerHTML = '<div class="empty-state">Add your scripts in <code>config.json</code> to show them here.</div>';
        return;
    }
    grid.innerHTML = scripts.map((script, i) => `
        <article class="script-card">
            ${renderImage(script.image)}
            <div class="script-body">
                <div class="script-title">${escapeHtml(script.name || 'Untitled')}</div>
                <p>${escapeHtml(script.description || 'No description yet.')}</p>
                <div class="tags">${(script.tags || []).map(tag => `<span class="badge">${escapeHtml(tag)}</span>`).join('')}</div>
                <div class="actions">
                    ${script.docs ? `<a class="button primary" href="${escapeHtml(script.docs)}"><i class="fa-solid fa-book"></i>Docs</a>` : ''}
                    <button class="button" type="button" data-readme="${i}"><i class="fa-regular fa-file-lines"></i>README</button>
                    <a class="button" href="${escapeHtml(script.fullLink || '#')}" target="_blank" rel="noopener"><i class="fa-brands fa-github"></i>Repository</a>
                </div>
            </div>
        </article>`).join('');
    grid.querySelectorAll('[data-readme]').forEach(button => {
        button.onclick = () => openReadme(scripts[Number(button.dataset.readme)]);
    });
}

// ---------- README dialog ----------
const overlay = $('#readme');
const body = $('#readme-body');
let opened = null;

async function openReadme(script) {
    opened = script;
    $('#readme-title').textContent = script.name || 'README';
    $('#readme-repo').href = script.fullLink || '#';
    body.innerHTML = '<div class="readme-status">Fetching the README from GitHub...</div>';
    overlay.classList.add('open');
    body.scrollTop = 0;

    const url = readmeUrl(script);
    try {
        if (!url) throw new Error('no GitHub link in config.json');
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const markdown = await res.text();
        if (opened !== script) return; // Another README was opened meanwhile
        body.innerHTML = window.marked ? marked.parse(markdown) : `<pre>${escapeHtml(markdown)}</pre>`;
    } catch (error) {
        if (opened === script) body.innerHTML = `<div class="readme-status">Could not fetch the README (${escapeHtml(error.message)}). Open the repository instead.</div>`;
    }
}

function closeReadme() {
    overlay.classList.remove('open');
    opened = null;
}
$('#readme-close').onclick = closeReadme;
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeReadme(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeReadme(); });

// ---------- Start ----------
fetch('config.json', { cache: 'no-cache' })
    .then(res => (res.ok ? res.json() : { scripts: [] }))
    .catch(() => ({ scripts: [] }))
    .then(config => renderScripts(config.scripts || []));
