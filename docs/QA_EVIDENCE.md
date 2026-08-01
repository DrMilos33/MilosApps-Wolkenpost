# Wolkenpost QA-Evidenz

Stand: 1. August 2026, Branch `codex/cloud-post-shell-v2`

Der Miteinander-Product-QA-Workflow wurde nach dem ersten lauffähigen Stand in
drei vollständigen Runden angewendet. Testdaten wurden lokal und deterministisch
intercepted; zusätzlich wurde eine echte Open‑Meteo-Antwort manuell im Browser
geprüft.

## Baseline

- Ausgangsrepository: sauberer Branch `main`, nur Dokumentation, keine Tests;
- Sprache: Deutsch;
- Konto: keines;
- Thema: System sowie ausdrücklich Hell und Dunkel;
- Konnektivität: online, langsam, Timeout, abgebrochen und offline;
- persistente Testdaten: nur isolierter Browser-Lokalspeicher;
- Production: nicht angefasst.

## Browser- und Viewportmatrix

| Profil | Engine | Viewport | Eingaben |
|---|---|---:|---|
| Pixel 7 hoch | Chromium, mobile/touch | 412 × 915 | Touch, Pointer, Tastatur |
| Pixel 7 quer | Chromium, mobile/touch | 844 × 390 | Touch, Pointer, Tastatur |
| iPad Mini | WebKit, mobile/touch | 768 × 1024 | Touch, Pointer, Tastatur |
| Desktop Chrome | Chromium | 1440 × 1000 | Maus, Pointer, Tastatur |
| Reflow-Sonderfall | Chromium | 320 × 820 | 200-%-äquivalente Breite |
| Shell-Mobil | Chromium | 390 × 844 | Touchziele, DE/EN, Reload |
| Shell-Reflow | Chromium | 180 × 400 CSS-Pixel | 360 × 800 bei 200 % Zoom |

## Runde 1 – Kernlogik und kompletter Ablauf

Geprüft:

- vier Objektarten und passendes Windniveau;
- deterministische Zeit-/Rauminterpolation;
- schwacher, extremer und fehlender Wind;
- Polnähe und Datumsgrenze;
- kompletter Live-Fixture-Ablauf in allen vier Geräteprofilen;
- Touch-/Pen-Strich, `pointercancel`, Tastaturzeichnung und Tastaturkarte;
- kein Login, keine genaue Koordinate in der URL, kein horizontaler Überlauf.

Evidenz:

- 17 Vitest-Tests;
- 12 Playwright-Matrixläufe.

Gefunden und behoben:

1. Kartenbewegungen innerhalb 160 km einer bekannten Stadt sprangen auf deren
   Zentrum zurück. Der sichtbare Ortsname bleibt nun hilfreich, während die
   tatsächlich gewählte grobe Koordinate erhalten bleibt.
2. Tablet-WebKit war in der lokalen Browserinstallation zunächst nicht
   verfügbar. WebKit wurde als echte zweite Engine installiert; dies war eine
   Testumgebungsgrenze, kein App-Fehler.

## Runde 2 – Fehler, Eile und Zustandsübergänge

Geprüft:

- langsames Netz mit sichtbarem Laden und Abbruch;
- Timeout mit eigenem Text und erfolgreichem Retry;
- Netzwerkfehler mit nur bewusst wählbarem Demo-Wind;
- verweigerte Ortung mit weiter nutzbarer Suche und Karte;
- Offline-Start, App-Resume und erhaltener Ergebniszustand;
- Pointer-Abbruch, sehr schnelle Objektwechsel, extrem kurzer Strich,
  220-Punkt-Strich und Selbstüberschneidung;
- fester Port 4315, Strict-Port-Abbruch und App-Key-Readiness.

Evidenz:

- 6 fokussierte Resilience-Läufe;
- 2 fokussierte Eingabe-/Touchziel-Läufe;
- app-spezifischer Global-Setup-Check auf `cloud-post`.

Gefunden und behoben:

1. Ein generischer HTTP-200 auf Port 4173 konnte einen fremden App-Server als
   Wolkenpost akzeptieren. DEV und E2E verwenden jetzt exklusiv 4315,
   `--strictPort`, `reuseExistingServer: false` und prüfen Status, App-Key und
   Umgebung im Response.
