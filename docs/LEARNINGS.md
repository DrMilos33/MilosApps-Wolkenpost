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

## 2026-08-02 – Kompakte Settings brauchen zwei verschiedene Reflowgrenzen

- Datum und geprüfter Stand: 2. August 2026,
  `public-app-layout/v1.1.0` auf Shared-Commit
  `55b649d997489ca703682679257ac1a5b790bdc7`.
- Beobachtung: Horizontal angeordnete Label-/Select-Zeilen senkten die offene
  Settings-Höhe bei 390 px von 412 auf 339 px. Dieselbe Mindestspalte war im
  200-Prozent-Fall aber 132 px breit und damit 8 px größer als ihr
  124-px-Inhaltsbereich.
- Evidenz oder reproduzierbarer Test: `visual-contract.spec.ts` misst offene
  Einstellungen, Rootbreite und jedes sichtbare Textelement bei 1440 × 900,
  390 × 844 sowie 180 × 400 CSS-Pixeln.
- Änderung und Regressionstest: Normale Mobilbreiten verwenden kompakte
  horizontale Settings-Zeilen mit unveränderten 44-Pixel-Controls; erst unter
  240 CSS-Pixeln reflowen die Select-Zeilen wieder einspaltig. Die finale
  Matrix hat keinen Overflow oder Clippingbefund.
- Für andere MilosApps relevant: Ja. Ein mobiles Höhenbudget und extremer
  Textzoom sind unterschiedliche Grenzen; eine einzige Spaltenregel optimiert
  nicht automatisch beide.

## 2026-08-02 – Dichtebudgets müssen die längste Sprache abdecken

- Datum und geprüfter Stand: 2. August 2026, enger Wolkenpost-Folgepatch auf
  `public-app-layout/v1.1.0`.
- Beobachtung: Der englische 390-px-Fall erfüllte das 220-px-Introbudget, während
  Deutsch bei 375 px wegen einer umbrechenden Metazeile 253,59 px erreichte.
  Overflowtests allein meldeten keinen Fehler.
- Evidenz oder reproduzierbarer Test: `visual-contract.spec.ts` misst nun DE bei
  375 und 390 px sowie EN bei 390 px und prüft Clientbreite, Scrollbreite,
  Introhöhe und Oberkante der Primärarbeit.
- Änderung und Regressionstest: Die redundante Metazeile wurde sprachlich
  gekürzt, ebenso der Lead bei unveränderter Datenschutz-/Modellwahrheit. Die
  neuen DE-Werte liegen bei 206,30/343,67 px (375) und 184,53/321,91 px (390).
- Für andere MilosApps relevant: Ja. Das Dichtegate einer lokalisierten
  Oberfläche muss mindestens die längste unterstützte Sprache in jeder
  kritischen Breite messen; ein kürzerer Sprachfall plus Overflowcheck genügt
  nicht.

## 2026-08-02 – Ready-Events brauchen einen registrierten Empfänger

- Datum und geprüfter Stand: 2. August 2026,
  `public-app-essentials/v1.0.0`-Integration.
- Beobachtung: Separate Module werden nicht zuverlässig in der Reihenfolge
  ihrer abgeschlossenen Netz- und Abhängigkeitsauswertung bereit. React konnte
  `milosapps:ready` senden, bevor der vendorte Bootstrap den Listener anlegte;
  die fertige App blieb dann unter dem Loader blockiert.
- Evidenz oder reproduzierbarer Test: Der Browser verzögert gezielt nur
  `vendor/milosapps-essentials/v1/bootstrap.js`, lässt die App rendern und
  prüft den Übergang nach Freigabe des Bootstrap.
- Änderung und Regressionstest: Der App-Effekt wartet auf die Registrierung
  eines benötigten Essentials-Custom-Elements und sendet erst danach Ready.
  Fehlende Runtime bleibt dadurch ein ehrlicher Ladefehler statt eines
  versteckten Timeouts.
- Für andere MilosApps relevant: Ja. Ein einmaliges Event ist nur dann ein
  sicherer Readiness-Handshake, wenn der Empfänger nachweislich registriert ist.

## 2026-08-02 – Shared-Ortssuche darf die Datenquelle nicht heimlich erweitern

