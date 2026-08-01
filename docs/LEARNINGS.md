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

## 2026-07-30 – Statisches Unterpfad-Hosting ist ein Gesamtvertrag

- Datum und geprüfter Stand: 30. Juli 2026, öffentlicher GitHub-Pages-DEV.
- Beobachtung: Ein Vite-Basispfad allein korrigiert nicht automatisch
  Integrationsmetadaten, PWA-Scope, Service Worker, Vorschaubild oder
  E2E-URL-Annahmen. Eine absolute `/`-Erwartung im Exporttest war auf einem
  Projekt-Unterpfad falsch.
- Evidenz oder reproduzierbarer Test: öffentlicher Matrixlauf gegen
  `https://drmilos33.github.io/MilosApps-Wolkenpost/`, Artefaktprüfung sowie
  fokussierter Export-Regressionslauf.
- Änderung und Regressionstest: ein fester Hosting-Basispfad für Build,
  Manifest und Service Worker; vollständige absolute Integrations-URLs;
  Navigationstests relativ zur konfigurierten Basis; Artefaktprüfung aller
  externen Metadaten.
- Für andere MilosApps relevant: Ja. Unterpfad-Hosting muss als Vertrag über
  Runtime, PWA, Metadaten und Tests behandelt werden.

## 2026-07-30 – Paketmanager-Cache erst nach Aktivierung prüfen

- Datum und geprüfter Stand: 30. Juli 2026, erster GitHub-Actions-CI-Lauf.
- Beobachtung: `setup-node` mit `cache: pnpm` versucht `pnpm` bereits während
  seines eigenen Schritts aufzurufen. Wenn Corepack erst danach aktiviert wird,
  scheitert CI vor der Installation.
- Evidenz oder reproduzierbarer Test: fehlgeschlagener Workflow mit
  `Unable to locate executable file: pnpm`, anschließend grüner Wiederholung
  nach explizitem Corepack-Schritt und Installation aus dem Lockfile.
- Änderung und Regressionstest: Cache-Kopplung entfernt, Corepack zuerst
  aktiviert und `pnpm install --frozen-lockfile` als eigener Schritt
  ausgeführt.
- Für andere MilosApps relevant: Ja, für Actions-Setups ohne vorinstalliertes
  pnpm.

## 2026-08-01 – Ein Locale-Event allein initialisiert eine App nicht sicher

- Datum und geprüfter Stand: 1. August 2026,
  `public-app-shell/v2.0.3`-Integration.
- Beobachtung: Eine Shell kann ihr initiales `milosapps:localechange` senden,
  bevor das Fachmodul seinen Listener registriert. Dann wäre die persistierte
  Sprache in der Shell sichtbar, die App aber noch in der Fallbacksprache.
- Evidenz oder reproduzierbarer Test: Sprachwechsel auf Englisch,
  Seiten-Reload und Prüfung von `html[lang]`, Shell-Schalter, H1, Fachlabels
  und `milosapps.cloud-post.language`.
- Änderung und Regressionstest: Das Fachmodul hört weiter auf das Event,
  initialisiert aber zusätzlich aus `document.documentElement.lang`.
- Für andere MilosApps relevant: Ja. Persistenzbesitzer und Fachmodul brauchen
  neben dem Änderungsereignis einen synchron lesbaren Initialzustand.

## 2026-08-01 – Kein Scrollbalken beweist noch keinen gelungenen Reflow

- Datum und geprüfter Stand: 1. August 2026, visuelle Shell-QA bei
  360 × 800 und 200 % Zoom.
- Beobachtung: `documentElement.scrollWidth <= clientWidth` war erfüllt,
  obwohl lange app-eigene Überschriften in einem `overflow: hidden`-Container
  rechts abgeschnitten wurden.
- Evidenz oder reproduzierbarer Test: Vollseitenscreenshot bei 180 × 400
  CSS-Pixeln sowie Prüfung der `scrollWidth` sichtbarer Texte und
  Bedienelemente.
- Änderung und Regressionstest: App-eigene Typografie, Kartenpadding und
  Umbruchverhalten reflowen unter 240 CSS-Pixeln. Der Test verbindet
  Dokumentbreite, Element-Clipping und visuelle Evidenz; die Shared-Shell
  erhielt keinen lokalen Min-Width-Workaround.
- Für andere MilosApps relevant: Ja. Reflow-QA braucht neben globaler Breite
  mindestens eine visuelle oder elementbezogene Clipping-Prüfung.

## 2026-08-01 – Vendoring wird erst durch Lock und CI reproduzierbar

- Datum und geprüfter Stand: 1. August 2026, Shared-Commit
  `ed898412306e22c6ae1b10ee8953df29f8acd627`.