2. `setPointerCapture` kann bei bereits verlorenen oder synthetischen Pointern
   `NotFoundError` werfen. Capture und Release sind jetzt defensiv abgefangen;
   die Pointer-ID begrenzt den laufenden Strich weiterhin.

## Runde 3 – Barrierefreiheit, Bewegung, Offline und Export

Geprüft:

- vollständige Axe-Regeln einschließlich Farbkontrast;
- Hell, Dunkel und System;
- reduzierte Bewegung mit sofort vollständig sichtbarer Route;
- 320-Pixel-Reflow ohne horizontales Scrollen;
- alle sichtbaren Buttons mindestens 44 CSS-Pixel hoch;
- semantische Namen, Fokusreihenfolge und Ergebnisfokus;
- PNG-Export mit privatem Dateinamen und ohne Koordinaten-URL;
- Service-Worker-Installation, Offline-Reload und keine Konsolenfehler;
- visuelle Browserprüfung von Hero, Zeichen-/Kartenbereich und Live-Ergebnis;
- echter Open‑Meteo-Lauf: 316 km Testbeobachtung für Berlin am geprüften
  Datenstand, GFS 850 hPa, keine Browserfehler.

Evidenz:

- 6 Accessibility-/Export-/Offline-Läufe;
- visuelle Desktopprüfung im In-App-Browser;
- gesamter abschließender E2E-Lauf: 26 ausgeführte Tests grün.

Gefunden und behoben:

1. Der Service Worker antwortete bei einem fehlenden JavaScript-Asset mit
   `index.html`; der Browser verwarf es wegen falschem MIME-Typ. Nur
   Navigationen dürfen jetzt HTML-Fallback erhalten, Assets werden per exaktem
   Pfad gelesen und Caches pro Build versioniert.
2. Der helle Akzent hatte bei kleinen Texten nur 3,68:1 Kontrast. Der helle
   Akzent wurde auf eine WCAG-AA-taugliche Variante abgedunkelt; dunkles Thema
   erhielt eine eigene Launch-Akzentfarbe.
3. Das Hero-Wolkenzeichen wurde von der System-Emoji-Darstellung im dunklen
   Thema fast schwarz gerendert. Es ist jetzt eine kontrastfeste CSS-Form.
4. `online` wäre bei Browsersignalen nur eine Vermutung gewesen. Der Status
   lautet neutral `bereit`; `offline` wird nur nach erkanntem Offline-Ereignis
   angezeigt.

## Abschlusslauf

```text
Vitest:     4 Dateien, 17 Tests, 17 bestanden
Build:      erfolgreich, JavaScript 74,55 kB gzip, CSS 4,31 kB gzip
Playwright: 68 Kombinationen entdeckt
            26 ausgeführt und bestanden
            42 absichtlich projektgefiltert
```

Die 42 Filterungen sind keine fehlgeschlagenen oder ausgelassenen
Anforderungen: Die drei Kernflows laufen auf allen vier Geräteprofilen.
Spezialfälle wie Export, Offline-Service-Worker, Axe und Geolocation werden
einmal im Desktop-Projekt ausgeführt und in den anderen drei Projekten bewusst
übersprungen.

## Runde 4 – unabhängiges öffentliches HTTPS-DEV

Geprüft:

- unabhängiger Direktaufruf ohne Portal-Cookie und ohne Milos-Login;
- Smartphone hoch/quer, Tablet-WebKit und Desktop-Chromium gegen die
  öffentliche HTTPS-DEV-URL;
- Readiness mit App-Key, Umgebung, Production-Sperre und tatsächlich
  ausgelieferter vollständiger Commit-ID;
- GitHub-Pages-Unterpfad für HTML, Assets, Manifest, Service Worker,
  Healthcheck, Integrationsmetadaten, Vorschaubild und Export-Navigation;
- app-eigener GitHub-Actions-Build mit Lockfile, Tests, Artefaktstempel und
  Identitätsprüfung.

Evidenz:

- erster gesunder Pages-Deploy:
  `c5597051a1b3485975e9cb7f278f406005dc658e`;
- initialer externer Matrixlauf: 25 bestanden, 1 fehlerhafte Testannahme,
  42 bewusst projektgefiltert;
- fokussierter externer Export-Regressionslauf nach der Korrektur: 1 bestanden;
- der abschließende vollständige Matrixlauf wird gegen die aus
  `/health.json` gelesene Übergaberevision ausgeführt.

