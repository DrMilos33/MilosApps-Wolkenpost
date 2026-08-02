# Wolkenpost

Eigenständige öffentliche MilosApps-Web-App mit dem App-Key `cloud-post`.

Nutzer zeichnen eine Wolke, einen Ballon, einen Samen oder einen Papierflieger.
Reale Winddaten tragen das Objekt anschließend durch eine eigene animierte
Weltkarte. Das Ergebnis ist eine persönliche Route, kein fremdes Video- oder
Kartenportal.

## Feste Grenzen

- kein Konto und keine App-Datenbank;
- lokale Speicherung persönlicher Eingaben;
- eigener DEV- und später eigener Production-Lifecycle;
- Production ist nicht freigegeben;
- `public-app-shell/v2.0.3` wird aus dem festen Shared-Commit
  `ed898412306e22c6ae1b10ee8953df29f8acd627` lokal vendort und per
  SHA-256-Lock geprüft; kein CDN und kein Shared-Runtimeimport;
- `public-app-layout/v1.1.0` wird getrennt aus Shared-Commit
  `55b649d997489ca703682679257ac1a5b790bdc7` mit Profil `guided-flow`
  lokal vendort und über einen eigenen Drei-Artefakt-Lock geprüft;
- `public-app-essentials/v1.0.0` wird aus Shared-Commit
  `b09e09008ff05fe87f05bc647a7c4964ff13e6f6` lokal vendort. Wolkenpost
  aktiviert den kompakten Startscreen, den wahrheitsgemäßen Datenschutzhinweis,
  Teilen und die explizite Ortssuche; Datumseingabe bleibt deaktiviert;
- Portal-DEV darf nur über einen dokumentierten Link oder Routingvertrag
  anbinden.

## Startdokumente

- [Produktbrief](docs/PRODUCT_BRIEF.md)
- [QA-Plan](docs/QA_PLAN.md)
- [Erkenntnisse](docs/LEARNINGS.md)

Die Umsetzung wurde am 30. Juli 2026 ausdrücklich freigegeben. Der
Eigentümer-Task beginnt mit Bestandsaufnahme, Datenquellenprüfung und einem
kleinen testbaren Plan und führt danach mehrere Verbesserungsrunden durch.

## DEV-Stand

Die unabhängige öffentliche DEV-Version läuft ohne Anmeldung unter:

- App: <https://drmilos33.github.io/MilosApps-Wolkenpost/>
- Readiness: <https://drmilos33.github.io/MilosApps-Wolkenpost/health.json>
- Integrationsmetadaten:
  <https://drmilos33.github.io/MilosApps-Wolkenpost/integration.json>
- Quellrepository: <https://github.com/DrMilos33/MilosApps-Wolkenpost>

Jeder Commit auf `main` durchläuft den app-eigenen GitHub-Actions-Workflow,
welcher Tests und Build ausführt, die exakte Commit-ID in das Artefakt schreibt,
dessen App-Identität prüft und ausschließlich den GitHub-Pages-DEV-Dienst
aktualisiert. Der öffentliche Healthcheck ist nur gültig, wenn neben HTTP 200
auch `status: ok`, `appKey: cloud-post`, `environment: dev-build`,
`productionApproved: false` und eine vollständige `deploymentRevision`
enthalten sind.

Der lokale DEV-Build läuft fest auf Port `4315`. Portkollisionen brechen den
Start bewusst ab.

Voraussetzung: Node.js 22 oder neuer und pnpm 11.

```text
pnpm install
pnpm dev
```

- App: `http://127.0.0.1:4315`
- Readiness: `http://127.0.0.1:4315/health.json`
- Integrationsmetadaten: `http://127.0.0.1:4315/integration.json`

Der lokale Healthcheck prüft dieselbe App-Identität; seine noch nicht gestempelte
Quelldatei hat `deploymentRevision: null`.

## Qualitätsprüfung

```text
pnpm verify:shell
pnpm verify:layout
pnpm verify:essentials
pnpm test
pnpm build
pnpm build:dev-hosting
pnpm verify:dev-artifact
pnpm test:e2e
```

Die Browsermatrix umfasst Smartphone hoch/quer, Tablet und Desktop sowie
390 × 844 und den 360 × 800@200-%-Reflowfall. Die vollständige sichtbare
Oberfläche ist auf Deutsch und Englisch verfügbar; die Shell speichert die
Sprachwahl lokal. Details, Fehlerbilder und behobene Regressionen stehen in
[QA_EVIDENCE.md](docs/QA_EVIDENCE.md).

## Betrieb

Der Build ist als statische PWA ausgelegt. Zeichnung, Einstellungen und grober
letzter Startpunkt bleiben lokal. Live-Wind kommt direkt von Open‑Meteo; dessen
freier Endpoint ist nur für nichtkommerzielle Nutzung vorgesehen. GitHub Pages
ist ausschließlich der unabhängige öffentliche DEV-Dienst. Production ist
ausdrücklich nicht freigegeben und wird vom Artefakt mit
`productionApproved: false` ausgewiesen.

Weitere Details:

- [Architektur](docs/ARCHITECTURE.md)
- [Datenquellen und Lizenzen](docs/DATA_SOURCES_AND_LICENSES.md)
- [DEV- und Portalübergabe](docs/DEV_HANDOFF.md)