- Datum und geprüfter Stand: 2. August 2026, Essentials-Ortssuche.
- Beobachtung: Eine gemeinsame Suchoberfläche benötigt ein normalisiertes
  Ergebnisformat, aber nicht automatisch einen externen Geocoder.
- Evidenz oder reproduzierbarer Test: Explizite Suche nach Stadt und Region in
  DE/EN, Ergebnis Name/Region/Land und Netzwerkprüfung ohne zusätzlichen
  Provideraufruf.
- Änderung und Regressionstest: Die handkuratierte app-eigene Liste liefert
  lokal normalisierte Ergebnisse. Geolocation bleibt ein getrennter,
  nutzerinitiierter Weg; die Wind- und Datenschutzgrenzen ändern sich nicht.
- Für andere MilosApps relevant: Ja. Gemeinsame UI und gemeinsamer Datendienst
  sind getrennte Architekturentscheidungen mit eigener Lizenz-/Privacyfolge.

## 2026-08-02 – Externe CSS-Grenzen müssen im Build geprüft werden

- Datum und geprüfter Stand: 2. August 2026, Essentials-Pages-Artefakt.
- Beobachtung: Ein externer Stylesheet-Link in der Quelle beweist nicht, dass
  ein Bundler ihn im ausgelieferten HTML beibehält. Ebenso kann ein Loadertext
  unbeabsichtigt eine zweite H1 erzeugen.
- Evidenz oder reproduzierbarer Test: `verify-dev-artifact.mjs` liest das
  gebaute HTML, prüft beide CSS-Links, vier Runtimehashes, Service-Worker-Pfade,
  MIME im Browser und lehnt `data:`-Inlining sowie H1–H6 am Loader ab.
- Änderung und Regressionstest: Beide CSS-Dateien bleiben feste
  Same-Origin-Ressourcen; `data-milos-loading-title` ist ein `<p>`.
- Für andere MilosApps relevant: Ja. CSP- und Dokumentstrukturverträge gehören
  als fail-closed Prüfung ins fertige Artefakt, nicht nur in den Quellreview.

## 2026-08-02 – Bytegenaue Vendorlocks brauchen eine lokale EOL-Grenze

- Datum und geprüfter Stand: 2. August 2026, Windows-Sync des
  Essentials-v1-Vendorordners.
- Beobachtung: `core.autocrlf` kann Textartefakte beim Checkout umschreiben und
  damit korrekte, veröffentlichte SHA-256-Locks scheinbar brechen.
- Evidenz oder reproduzierbarer Test: `git check-attr text eol` meldet für die
  vendorten JS-/CSS-Dateien `text: set` und `eol: lf`; erneuter Sync und
  `pnpm verify:essentials` bleiben PASS.
- Änderung und Regressionstest: Eine enge
  `vendor/milosapps-essentials/v1/.gitattributes` setzt ausschließlich dort
  `* text eol=lf`.
- Für andere MilosApps relevant: Ja. Bytegenau gelockte vendorte Textdateien
  brauchen ihre Normalisierungsregel direkt an der Vertrauensgrenze.

## 2026-08-02 – Hosting-MIME und Vertragspräferenz sind getrennt zu messen

- Datum und geprüfter Stand: 2. August 2026, öffentliches GitHub-Pages-DEV.
- Beobachtung: Der lokale Preview liefert Module als
  `text/javascript; charset=utf-8`, GitHub Pages dieselben bytegenauen Dateien
  als `application/javascript; charset=utf-8`.
- Evidenz oder reproduzierbarer Test: HEAD-Prüfung beider Essentials-JS- und
  CSS-Pfade sowie erfolgreicher Modulstart im externen Browsergate. WHATWG
  führt beide Essenzen als JavaScript-MIME-Typen; CSS bleibt exakt `text/css`.
- Änderung und Regressionstest: Lokal bleibt der bevorzugte Typ verpflichtend;
  das externe Gate erlaubt nur `text/javascript` oder
  `application/javascript` und lehnt fehlende/generische Typen weiter ab.
- Für andere MilosApps relevant: Ja. Ein nicht konfigurierbarer statischer
  Hoster kann einen gültigen, aber nicht bevorzugten MIME-Typ setzen; QA muss
  die reale Sicherheitsgrenze prüfen und die Betriebsabweichung dokumentieren.

## 2026-08-03 – Kurze reale Wege brauchen eine ehrlich bezeichnete Lupe