Gefunden und behoben:

1. Der Exporttest erwartete nach einem Reload die Domainwurzel `/`, obwohl eine
   korrekt unter einem Pages-Projektpfad laufende App auf
   `/MilosApps-Wolkenpost/` bleibt. Der Test prüft nun die eigentliche
   Datenschutzanforderung: keine Koordinaten in Query oder Fragment.
2. Das Vorschaubild war in den Integrationsmetadaten noch als Domainwurzelpfad
   angegeben. Pfad, absolute URL und Artefaktprüfung verwenden jetzt denselben
   App-Unterpfad.

## Runde 5 – `public-app-shell/v2.0.3`, DE/EN, CSP und extremer Reflow

Geprüft:

- fester Shared-Pin `ed898412306e22c6ae1b10ee8953df29f8acd627`, vendorte
  Artefakte und `shell-lock.json` mit SHA-256;
- genau eine Shell, app-eigenes Inline-SVG, semantischer Hauptinhalt und
  absolute DEV-Links;
- vollständige strukturgleiche DE/EN-Fachtexte, Ortsnamen, dynamische
  Meldungen, Exporttexte und zugängliche Namen;
- Sprachwechsel und Reload-Persistenz sowie sicherer Fallback bei beschädigtem
  Speicherwert;
- Deutsch und Englisch ohne schwere oder kritische Axe-Befunde;
- Tastaturfokus, sichtbare Fokusmarkierung, mindestens 44 × 44 CSS-Pixel große
  Ziele, Reduced Motion und Offline-Reload;
- visuelle Abnahme bei 1440 × 900 (DE), 390 × 844 (EN) und 180 × 400
  CSS-Pixeln als 360 × 800@200-%-Äquivalent;
- kein horizontaler Überlauf, kein verdeckter Text und kein Leerraum unter dem
  Shell-Footer.
- echte strikte CSP mit `default-src 'self'; script-src 'self'; style-src
  'self'`, externen Same-Origin-Shell-/Theme-Styles und ohne CSP-Warnung.

Gefunden und behoben:

1. Ein Playwright-Sprachselektor suchte nur nach dem Teilstring `DE`/`EN` und
   traf dadurch Fachbuttons. Exakte zugängliche Namen sichern jetzt den
   tatsächlichen Sprachschalter.
2. Eine reine Dokumentbreitenmessung war grün, obwohl die app-eigene große
   Typografie bei 360 × 800@200 % innerhalb eines geclippten Hero-Containers
   abgeschnitten wurde. Eine schmale app-eigene Typografie-/Grid-Regel und ein
   Test auf Element-Scrollbreite verhindern diese stille Clipping-Regression.
   Es wurde kein Shell-Min-Width-Workaround eingeführt.
3. Die App initialisiert ihre Sprache zusätzlich aus
   `document.documentElement.lang`, weil ein Listener allein das bereits
   gesendete Initialevent der Shell verpassen kann.
4. Vite wandelte die kleine Theme-CSS beim normalen Modulbuild zunächst in
   eine `data:`-URL um. `style-src 'self'` blockierte diese korrekt und die
   Shell blieb unregistriert. Der Bootstrap bleibt nun als externe
   Vendor-Runtime erhalten; der Build kopiert alle vier Runtime-Dateien mit
   festen Pfaden und prüft ihre Lock-Hashes im fertigen DEV-Artefakt.
5. Eine app-eigene alte `display: block`-Regel überschrieb das neue
   Shared-Host-Grid. Die App setzt am Host nur noch Theme-Variablen; der
   CSP-Test verlangt berechnet `display: grid`, Marken-Flexlayout, 38-Pixel-
   Icon und 44-Pixel-Ziele.

Lokale Evidenz vor dem DEV-Publish:

```text
Shared-Validator: PASS (cloud-post, dev), Release-Hashes exakt
Vitest:           5 Dateien, 20 Tests, 20 bestanden
Build:            erfolgreich, App-JavaScript 78,79 kB gzip, App-CSS 4,33 kB
                  plus externe Shell-CSS 1,55 kB gzip
Playwright:       96 Kombinationen, 33 bestanden, 63 profilspezifisch gefiltert
Visual-QA:        3/3 bestanden
```

## Runde 6 – Pilot `public-app-layout/v1.0.0`

Geprüft:

