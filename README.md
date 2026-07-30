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
- keine Shared-Abhängigkeit, bis eine feste Version veröffentlicht wurde;
- Portal-DEV darf nur über einen dokumentierten Link oder Routingvertrag
  anbinden.

## Startdokumente

- [Produktbrief](docs/PRODUCT_BRIEF.md)
- [QA-Plan](docs/QA_PLAN.md)
- [Erkenntnisse](docs/LEARNINGS.md)

Die Umsetzung wurde am 30. Juli 2026 ausdrücklich freigegeben. Der
Eigentümer-Task beginnt mit Bestandsaufnahme, Datenquellenprüfung und einem
kleinen testbaren Plan und führt danach mehrere Verbesserungsrunden durch.

## Lokaler DEV-Stand

Der vollständig getestete lokale DEV-Build läuft fest auf Port `4315`.
Portkollisionen brechen den Start bewusst ab.

Voraussetzung: Node.js 22 oder neuer und pnpm 11.

```text
pnpm install
pnpm dev
```

- App: `http://127.0.0.1:4315`
- Readiness: `http://127.0.0.1:4315/health.json`
- Integrationsmetadaten: `http://127.0.0.1:4315/integration.json`

Der Healthcheck ist nur gültig, wenn neben HTTP 200 auch `status: ok`,
`appKey: cloud-post` und `environment: dev-build` enthalten sind.

## Qualitätsprüfung

```text
pnpm test
pnpm build
pnpm test:e2e
```

Die Browsermatrix umfasst Smartphone hoch/quer, Tablet und Desktop. Details,
Fehlerbilder und behobene Regressionen stehen in
[QA_EVIDENCE.md](docs/QA_EVIDENCE.md).

## Betrieb

Der Build ist als statische PWA ausgelegt. Zeichnung, Einstellungen und grober
letzter Startpunkt bleiben lokal. Live-Wind kommt direkt von Open‑Meteo; dessen
freier Endpoint ist nur für nichtkommerzielle Nutzung vorgesehen. Eine externe
HTTPS-DEV-URL existiert noch nicht. Production ist ausdrücklich nicht
freigegeben.

Weitere Details:

- [Architektur](docs/ARCHITECTURE.md)
- [Datenquellen und Lizenzen](docs/DATA_SOURCES_AND_LICENSES.md)
- [DEV- und Portalübergabe](docs/DEV_HANDOFF.md)