- Beobachtung: Ein kopiertes Web Component ist ohne Quellcommit und
  Artefakthashes nicht eindeutig auf einen veröffentlichten Vertrag
  zurückführbar.
- Evidenz oder reproduzierbarer Test: `pnpm verify:shell` prüft Manifest,
  Einstiegspunkt, Vendorpfad, Shared-Commit und SHA-256; CI und DEV-Workflow
  führen den Validator vor dem Build aus.
- Änderung und Regressionstest: `milos-app.json`, vendorte Dateien und
  `shell-lock.json` werden gemeinsam eingecheckt; kein CDN oder Runtimeimport.
- Für andere MilosApps relevant: Ja. Gepinnte Shared-Verträge müssen in jedem
  Verbraucher lokal und in dessen eigenem Lifecycle verifizierbar sein.

## 2026-08-01 – Ein Bundler kann CSP-sichere Quelldateien wieder inline machen

- Datum und geprüfter Stand: 1. August 2026,
  `public-app-shell/v2.0.3` unter strikter Preview-CSP.
- Beobachtung: Obwohl die Shared-Quelle eine externe Theme-CSS referenzierte,
  wandelte Vite die kleine Datei beim HTML-Modulbuild in eine `data:`-URL um.
  `style-src 'self'` blockierte sie; das Top-Level-Await im Bootstrap stoppte
  die Shell-Registrierung sichtbar vor dem Upgrade des Custom Elements.
- Evidenz oder reproduzierbarer Test: Preview-Antwort mit
  `default-src 'self'; script-src 'self'; style-src 'self'`, Prüfung auf null
  `securitypolicyviolation`-Events und Kontrolle der beiden externen CSS-URLs.
- Änderung und Regressionstest: Der vendorte Bootstrap bleibt eine
  `vite-ignore`-Runtimegrenze. Ein Build-Plugin kopiert vier feste
  Same-Origin-Dateien; die Artefaktprüfung vergleicht deren SHA-256 erneut mit
  dem Lock und der Service Worker cached alle Pfade.
- Für andere MilosApps relevant: Ja. CSP-Eignung muss am gebauten Artefakt und
  nicht nur an den Quelldateien geprüft werden.

## 2026-08-01 – Kompaktheit braucht messbare semantische Bezugspunkte

- Datum und geprüfter Stand: 1. August 2026,
  `public-app-layout/v1.0.0`-Pilot.
- Beobachtung: Ein sichtbar verkleinerter Hero verfehlte das Dichteziel noch:
  Das Intro maß 372 px am Desktop und 346 px mobil, obwohl die Primärarbeit
  subjektiv bereits näher wirkte.
- Evidenz oder reproduzierbarer Test: Browsermessung von
  `[data-milos-intro]` und der Oberkante von `[data-milos-primary-work]` bei
  1440 × 900 und 390 × 844; Vollseitenscreenshots in zwei QA-Runden.
- Änderung und Regressionstest: kürzere Statuszeile, kleinere unterstützende
  Dekoration, ausgewogene Titelbreite und flache gemeinsame Arbeitsfläche.
  Der finale Gate misst 273,61/374,61 px am Desktop und 260,11/397,48 px mobil.
- Für andere MilosApps relevant: Ja. Dichtebudgets brauchen stabile
  semantische Marker; reine Screenshothöhe oder Bauchgefühl reichen nicht.

## 2026-08-01 – Shadow-DOM-Kontrast braucht einen zweiten Messweg

- Datum und geprüfter Stand: 1. August 2026, Dark-Mode-Regression der
  vendorten `public-app-shell/v2.0.3`.
- Beobachtung: Axe setzte transparente Textknoten in Shadow DOM unter
  `color-mix()` gegen eine rechnerische Zwischenfarbe und meldete 3,25:1,
  obwohl die finalen berechneten Control-Farben deutlich kontrastreicher waren.
- Evidenz oder reproduzierbarer Test: derselbe Dark-Mode-Browserlauf vergleicht
  Axe für `.app-content` und die finalen `getComputedStyle`-Farben jedes
  sichtbaren Shell-Controls per WCAG-Luminanzformel.
- Änderung und Regressionstest: Fachinhalt bleibt vollständig unter Axe;
  Shell-Controls erhalten eine getrennte Mindestprüfung von 4,5:1. Ein
  zwischenzeitlicher heller Shell-Hintergrund wurde verworfen, weil die Shell
  zugleich den Seitenhintergrund des geslotteten App-Inhalts besitzt.
- Für andere MilosApps relevant: Ja. Automatisierte Shadow-DOM-Kontrastbefunde
  sollten mit finalen Browserfarben verifiziert, nicht blind ausgeblendet oder
  durch visuell falsche Theme-Ausnahmen kaschiert werden.