- fester Shared-Pin `bd09643e2767eddba032a82afc550043f3e3b31e`, Profil
  `guided-flow`, vendorte Basis-/Theme-CSS und separater Drei-Artefakt-Lock;
- kompakte, flache Intro-/Arbeitsstruktur ohne Karten-in-Karten-Optik;
- vollständige Zeichen-, Karten-, Wind-, Fehler-, Offline- und Exportfunktion;
- progressive Offenlegung der lokalen Komforteinstellungen;
- DE/EN-Umschaltung und Reload-Persistenz;
- Tastatur, Touch, Pointer-Abbruch, 44-Pixel-Ziele, sichtbarer Fokus,
  Reduced Motion und Hell-/Dunkel-Kontrast;
- strikte CSP mit beiden Layout-CSS-Dateien als Same-Origin-Ressourcen,
  korrektem `text/css`-MIME, Lock-Hash und Service-Worker-Cache;
- 1440 × 900, 390 × 844 sowie 180 × 400 CSS-Pixel als
  360 × 800@200-%-Äquivalent ohne horizontalen Überlauf oder Text-Clipping.

Visuelle QA-Runde 1:

- Ausgangsmessung nach dem ersten Umbau: Intro 372 px Desktop und 346 px
  mobil; beide Budgets waren noch überschritten.
- Bei 200-%-Reflow wurden die Texte der Objektwahl durch nebeneinander
  erzwungenes Symbol und Text zu schmal.
- Behoben durch kürzere Statuszeile, maßvollere Titeltypografie, kompakte
  Dekoration und eine echte einspaltige Objektoption unter 240 CSS-Pixeln.

Visuelle QA-Runde 2:

- Desktop hell und dunkel: Intro 273,61 px, Primärarbeit ab 374,61 px;
- 390 × 844 Englisch: Intro 260,11 px, Primärarbeit ab 397,48 px;
- 360 × 800@200 %: kein Dokumentüberlauf, kein geclipptes sichtbares
  Textelement und kein Leerraum unter dem Footer;
- alle vier visuellen Vertragsfälle bestanden mit null CSP- oder
  Konsolenproblemen.

Gefunden und behoben:

1. Der bisherige Dark-Mode-Axe-Lauf meldete die transparenten Textknoten der
   Shadow-DOM-Shell gegen eine von `color-mix()` falsch zusammengesetzte
   Zwischenfarbe. Axe prüft weiterhin den vollständigen Fachinhalt; die
   tatsächlich berechneten Vorder-/Hintergrundfarben aller Shell-Controls
   werden zusätzlich mit WCAG-Luminanzformel auf mindestens 4,5:1 geprüft.
2. Der vollständige No-Login-Flow suchte den Text `keine Anmeldung` im
   entfernten großen Hero-Link. Der Regressionstest prüft jetzt die echte
   Grenze: kein Passwortfeld, kein Formular und sichtbarer No-Login-Hinweis
   im Shell-Footer.
3. Ein Pages-Unterpfad-Artefakt kann nicht direkt als lokaler Root-Preview
   getestet werden. Das Gate prüft zuerst das Pages-Artefakt und baut danach
   den Standard-Preview neu, bevor Playwright startet.

Lokale Evidenz vor dem Pilot-Publish:

```text
Shared-Validatoren: Shell PASS; Layout PASS (cloud-post, guided-flow)
Vitest:             5 Dateien, 20 Tests, 20 bestanden
Playwright Runde 1: 100 Kombinationen, 30 bestanden, 66 Profilfilter,
                    4 veraltete No-Login-Testannahmen
Betroffene Matrix:  12/12 nach Korrektur bestanden
Visual-QA Runde 2:  4/4 bestanden
Abschlussmatrix:    100 Kombinationen, 34 bestanden, 66 profilspezifisch
                    gefiltert, 0 fehlgeschlagen
Pages-Artefakt:     PASS einschließlich Layout-CSS-Hashes und PWA-Cache
```

## Verbleibende Prüfgrenzen

- Keine echte Betriebslast oder API-Quota-Prüfung; nur ein einzelner echter
  Live-Abruf und deterministische Testfixtures.
- Keine reale Screenreader-Ausgabe mit menschlicher Assistive-Technology-
  Bewertung; Semantik, Fokus und Axe sind automatisiert geprüft.
- Keine Production-Prüfung oder -Änderung.
