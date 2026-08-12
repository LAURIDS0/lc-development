# lc-development

En enkel hjemmeside til lc-development.com med:

- en forside, der forklarer hvad du laver
- en liste over dine gratis GitHub-projekter
- en config-fil, som kan pege på et GitHub repo og vise README'en direkte på siden

## Sådan bruger du den

Redigér `config.json` og udfyld:

- `owner` med dit GitHub-brugernavn
- `repo` med navnet på repoet
- `readmeBranch` hvis dit repo ikke bruger `main`
- `projects` med dine gratis projekter og links

Hvis du vil pege direkte på en README uden at bruge `owner` og `repo`, kan du sætte `readmeUrl` i `config.json`.

## Filstruktur

- `index.html` — selve siden
- `styles.css` — design og layout
- `script.js` — henter config og renderer README/projekter
- `config.json` — din redigerbare konfiguration