- Datum und geprüfter Stand: 3. August 2026, Gameplay-Vertiefung Runde 1.
- Beobachtung: Eine 198–209-km-Route ist auf einer vollständigen Weltprojektion
  nur wenige Pixel lang. Dickere Linien oder künstlich verlängerte Distanzen
  hätten die Route zwar auffälliger, aber fachlich irreführend gemacht.
- Evidenz oder reproduzierbarer Test: Sichtbare Browserprüfung mit echtem
  Open-Meteo-Abruf bei 1440 × 900 und 390 × 844; automatisiertes Gate auf
  sichtbare Weltkarte, Routenlupe, Fokus und 0 Overflow.
- Änderung und Regressionstest: Die unveränderte Weltkarte erhält eine klar als
  vergrößert bezeichnete Routenlupe mit Start, Ziel, aktuellem Punkt,
  Windrichtung und getrennten Profilfarben. Die aktive Karte bleibt während
  tiefer Ergebnisinteraktion sticky; vor dem Flug bleibt sie normale Eingabe.
- Für andere MilosApps relevant: Ja. Wenn die natürliche Datenspanne im
  globalen Kontext nicht lesbar ist, sollte eine beschriftete Detailansicht die
  Daten ergänzen – nicht die Darstellungsskala heimlich verfälschen.

## 2026-08-03 – Ein fairer Szenariovergleich teilt den Daten-Snapshot

- Datum und geprüfter Stand: 3. August 2026, Gameplay-Vertiefung Runde 2.
- Beobachtung: Zwei getrennte Netzabrufe können unterschiedliche Modellzeiten
  liefern. Dann ist ein sichtbarer Unterschied nicht eindeutig dem geänderten
  Profil zuzurechnen.
- Evidenz oder reproduzierbarer Test: Ein Browsertest zählt vor und nach
  Vergleich und Replay exakt einen Windrequest; Unit-Tests prüfen gemeinsame
  `forecastStart`-/`fetchedAt`-Werte für 10 m, 925 hPa und 850 hPa.
- Änderung und Regressionstest: Ein Start lädt alle drei Höhen in einer
  gebündelten Antwort. Vorhersage, zweites Profil, Ursache-Wirkungs-Text und
  Replay verwenden ausschließlich diesen unveränderlichen Snapshot.
- Für andere MilosApps relevant: Ja. Vergleichbare Szenarien benötigen eine
  explizite gemeinsame Datenbasis und sollten diese im UI sichtbar benennen.

## 2026-08-03 – Persistierte Netzsignale können nach Reload lügen

- Datum und geprüfter Stand: 3. August 2026, Privacy-/Storage-Inventar für
  Essentials v1.1.
- Beobachtung: Ein früherer `sessionStorage`-Marker hielt den letzten
  Offline-Event fest. Nach einem späteren Online-Reload musste aber nicht erneut
  ein `online`-Event eintreffen; die App konnte deshalb veraltet „offline“
  anzeigen.
- Evidenz oder reproduzierbarer Test: Quellpfad vom Offline-Event über
  `sessionStorage` bis zur Initialisierung; vollständige Offline-/Reload-
  Regression nach Entfernung.
- Änderung und Regressionstest: Der unnötige Schlüssel ist entfernt. Aktueller
  Connectivity-Status kommt aus dem Browsersignal; der versionierte Cache bleibt
  allein für die ausdrücklich angebotene Offline-Funktion zuständig.
- Für andere MilosApps relevant: Ja. Kurzlebige Umgebungszustände sind keine
  Komfortpräferenz und sollten nicht ohne zwingenden Grund persistiert werden.

## 2026-08-03 – Eine Windvorschau muss denselben Snapshot wie der Start nutzen

- Datum und geprüfter Stand: 3. August 2026, lokale Karten-/Winditeration.
- Beobachtung: Ein separater Windcheck und ein anschließender neuer Abruf können
  unterschiedliche Modellzeiten liefern. Dann entscheidet der Nutzer anhand
  eines anderen Zustands als dem, der den Flug tatsächlich bewegt.
- Evidenz oder reproduzierbarer Test: Der Browsertest zählt für Vorschau plus
  Start exakt einen Open-Meteo-Request; der Start verwendet den Snapshot nur bei
  unverändertem gerundetem Startpunkt und verwirft ihn nach Ortswechsel.
