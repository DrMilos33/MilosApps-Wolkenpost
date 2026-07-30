# Wolkenpost-Erkenntnisse

Hier dokumentiert der Eigentümer-Task reproduzierbare Produkt-, Daten-,
Interaktions- und Betriebskenntnisse.

## Eintragsformat

- Datum und geprüfter Stand:
- Beobachtung:
- Evidenz oder reproduzierbarer Test:
- Änderung und Regressionstest:
- Für andere MilosApps relevant:

Allgemein relevante Erkenntnisse werden zusätzlich an
`MilosApps – Struktur & Architektur` und `MilosApps – Ideen & Portfolio`
gemeldet. Zugangsdaten und Nutzerdaten gehören nicht in diese Datei.

## 2026-07-30 – Readiness benötigt App-Identität

- Datum und geprüfter Stand: 30. Juli 2026, lokaler E2E-Build auf Port 4315.
- Beobachtung: Ein fremder App-Server auf einem generischen Vite-Port konnte
  durch HTTP 200 als Wolkenpost-Readiness erscheinen.
- Evidenz oder reproduzierbarer Test: Playwright-Webserverstart bei belegtem
  Port sowie `tests/e2e/global-setup.ts`.
- Änderung und Regressionstest: eigener Port, `--strictPort`,
  `reuseExistingServer: false` und Prüfung von Status, `cloud-post` und
  `dev-build`.
- Für andere MilosApps relevant: Ja. Ein Statuscode oder generischer
  Health-Pfad beweist keine Dienstidentität.

## 2026-07-30 – Offline-Fallback nur für Navigation

- Datum und geprüfter Stand: 30. Juli 2026, QA-Runde 3.
- Beobachtung: Ein pauschaler `index.html`-Fallback lieferte für ein fehlendes
  JavaScript-Modul HTML; der Browser verweigerte das Modul wegen MIME-Typ.
- Evidenz oder reproduzierbarer Test:
  `loads the app shell again while offline after service worker installation`.
- Änderung und Regressionstest: Assets werden per exaktem Pfad aus einem
  pro Build versionierten Cache gelesen. Nur `navigate` darf auf `index.html`
  fallen.
- Für andere MilosApps relevant: Ja. SPA-Navigation und Assetfehler benötigen
  unterschiedliche Offlineantworten.

## 2026-07-30 – Pointer Capture kann trotz Pointerdown scheitern

- Datum und geprüfter Stand: 30. Juli 2026, Eingabe-Stresstest.
- Beobachtung: Synthetische oder zwischenzeitlich freigegebene Pointer können
  bei `setPointerCapture` einen `NotFoundError` auslösen.
- Evidenz oder reproduzierbarer Test: kurzer, langer und selbstschneidender
  Strich mit synthetischen Pointerfolgen und Konsolenfehlerprüfung.
- Änderung und Regressionstest: Capture/Release defensiv abfangen,
  Strichzustand zusätzlich strikt an `pointerId` binden und `pointercancel`
  separat behandeln.
- Für andere MilosApps relevant: Ja, für Touch-, Drag- und Zeichenoberflächen.

## 2026-07-30 – Browser-Onlineanzeige ist keine Erreichbarkeitsgarantie

- Datum und geprüfter Stand: 30. Juli 2026, Offline-Reload.
- Beobachtung: `navigator.onLine` kann auch ohne tatsächlich erreichbaren
  Fachservice `true` sein.
- Evidenz oder reproduzierbarer Test: Playwright Offline-Kontext vor und nach
  Service-Worker-Reload.
- Änderung und Regressionstest: neutraler Status `bereit`, `offline` nur nach
  Browsersignal; der tatsächliche Fachabruf zeigt getrennte Offline-, Timeout-
  und Netzwerkfehler.
- Für andere MilosApps relevant: Ja. `online` sollte nicht als belegte
  Backend-Erreichbarkeit formuliert werden.

## 2026-07-30 – Freier Wetterendpoint ist keine automatische Production-Lizenz

- Datum und geprüfter Stand: 30. Juli 2026, Open‑Meteo Terms.
- Beobachtung: Die Daten sind CC BY 4.0, aber der freie API-Betrieb ist nur
  nichtkommerziell erlaubt und hat Quoten.
- Evidenz oder reproduzierbarer Test:
  <https://open-meteo.com/en/terms> und sichtbare Attribution im App-Footer.
- Änderung und Regressionstest: DEV nichtkommerziell, Attribution sichtbar,
  Production-Prüfung als verbindlicher Blocker dokumentiert.
- Für andere MilosApps relevant: Ja. Datenlizenz und API-Betriebsrecht sind
  getrennt zu prüfen.
