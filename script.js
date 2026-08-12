const fallbackConfig = { scripts: [] };

async function loadConfig() {
  const res = await fetch("config.json", { cache: "no-store" });
  if (!res.ok) return fallbackConfig;
  return { ...fallbackConfig, ...(await res.json()) };
}

function parseGitHubRepo(fullLink) {
  if (!fullLink) return null;
  const match = fullLink.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\/)?$/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function readmeRawUrl(fullLink, branch = "main") {
  const parsed = parseGitHubRepo(fullLink);
  if (!parsed) return "";
  return `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch || "main"}/README.md`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderImage(image = {}) {
  const src = image.src ? escapeHtml(image.src) : "";
  const alt = escapeHtml(image.alt || "Script image");
  const objectFit = image.objectFit ? `object-fit: ${escapeHtml(image.objectFit)};` : "object-fit: contain;";
  const objectPosition = image.objectPosition ? `object-position: ${escapeHtml(image.objectPosition)};` : "object-position: center;";

  if (!src) {
    return `<div class="image-placeholder">No image</div>`;
  }

  return `
    <div class="script-image-wrap">
      <img class="script-image" src="${src}" alt="${alt}" style="${objectFit}${objectPosition}" />
    </div>
  `;
}

function renderScriptCards(scripts) {
  const host = document.getElementById("scripts-grid");

  if (!scripts?.length) {
    host.innerHTML = `<div class="empty-state">Add your scripts in <code>config.json</code> to show them here.</div>`;
    return;
  }

  host.innerHTML = scripts.map((script, index) => {
    const repoUrl = script.fullLink || "#";
    return `
      <article class="script-card">
        <div class="script-card-top">
          ${renderImage(script.image)}
        </div>
        <div class="script-card-body">
          <div class="section-heading">
            <h2>${escapeHtml(script.name || "Uden navn")}</h2>
          </div>
          <p class="script-description">${escapeHtml(script.description || "No description yet.")}</p>
          <div class="product-tags">
            ${(script.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <div class="script-meta">
            <a class="button primary" href="${repoUrl}" target="_blank" rel="noreferrer">View repository</a>
          </div>
          <div class="readme-block readme-inline">
            <div class="readme-status" data-status>Loading README…</div>
            <article class="readme" data-readme></article>
          </div>
        </div>
      </article>
    `;
  }).join("");

  scripts.forEach((script, index) => renderReadmeIntoCard(script, index));
}

async function renderReadmeIntoCard(script, index) {
  const card = document.querySelectorAll(".script-card")[index];
  if (!card) return;

  const status = card.querySelector("[data-status]");
  const content = card.querySelector("[data-readme]");
  const url = readmeRawUrl(script.fullLink, script.readmeBranch);

  if (!url) {
    status.textContent = "Add a GitHub link in config.json.";
    content.innerHTML = "";
    return;
  }

  try {
    status.textContent = "Fetching README from GitHub…";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const markdown = await res.text();
    content.innerHTML = window.marked ? marked.parse(markdown) : `<pre>${escapeHtml(markdown)}</pre>`;
    status.textContent = " ";
  } catch (error) {
    status.textContent = "Could not fetch the README. Check that the repo is public and the link is correct.";
    content.innerHTML = `<p class="muted">Technical error: ${escapeHtml(error.message)}</p>`;
  }
}

async function init() {
  const config = await loadConfig();
  renderScriptCards(config.scripts);
}

init();