- Änderung und Regressionstest: Die drei Höhen werden gemeinsam geladen,
  Zeitpunkt und aktuelles Profil sichtbar markiert und der Snapshot bewusst
  wiederverwendet. Abbruch, Fehler und Ortswechsel löschen die Vorschau.
- Für andere MilosApps relevant: Ja. Vorschau und Ausführung einer
  datengetriebenen Entscheidung brauchen eine belegbar identische Datenbasis.

## 2026-08-03 – Routennähe braucht Radius, Provenienz und eine Negativaussage

- Datum und geprüfter Stand: 3. August 2026, lokale Wahrzeicheniteration.
- Beobachtung: Ein Punkt auf einer groben Modellroute kann leicht als exakter
  Überflug verstanden werden, obwohl räumliche Daten, Windfeld und Zeitschritt
  das nicht tragen.
- Evidenz oder reproduzierbarer Test: Unit-Routen über Leipzig, Wartburg, Köln
  und Paris prüfen chronologische Marker; eine äquatoriale Fernroute liefert
  keine falschen Treffer.
- Änderung und Regressionstest: Lokale CC0-Fakten, feste 70-/95-km-Radien,
  nächster simulierter Routenpunkt, Deduplizierung und sichtbarer Hinweis
  „grobe Routennähe, kein exakter Überflug oder Navigation“.
- Für andere MilosApps relevant: Ja. Ortsanreicherung braucht neben der Quelle
  eine maschinenprüfbare Unsicherheitsgrenze und eine verständliche
  Negativaussage.

## 2026-08-03 – Neue öffentliche Nachweise gehören in das Offline-Gate

- Datum und geprüfter Stand: 3. August 2026, Pages-Artefaktprüfung des
  detaillierten Flugraums.
- Beobachtung: `THIRD_PARTY_NOTICES.txt` wurde korrekt gebaut und ausgeliefert,
  fehlte aber zunächst in der expliziten Service-Worker-App-Shell-Liste.
- Evidenz oder reproduzierbarer Test: Das erweiterte Fail-closed-Artefaktgate
  brach ausschließlich wegen des fehlenden Cachepfads ab; nach Aufnahme des
  Pfads bestanden Pages-Build und Artefaktprüfung.
- Änderung und Regressionstest: Drittanbieterhinweis, Datenquellen-Doku und
  Service-Worker-Cache werden als eine Veröffentlichungseinheit geprüft.
- Für andere MilosApps relevant: Ja. Neue Lizenz-, Hilfe- oder
  Datenschutzartefakte dürfen bei offlinefähigen Apps nicht nur im Build
  existieren, sondern müssen in der dokumentierten Offline-Grenze enthalten
  oder bewusst als online-only ausgewiesen sein.

## 2026-08-03 – LF-Schutz muss jeden bytegenau gelockten Vendorordner umfassen

- Datum und geprüfter Stand: 3. August 2026, frischer Windows-Recheckout der
  Karten-/Loaderiteration mit `core.autocrlf=true`.
- Beobachtung: Der neue Essentials-Ordner blieb wegen seiner engen
  `.gitattributes` bytegenau, während ältere Shell- und Layoutdateien im selben
  Checkout nach CRLF umgeschrieben wurden und ihr Verifier korrekt abbrach.
- Evidenz oder reproduzierbarer Test: `git ls-files --eol` zeigte für
  Essentials `i/lf w/lf`, für Shell/Layout zunächst `i/lf w/crlf`; danach
  bestanden alle drei vendorten Verifier in einem neu erzeugten Worktree.
- Änderung und Regressionstest: Jeder der drei getrennt gelockten
  Vendorordner besitzt nun die enge Regel `* text eol=lf`. Der Recheckout-Test
  prüft neben den Hashes ausdrücklich den EOL-Status.
- Für andere MilosApps relevant: Ja. Eine neue LF-Regel in nur einem aktuellen
  Vertragsordner schützt ältere parallel vendorte Locks nicht automatisch.

## 2026-08-03 – Dokumentoverflow kann eine interne Min-Content-Lücke verbergen

- Datum und geprüfter Stand: 3. August 2026, Linux-CI des detaillierten
  Flugraums nach grüner lokaler Windows-Matrix.
- Beobachtung: Windows meldete bei 320 CSS-Pixeln noch 320/320
  Dokumentbreite, obwohl „Papierflieger“ bereits breiter als seine Textzelle
  war. Die leicht andere Linux-Schriftmetrik machte daraus 337 px.
