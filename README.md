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
- `styles.css` — det, kun forsiden bruger. Resten af designet (farver, header, knapper, tema) kommer fra `docs/docs.css`, så forsiden og docs altid ser ens ud
- `script.js` — henter `config.json`, viser scripts som kort og åbner README'en fra GitHub i et vindue
- `config.json` — din redigerbare konfiguration

## Docs (lc-development.com/docs)

Dokumentationen til alle scripts ligger i `docs/`:

- `docs/resources.json` — listen over scripts (navn, ikon, beskrivelse, billede, GitHub, status og "Last updated")
- `docs/content/<id>.html` — siderne for ét script: en `<nav data-nav>` til sidebaren og en `<article data-page="...">` per side
- `docs/images/<id>/` — billeder til scriptets sider
- `docs/index.html`, `docs/docs.css`, `docs/docs.js` — selve docs-siden (søgning, sidebar, tema, forrige/næste)

### Tilføj et nyt script

1. Tilføj det i `docs/resources.json` med `"status": "soon"` — så vises det som "Coming soon".
2. Når det udgives: lav `docs/content/<id>.html` (kopiér `lc_phonehack.html` som skabelon) og sæt `"status": "released"`.
3. Læg billeder i `docs/images/<id>/`, og tilføj `"docs": "docs/#/<id>"` til scriptet i `config.json`, så forsiden linker til docs.

Links i en content-fil: `#/config` går til en side i samme script, `#~/lc_hack/...` går til et andet script. Siden med id `index` er scriptets forside.

Test lokalt med `python3 -m http.server 8000` i repoet og åbn `http://localhost:8000/docs/`.

## Prøv LC Hack (`lc_hack/`)

`lc_hack/index.html` kører lc_hack's egen browser-testtilstand i en iframe. `lc_hack/app/` er en kopi af lc_hack; opdatér den efter ændringer i lc_hack med `sh lc_hack/sync.sh`. Egne scenarier ligger i `lc_hack/scenarios/`.
