const fallbackConfig = {
  owner: "",
  repo: "",
  readmeBranch: "main",
  projects: []
};

async function loadConfig() {
  const res = await fetch("config.json", { cache: "no-store" });
  if (!res.ok) return fallbackConfig;
  return { ...fallbackConfig, ...(await res.json()) };
}

function readmeRawUrl({ owner, repo, readmeBranch }) {
  if (!owner || !repo) return "";
  return `https://raw.githubusercontent.com/${owner}/${repo}/${readmeBranch || "main"}/README.md`;
}

function renderProjects(projects) {
  const grid = document.getElementById("projects-grid");
  if (!projects?.length) {
    grid.innerHTML = `<div class="muted">Ingen gratis projekter er tilføjet endnu. Du kan udfylde <code>config.json</code>.</div>`;
    return;
  }

  grid.innerHTML = projects.map(project => `
    <article class="project-card">
      <h3>${project.name || "Uden navn"}</h3>
      <p>${project.description || "Ingen beskrivelse endnu."}</p>
      ${project.url ? `<a href="${project.url}" target="_blank" rel="noreferrer">Åbn projekt</a>` : ""}
    </article>
  `).join("");
}

async function renderReadme(config) {
  const status = document.getElementById("readme-status");
  const content = document.getElementById("readme-content");
  const url = config.readmeUrl || readmeRawUrl(config);

  if (!url) {
    status.textContent = "Tilføj owner/repo eller readmeUrl i config.json for at vise README.";
    content.innerHTML = "";
    return;
  }

  try {
    status.textContent = "Henter README fra GitHub…";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const markdown = await res.text();
    content.innerHTML = window.marked ? marked.parse(markdown) : `<pre>${markdown}</pre>`;
    status.textContent = `README indlæst fra ${url}`;
  } catch (error) {
    status.textContent = "Kunne ikke hente README. Tjek linket i config.json og om repoet er offentligt.";
    content.innerHTML = `<p class="muted">Teknisk fejl: ${error.message}</p>`;
  }
}

async function init() {
  const config = await loadConfig();
  renderProjects(config.projects);
  await renderReadme(config);
}

init();