- Evidenz oder reproduzierbarer Test: Elementdiagnose der vier Objektoptionen
  sowie identischer fokussierter Playwright-Reflow auf Windows und Linux-CI.
- Änderung und Regressionstest: Griditem und Textspalte erhalten `min-width: 0`,
  lange Bezeichnungen `overflow-wrap: anywhere`; das Gate prüft zusätzlich die
  eigene Scrollbreite jeder Objektoption.
- Für andere MilosApps relevant: Ja. Ein grüner Dokumentbreitenvergleich
  beweist nicht, dass alle inneren Flex-/Gridtexte portabel schrumpfen können.

## 2026-08-03 – Stabile Komponenten brauchen auch stabile Geschwister

- Datum und geprüfter Stand: 3. August 2026, doppelte Linux-CI des finalen
  Karten-Handoffs.
- Beobachtung: Der Shareknopf behielt Breite und Höhe, verschob sich aber um
  14,72 px, solange der vorherige Exportknopf nach der Payload-Erzeugung noch
  das kürzere Busy-Label zeigte. Allein das Warten auf `data-visible=false`
  beseitigte diese reale Geschwisterbewegung nicht.
- Evidenz oder reproduzierbarer Test: Zwei identische SHA-genaue CI-Läufe,
  davon einer PASS und einer mit ausschließlich verschobenem X-Offset bei
  unveränderter Breite und Höhe.
- Änderung und Regressionstest: Der Exportknopf erhält am Desktop eine feste,
  beide DE/EN-Labels abdeckende Breite und reflowt mobil weiterhin auf 100 %.
  Das Gate wartet zusätzlich auf leeren Text und `data-visible=false`, bevor es
  die containerrelative Sharegeometrie vergleicht.
- Für andere MilosApps relevant: Ja. Geometriestabilität umfasst die gesamte
  Aktionsgruppe; ein stabiles Element kann durch ein asynchrones Geschwister
  trotzdem sichtbar springen.

## 2026-08-03 – Stabile Vendor-URLs brauchen eine explizite Cache-Revision

- Datum und geprüfter Stand: 3. August 2026, atomare Migration auf
  `public-app-essentials/v1.1.5`.
- Beobachtung: Der Service-Worker-Signaturwert beruhte bisher nur auf den
  Dateipfaden des Buildartefakts. Bei neuen Bytes unter denselben Vendor-URLs
  hätte ein bestehender App-Shell-Cache deshalb die frühere 40-px-CSS-Datei
  behalten können.
- Evidenz oder reproduzierbarer Test: Das Fail-closed-Artefaktgate verlangt
  nach dem Pinwechsel den Cachepräfix `wolkenpost-essentials-v1.1.5-*`; der
  Pages-Build enthält ihn und cached weiterhin alle vier Essentials-Runtimes.
- Änderung und Regressionstest: Der app-eigene Cache-Namespace erhält bei
  byteveränderten, stabil benannten Vendorartefakten eine Vertragsrevision.
- Für andere MilosApps relevant: Ja. Ein bytegenauer Vendor-Lock schützt den
  Build, invalidiert aber nicht automatisch bereits installierte Offline-
  Caches mit stabilen URLs.

## 2026-08-03 - Karteninteraktion braucht einen gemeinsamen Koordinatenraum

- Datum und gepruefter Stand: 3. August 2026, interaktive Windkarteniteration.
- Beobachtung: Laenderzoom, Pointer-Rueckprojektion, Route, Windfeld und Figur
  werden unzuverlaessig, wenn nur einzelne Canvas-Schichten einen Zoom kennen.
- Evidenz oder reproduzierbarer Test: Unit-Roundtrip fuer einen 12-fach
  gezoomten Viewport; Browser-Drag mit Maus und Touch; Laenderfokus und Zoom
  auf Desktop/390 px; 360x800@200-Prozent-Reflow ohne Overflow.
- Aenderung und Regressionstest: Alle Kartenebenen verwenden denselben
  Mittelpunkt-/Zoom-Viewport. Pointerkoordinaten werden durch dessen exakte
  inverse Projektion zurueckgerechnet. Wenn eine animierte Route den sicheren
  Innenrand verlaesst, passt eine deterministische Fit-Funktion den bisherigen
  Flug ein und zoomt nur heraus.
- Fuer andere MilosApps relevant: Ja. Karteninteraktion, Darstellung und
  Hit-Testing duerfen keine getrennten Projektionsannahmen besitzen.

## 2026-08-03 - Spielparameter duerfen Messwerte nicht umbenennen

- Datum und gepruefter Stand: 3. August 2026, Spielwind 1/1,5/2.
- Beobachtung: Ein Distanzmultiplikator wuerde als vermeintlich staerkerer
  echter Wind erscheinen, wenn Durchschnitt und Spitze ebenfalls multipliziert
  werden.
- Evidenz oder reproduzierbarer Test: Derselbe feste Wind-Snapshot erzeugt bei
  Faktor 2 mehr als die 1,9-fache Distanz, aber punktweise, durchschnittlich
  und maximal unveraenderte Windgeschwindigkeiten.
- Aenderung und Regressionstest: Der Faktor wirkt nur auf die Verschiebung pro
  Schritt, ist im Ergebnis gespeichert und im UI als lokaler Spielwind
  erklaert. Quelle, Datenzeit, Richtung und Windwerte bleiben real.
- Fuer andere MilosApps relevant: Ja. Spielerische Verstaerker brauchen ein
  separates Datenfeld und eine sichtbare Negativaussage zu realen Messwerten.

## 2026-08-03 - Reichweite ist eine bessere Spielentscheidung als Windfaelschung

- Datum und gepruefter Stand: 3. August 2026, Spielweite 1/4/10.
- Beobachtung: Faktor 1,5 oder 2 machte kurze Fluege zwar laenger, erzeugte aber
  noch keinen deutlich anderen Spielverlauf. Ein staerker benannter Windregler
  wuerde zugleich die echten Modellwerte semantisch verfaelschen.
- Evidenz oder reproduzierbarer Test: Derselbe feste Snapshot erzeugt bei
  Abenteuerweite eine mehr als achtfach laengere Route. Punkt-, Durchschnitts-
  und Maximalwind bleiben bytegleich; das UI zeigt vorab die geschaetzte
  Reichweite und benennt den Faktor ausschliesslich als Spielweite.
- Aenderung und Regressionstest: Die Auswahl lautet Echt/Reise/Abenteuer mit
  1/4/10. Unit- und Browsergate pruefen die Distanzwirkung, die unveraenderten
  Messwerte und die sichtbare Negativaussage.
- Fuer andere MilosApps relevant: Ja. Spielerische Simulationen sollten einen
  klar separaten Spielparameter und eine konkrete Vorschau seiner Wirkung
  anbieten, statt reale Messgroessen umzubenennen.

## 2026-08-03 - Kartenkontrollen duerfen mobil die Kartenbuehne nicht ersetzen

- Datum und gepruefter Stand: 3. August 2026, zwei sichtbare Kartenrunden.
- Beobachtung: Ein Desktop-Overlay schafft Zusammenhang zwischen Start, Wind
  und Reichweite; dieselbe absolute Box wuerde auf 390 Pixeln aber den
  eigentlichen Flugraum verdecken.
- Evidenz oder reproduzierbarer Test: Desktop zeigt die Kontrolle als
  halbtransparentes Karten-Widget. Bei 390 x 844 dockt sie unter der 320 Pixel
  hohen Karte an; Dokumentbreite 390/390 ohne Overflow. Im Flugfolge-Modus
  misst die Route Zoom 4,17 und bleibt mit Laendergrenzen sichtbar.
- Aenderung und Regressionstest: Unter 760 CSS-Pixeln wird das Widget Teil des
  normalen Flusses. Toolbar und Ziele bleiben mindestens 44 Pixel; 360 x 800
  bei 200 Prozent wird separat regressiert.
- Fuer andere MilosApps relevant: Ja. Karten-Overlays brauchen einen echten
  mobilen Dock-/Sheet-Zustand statt bloss verkleinerter Desktopgeometrie.

## 2026-08-03 - Ein Wrapper kann den Sticky-Flugraum unbemerkt begrenzen

- Datum und gepruefter Stand: 3. August 2026, visuelle QA-Runde 2.
- Beobachtung: Ein neuer Karten-Toolbar-Wrapper wurde zum naechsten
  Sticky-Containing-Block. Beim zweiten Flug blieb die Karte deshalb nicht
  mehr im sichtbaren Ergebnisraum.
- Evidenz oder reproduzierbarer Test: Das bestehende Gameplay-Gate prueft nach
  dem Vergleich die komplette Canvas-Geometrie gegen den Viewport und schlug
  reproduzierbar fehl.
- Aenderung und Regressionstest: Der semantische Wrapper bleibt im DOM, erzeugt
  mit `display: contents` aber keine eigene Layoutbox. Die Karte haftet wieder
  am gesamten Flugraum; alle drei Gameplay-Runden sind gruen.
- Fuer andere MilosApps relevant: Ja. Neue Werkzeugleisten um Sticky-Inhalte
  muessen gegen den tatsaechlichen Scroll-/Containing-Block regressiert werden.

## 2026-08-03 - Kartenpraesenz braucht keinen verschachtelten Scrollbereich

- Datum und gepruefter Stand: 3. August 2026, Design-Follow-up nach direktem
  Nutzerscreenshot.
- Beobachtung: Das Wind-Overlay hielt die Karte zwar sichtbar, belegte im
  bereiten Zustand aber fast ein Drittel der Kartenflaeche und erzeugte einen
  eigenen vertikalen Scrollbereich. Zusammen mit der sticky Ergebniskarte war
  der Seitenkontext beim Lesen kaum noch erkennbar.
- Evidenz oder reproduzierbarer Test: Der alte Screenshot zeigt Toolbar-Wrap,
  ueberlagerte Route und einen sichtbaren inneren Scrollbalken. Der neue
  Desktop-Dock misst 962 Pixel Breite, rund 231 Pixel Hoehe im bereiten Zustand,
  `overflow-y: visible` und `scrollHeight == clientHeight`; die Dokumentbreite
  bleibt 1265/1265.
- Aenderung und Regressionstest: Die App-Arbeitsflaeche nutzt breitere
  Viewport-Gutters. Karte und Toolbar bleiben frei; Start, Wind und Spielweite
  sitzen als flacher verbundener Dock darunter. Ergebnisse sind zweispaltig
  verdichtet, die Karte ist nicht mehr sticky und der Ergebnisfokus respektiert
  den festen Header. Mobil stapelt derselbe Dock ohne inneres Scrollen.
- Fuer andere MilosApps relevant: Ja. Bei datenreichen Karten zuerst die
  Kartenflaeche schuetzen, Controls progressiv in einen normalen Dokument-Dock
  auslagern und Sticky-Verhalten gegen den anschliessenden Lesefluss testen.
  Diese Erkenntnis ersetzt fuer Wolkenpost die fruehere Sticky-Empfehlung.

## 2026-08-03 – Sticky-Karten brauchen einen zustandsabhängigen Leserahmen

- Datum und geprüfter Stand: 3. August 2026, neue Reise-Arbeitsfläche und zwei
  sichtbare Produkt-QA-Runden.
- Beobachtung: Eine dauerhaft 600 Pixel hohe sticky Karte hielt die Route im
  Blick, ließ das darunterliegende Ergebnis aber vollständig hinter der Karte
  durchlaufen. Eine grundsätzlich nicht haftende Karte verschwand dagegen
  beim Start aus der Wahrnehmung. Beide Extremzustände verschlechterten den
  Lesefluss.
- Evidenz oder reproduzierbarer Test: Im echten 1280-Pixel-Browser lag das
  Ergebnis zunächst bei y=-190 bis 584 hinter der sticky Karte (y=16 bis 616).
  Nach der Korrektur misst die Ergebnis-Karte 345,6 Pixel Höhe, der fokussierte
  Ergebnistitel liegt bei y=374,5 und die Karte endet bei y=361,6; Dokumentbreite
  bleibt 1265/1265.
- Änderung und Regressionstest: Vor dem Flug bleibt die rechte Bühne 600 Pixel
  hoch. Sobald ein Ergebnis existiert, wird sie auf 340–430 Pixel begrenzt und
  der Fokus mit demselben dynamischen Abstand genau darunter gescrollt. Mobil
  bleibt die Karte im normalen Fluss. Gameplay, Responsive- und Fokusgate
  prüfen beide Zustände.
- Für andere MilosApps relevant: Ja. Sticky Visualisierungen sollten Höhe und
  Scroll-Offset an den Ergebniszustand koppeln; „immer sticky“ und „nie sticky“
  sind bei interaktiven Arbeitsflächen oft gleichermaßen unzureichend.

## 2026-08-03 – Sammelspiele brauchen dieselbe Datenschutz-Löschgrenze wie der Kernzustand

- Datum und geprüfter Stand: 3. August 2026, Reisepass-/Missionsiteration.
- Beobachtung: Länder- und Wahrzeichenstempel wirken wie harmlose Spielwerte,
  sind aber trotzdem dauerhafte Endgerätedaten. Ein separater Schlüssel oder
  eine separate Löschung hätte die bestehende klare Datenschutzgrenze
  aufgeweicht.
- Evidenz oder reproduzierbarer Test: Der versionierte App-Zustand sanitisiert
  Ländercodes, Wahrzeichenkennungen und Flugzahl, begrenzt deren Umfang und
  wird gemeinsam mit Zeichnung und Einstellungen gelöscht. Manifest, sichtbare
  Einstellungstexte und Speicherinventar nennen den Reisepass ausdrücklich.
- Änderung und Regressionstest: Der Reisepass liegt im vorhandenen
  `milosapps.cloud-post.state`; die bestehende Aktion „Lokale Daten löschen“
  setzt ihn mit zurück. Unit-Tests prüfen unbekannte, doppelte und ungültige
  Werte.
- Für andere MilosApps relevant: Ja. Lokale Fortschrittswerte gehören in das
  erklärte Zweckinventar und in denselben vorhersehbaren Löschfluss wie andere
  App-Daten.

## 2026-08-03 – Einzeiligkeit relativ statt betriebssystemspezifisch prüfen

- Datum und geprüfter Stand: 3. August 2026, Linux-CI-Folgefix des
  Reise-Arbeitsplatzes.
- Beobachtung: Derselbe kompakte Titel blieb unter Windows und Linux
  einzeilig, überschritt unter der Linux-Schriftmetrik aber eine feste
  22-Pixel-Testgrenze.
- Evidenz oder reproduzierbarer Test: Die CI meldete nur die absolute Höhe;
  Scrollbreite und Layoutfluss blieben korrekt. Ein separater 320-Pixel-Befund
  zeigte außerdem, dass Ergebnistext einen kleinen echten Umbruchpuffer
  benötigt.
- Änderung und Regressionstest: Das Titelgate verlangt nun direkt `nowrap` für
  Flexzeile und Kinder sowie fehlenden horizontalen Overflow. Ergebnis- und
  Reisejournaltexte dürfen unter 390 Pixeln an beliebigen langen Wörtern
  umbrechen; der app-eigene Shell-Gutter-Token schafft dort zusätzlich den
  nötigen Shadow-DOM-Reflowraum.
- Für andere MilosApps relevant: Ja. Einzeiligkeitsgates sollten Zeilenstruktur
  und verfügbare Breite prüfen, nicht eine OS-abhängige absolute Pixelhöhe.

## 2026-08-03 – Datenflächen brauchen eine app-eigene Shellbreite

- Datum und geprüfter Stand: 3. August 2026, breiter Reise-Arbeitsplatz.
- Beobachtung: Eine allgemeine 72-rem-Inhaltsgrenze war für Textseiten ruhig,
  ließ bei der kartenbetonten Wolkenpost auf 1440 Pixeln aber 288 Pixel
  ungenutzten Außenraum. Die Hauptaufgabe wirkte dadurch unnötig schmal.
- Evidenz oder reproduzierbarer Test: Vorher maß die Karte 804 Pixel, nach dem
  app-eigenen `--milos-shell-content-max`-Token 1060,4 Pixel. Der gesamte
  Arbeitsplatz misst 1408/1440 Pixel bei weiterhin 320 Pixel breiter Steuerung.
- Änderung und Regressionstest: Nur der dokumentierte Shell-Token und der
  app-eigene Außenabstand wurden geändert; Vendorbytes und Locks blieben
  unverändert. Das Gate prüft Fensteranteil, Kartenbreite sowie 390-, 320- und
  200-Prozent-Reflow.
- Für andere MilosApps relevant: Ja. Karten, Boards und Editoren sollten den
  vorgesehenen app-eigenen Breitentoken nutzen, statt Datenflächen in einer
  lesetextorientierten Standardbreite zu belassen.
