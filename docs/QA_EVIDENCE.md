# Wolkenpost QA-Evidenz

Stand: 3. August 2026, Branch `codex/cloud-post-essentials-v1-1-gameplay`

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

## Runde 7 – Nutzeriteration `public-app-layout/v1.1.0`

Geprüft:

- atomarer Pin auf Shared-Commit
  `55b649d997489ca703682679257ac1a5b790bdc7`, vendorte Basis-/Theme-CSS,
  portabler Verifier und Drei-Artefakt-Lock;
- bewusstes Desktop-Opt-in `data-milos-flow="paired"`, während der generische
  Vertragsfluss und alle mobilen Breiten einspaltig bleiben;
- kürzere vollständige DE-/EN-H1, kleinere Schritt-H2 und sichtbares
  `data-milos-intro-icon` innerhalb der Desktop-/Mobilgrenzen;
- kompletter Settings-Baustein mit Intro, drei Geräteoptionen und getrennter
  lokaler Löschaktion;
- 1440 × 900 hell/dunkel, 390 × 844 Englisch und 180 × 400 CSS-Pixel als
  360 × 800 bei 200 Prozent Textzoom;
- Fokus, 44-Pixel-Ziele, Reduced Motion, DE/EN samt Reload, strikte CSP,
  Offline-PWA, Export sowie alle Wind-, Ortungs-, Fehler- und Eingabeflüsse.

Baseline vor der Änderung:

- Desktop: Intro 273,61 px, Primärarbeit ab 374,61 px, H1 60 px, beide
  Schritt-H2 44,8 px, Dekoration 160 × 112 px und offene Einstellungen
  314,42 px;
- 390 × 844: Intro 260,11 px, Primärarbeit ab 397,48 px, H1 31,2 px,
  Schritt-H2 28 px, ausgeblendete Introdekoration und offene Einstellungen
  460,88 px;
- unveränderte Baseline: beide Validatoren, 20/20 Unit und 34/34 anwendbare
  Browserfälle grün.

Visuelle QA-Runde 1:

- die erste v1.1-Adaption erfüllte H1/H2/Icon und Primary-Top, lag aber mit
  224,91 px Desktop-Intro, 269,67 px Mobil-Intro und 412,22 px mobilen
  Einstellungen noch über den neuen Budgets;
- kürzere Aufgabenformulierung, seitlich eingebundene mobile Wolke,
  zurückgenommene Abstände und kompakte Einstellungszeilen beseitigten den
  unnötigen Höhenverbrauch ohne kleinere Touchziele;
- bei 200 Prozent waren die horizontalen Select-Zeilen anschließend 132 px
  breit in einem 124-px-Inhaltsbereich. Unter 240 CSS-Pixeln reflowen nur
  diese Zeilen wieder einspaltig; es gibt kein Verstecken oder Clipping.

Visuelle QA-Runde 2:

- Desktop hell/dunkel: Intro 177,92 px, Primärarbeit ab 278,92 px, H1
  46,08 px, Schritt-H2 25,92 px, Icon 72 × 72 px und offene Einstellungen
  153,44 px;
- 390 × 844 Englisch: Intro 203,81 px, Primärarbeit ab 341,19 px, H1 27,3 px,
  Schritt-H2 18,4 px, Icon 52 × 52 px und offene Einstellungen 338,92 px;
- 360 × 800 bei 200 Prozent: Root-Overflow 0, keine geclippten sichtbaren
  Texte oder Controls, Icon 32,39 px und sauberer einspaltiger Settings-Reflow;
- alle vier visuellen Fälle, CSP- und Konsolenprüfung grün.

Lokale Abschlussevidenz vor dem DEV-Publish:

```text
Shared-Validatoren: Shell PASS; Layout v1.1.0 PASS (cloud-post, guided-flow)
Vitest:             5 Dateien, 20 Tests, 20 bestanden
Pages-Artefakt:     PASS einschließlich Layout-CSS-Hashes und PWA-Cache
Playwright:         100 Kombinationen, 34 bestanden, 66 profilspezifisch
                    gefiltert, 0 fehlgeschlagen
Visual-QA:          4/4 in der finalen zweiten Runde
```

## Runde 8 – deutsche Mobile-Dichte nach unabhängiger Live-Messung

Die erste v1.1-Abnahme maß mobil nur die englische Fassung. Eine unabhängige
Live-Prüfung zeigte deshalb eine echte Lücke: Bei 375 px Clientbreite brachen
die lange deutsche Metazeile und der Bereitschaftsstatus um; zusammen mit dem
deutschen Lead wuchs das Intro auf 253,59 px. Bei 390 px Clientbreite waren es
noch 233,80 px. Overflow und Fachfunktion blieben zwar grün, das 220-px-Budget
war aber nicht erfüllt.

Der enge App-Patch kürzt ausschließlich die redundante Metazeile zu
„Wolkenpost“ und formuliert den Lead kompakter. Datenschutz- und Modellwahrheit
bleiben explizit erhalten: grober Startpunkt, private Modellroute und echte
Winddaten. H1, Intro-Icon, Paired-Flow, Settings und beide Shared-Pins bleiben
unverändert.

Fokussierte visuelle Runde 1 nach dem Patch:

- 375 px Clientbreite, DE: Intro 206,30 px, Primärarbeit ab 343,67 px;
- 390 px Clientbreite, DE: Intro 184,53 px, Primärarbeit ab 321,91 px;
- 390 px, EN: Intro 156,70 px, Primärarbeit ab 294,08 px;
- jeweils H1 27,2–27,3 px, H2 18,4 px, Icon 52 × 52 px, Settings 338,92 px,
  Clientbreite gleich Scrollbreite und kein Clipping.

Die Regression enthält jetzt beide deutschen Clientbreiten zusätzlich zum
englischen Mobilfall. Damit kann eine englische Kurzfassung einen deutschen
Umbruch künftig nicht mehr verdecken.

Fokussierte visuelle Runde 2 und vollständiges Abschlussgate:

```text
Shared-Validatoren: Shell v2.0.3 PASS; Layout v1.1.0 PASS
Vitest:             5 Dateien, 20 Tests, 20 bestanden
Visual-QA:          6/6 bestanden (Desktop hell/dunkel, DE 375/390,
                    EN 390, 200%-Äquivalent)
Playwright:         108 Kombinationen, 36 bestanden, 72 profilspezifisch
                    gefiltert, 0 fehlgeschlagen
Build:              Standardbuild PASS
```

Das aktualisierte app-eigene `preview.png` zeigt denselben verkürzten
DE-Introtext; Rechtebasis bleibt ein Screenshot ausschließlich der eigenen App.

## Runde 9 – `public-app-essentials/v1.0.0`

Geprüft und integriert wurden der unveränderliche Shared-Pin
`b09e09008ff05fe87f05bc647a7c4964ff13e6f6`, der Fünf-Artefakt-Lock und die
Wolkenpost-Module Start, Datenschutz, Teilen und Ortssuche. Das Datumsmodul ist
bewusst nicht aktiv. Shell v2.0.3 und Layout v1.1.0 bleiben getrennt gepinnt.

Verbesserungsrunde 1 – Fachintegration:

- die bisherige lokale Ortsliste blieb Datenquelle, wurde aber um Region,
  ISO-Land und Typ ergänzt und in das explizite gemeinsame Such-UI überführt;
- die Ergebnisdarstellung zeigt Name sowie Region und Land in DE/EN;
- Teilen verwendet weiter das privacy-sichere PNG, übergibt aber nur eine
  kanonische App-URL ohne Query, Hash, Koordinaten oder lokalen Zustand;
- der Datenschutzhinweis benennt lokale Speicherung wahrheitsgemäß, ohne eine
  Wahl über nicht vorhandenes Tracking vorzutäuschen.

Verbesserungsrunde 2 – sichtbare Browser-QA:

- 390 × 844 und 1440 × 900 wurden hell/dunkel, auf Deutsch und Englisch mit
  echter Tastaturbedienung der Ortssuche geprüft;
- ein Sprachwechsel ließ zunächst den deutschen Suchbegriff im zustandseigenen
  Custom Element stehen. Das Suchelement wird nun beim Localewechsel gezielt
  neu erzeugt, während der gewählte Fachort lokalisiert erhalten bleibt;
- die gemeinsamen Such-/Teilen-Controls verwendeten im dunklen App-Theme
  zunächst helle statische Tokens. App-eigene externe Dark-Tokens beheben den
  Kontrast ohne Inline-Style oder CSP-Ausnahme;
- Desktop: Intro 153,73 px, Primärarbeit ab 254,73 px; Mobil 375 px: Intro
  206,30 px, Primärarbeit ab 343,67 px; jeweils Overflow 0.

Verbesserungsrunde 3 – Start-, CSP- und Resilienzgate:

- ein künstlich verlangsamter Bootstrap belegte einen Race: React konnte sein
  Ready-Ereignis senden, bevor der Essentials-Listener registriert war. Der
  Handshake wartet nun deterministisch auf die registrierte Shared-Komponente;
- der Regressionstest hält die App vor dem Bootstrap sichtbar hinter dem
  Loader und bestätigt anschließend dessen Entfernung;
- der Loader verwendet ein `<p>` statt H1–H6, misst maximal 56 px am Desktop
  und 48 px mobil und bleibt bei einem wirklich ausstehenden App-Bundle stehen;
- native Share, Clipboard-Fallback und `AbortError`, verweigerte Ortung,
  langsames Netz, Timeout, Offline, App-Resume, Pointer-Abbruch, Reduced Motion,
  Tastatur und Axe wurden gemeinsam regressiert;
- die erste Linux-CI-Ausführung deckte eine unklare visuelle Testvorbedingung
  auf: Bei 180 CSS-Pixeln lag der bewusst sichtbare Datenschutzhinweis über den
  später gemessenen Einstellungen. Der Test prüft und quittiert den Hinweis nun
  ausdrücklich, bevor er den darunterliegenden Layoutzustand bedient;
- beide Essentials-CSS-Dateien, Bootstrap und Runtime-JS werden mit korrektem
  MIME von Same-Origin geladen; strikte `style-src 'self'` erzeugt keine
  Verletzung. Das Pages-Artefakt lehnt `data:`-Inlining und eine Loader-H1
  fail-closed ab.
- die erste externe Pages-Matrix bestand 43/45 anwendbare Fälle. Die beiden
  übrigen Befunde waren lokale Testannahmen: eine hart codierte
  `127.0.0.1`-Share-URL und ein auf GitHub Pages nicht setzbarer CSP-Header.
  Externe Tests leiten die saubere Share-Basis nun aus ihrem Ziel ab und prüfen
  Same-Origin-Runtime/MIME/Konsolenereignisse; der strikte CSP-Header bleibt
  zusätzlich im kontrollierten lokalen Preview-Gate verpflichtend.
- GitHub Pages liefert die beiden JS-Module mit dem gültigen
  `application/javascript; charset=utf-8` statt dem lokal erwarteten
  `text/javascript; charset=utf-8`; beide CSS-Dateien bleiben
  `text/css; charset=utf-8`. Das externe Gate akzeptiert ausschließlich diese
  beiden JavaScript-MIME-Essenzen, nicht generische oder fehlende Typen.

Lokale Abschlussevidenz vor dem DEV-Publish:

```text
Shared-Validatoren: Shell v2.0.3 PASS; Layout v1.1.0 PASS;
                    Essentials v1.0.0 PASS
Vitest:             5 Dateien, 20 Tests, 20 bestanden
Playwright:         132 Kombinationen, 45 bestanden, 87 profilspezifisch
                    gefiltert, 0 fehlgeschlagen
Start-Race-Fokus:   12/12 Desktop-/Essentials-/Accessibilityfälle bestanden
Build:              Standardbuild PASS; Pages-Build PASS
Pages-Artefakt:     PASS einschließlich 5er-Lock, externer CSS-Grenzen,
                    Loader-Semantik, PWA-Cache und Production=false
Diff:               git diff --check PASS
```

Die enge Vendor-`.gitattributes` liefert für die Essentials-Dateien
`text: set, eol: lf`. Ein erneuter Sync aus dem fest gepinnten Shared-Checkout
und der anschließende Validator blieben grün. Die öffentliche Revision und
Artefaktevidenz folgen im DEV-Handoff nach dem koordinierten Publish.

## Runde 10 – Gameplay-Vertiefung und Essentials-v1.1-Migrationskandidat

Basis ist der öffentlich gesunde DEV-Stand
`4d8a090f546a75d705b34671f7f0f103334dcd08`. Die Produktänderungen liegen
lokal auf `codex/cloud-post-essentials-v1-1-gameplay`. Nach den zentralen
Verifier- und Hostingpfad-Audits ist der Zwischenvendor vollständig durch den
unveränderlichen Pin `public-app-essentials/v1.1.2` / Shared
`b14aac6107b75f03ff49e74160af7e7e30c29e59` ersetzt.

### Produkt-/User-Test-Runde 1 – der Flugraum bleibt verständlich

Simulierte frische Nutzerin, reale Aufgabe: Ohne Vorwissen eine Wolke zeichnen,
Berlin als groben Start verwenden, einen Live-Flug starten und danach Start,
aktuellen Punkt, Ziel, Wind, Höhe und Zeit erklären können, ohne die Route aus
dem Blick zu verlieren.

Baseline-Befunde:

- Das frühere Ergebnis stand nach dem Startbereich als eigene Ergebniskarte;
  Weltkarte und Ergebnis waren nicht als ein zusammenhängender Flugraum
  erkennbar.
- Ein realer 198–209-km-Flug war auf der vollständigen Weltprojektion nur wenige
  Pixel lang und wurde teilweise vom gezeichneten Flugobjekt verdeckt.
- Der erste Animationsframe zeigte `0 km/h`, obwohl der erste berechnete
  Windvektor bereits vorlag.

Änderungen:

- Die Ergebnis- und Replayoberfläche sitzt direkt unter der weiterhin sichtbaren
  Weltkarte. Nach dem Start wird der Flugraum gescrollt und nur die
  Ergebnisüberschrift mit `preventScroll` fokussiert.
- Ein kompakter, klar als „Routenlupe · vergrößert“ bezeichneter Kartenausschnitt
  macht kurze reale Routen sichtbar, ohne die globale Karte oder geografische
  Distanzen umzudefinieren. Start, Ziel, aktuelle Position und Windpfeil haben
  getrennte Marker.
- Ein strukturiertes Flugreadout zeigt Start, Aktuell, Ziel, Windrichtung und
  -stärke, Höhenband und verstrichene Zeit. Der Startpunkt übernimmt den ersten
  realen Windwert statt eines künstlichen Nullwerts.
- Die aktive Flugkarte bleibt während tieferer Ergebnisinteraktion sticky; vor
  einem Flug bleibt die Karte eine normale, nicht-sticky Startpunkteingabe.
- Direkt am Flugraum steht die Modellgrenze: spielerische Advektion aus groben
  Windpunkten, keine exakte Ballistik, Navigation oder Wetterwarnung.

Tests und Ergebnis:

- sichtbare Browserprüfung 1440 × 900 mit echtem Open-Meteo-Liveabruf:
  Ergebnisfokus `result-heading`, Karte vollständig im Viewport, 0 horizontaler
  Overflow, reale Route 208 km;
- sichtbare Browserprüfung 390 × 844: Karte bei `top=8`, `bottom=214,33`,
  Routenlupe lesbar, Ergebnis direkt anschließend, 0 horizontaler Overflow;
- automatisiert: Kartenfokus, `data-route-lens=visible`, sticky-Grenze,
  sechs Readout-Felder, Windwert ungleich Null und Modellhinweis.

Outcome: Die Nutzerin kann die Route und ihren Modellcharakter direkt im
Flugraum lesen; der Fokus verschiebt sie nicht mehr zu einer abgetrennten
Ergebniskarte.

### Produkt-/User-Test-Runde 2 – Vorhersagen, vergleichen, wiederholen

Simulierter frischer Nutzer, reale Aufgabe: Nach dem ersten Wolkenflug auf
demselben Datenstand vorhersagen, wie ein Samen fliegt, den Vergleich starten,
die Ursache des Unterschieds benennen und beide Flüge erneut abspielen.

Baseline-Befund: Nach einem einzelnen Ergebnis gab es nur Export/Teilen und
„Noch eine Reise“. Ein zweites Profil erforderte einen kompletten Neustart und
einen neuen Netzabruf; ein fairer Ursache-Wirkungs-Vergleich war unmöglich.

Änderungen:

- Ein Live-Start lädt 10 m, 925 hPa und 850 hPa gebündelt in genau einem
  Open-Meteo-Abruf und bindet alle Profile an denselben `forecastStart` und
  `fetchedAt`.
- Vor dem Vergleich nennt die UI das andere Höhenband und die Flugdauer. Erst
  die bewusste Aktion „Profil vergleichen“ simuliert lokal das zweite Profil.
- Zwei kontrastierende Routen und Readout-Zeilen, die gemeinsame Datenzeit,
  die Distanzdifferenz sowie die Ursache „Windhöhe, Flugdauer und Driftprofil“
  machen Wirkung und unveränderte Randbedingungen sichtbar.
- „Beide Flüge wiederholen“ startet ausschließlich die Darstellung neu; es
  erzeugt weder Zufall noch einen weiteren Netzabruf.

Tests und Ergebnis:

- deterministische Unit-Prüfung des Drei-Höhen-Snapshots und identischer
  Datenzeiten; ein Netzabruf für alle sechs Windvariablen;
- automatisierte Browseraufgabe: exakt ein Windrequest vor und nach Vergleich
  und Replay, zwei Profilzeilen (`cloud`, `seed`), zwei Routen, Vorhersage,
  Ursache und Animationsreset;
- sichtbare Mobile-Prüfung 390 × 844 mit echtem Live-Snapshot: Wolke 208 km,
  Samen 196 km kürzer, zwei deutlich getrennte Linien in der Routenlupe,
  Karte während der Vergleichsaktion bei `top=8`, `bottom=214,33`,
  `data-progress=1.00`, 0 Overflow;
- fokussierter lokaler Browserlauf nach den Korrekturen: 11/11 Tests grün;
  zusätzlicher 180 × 400-CSS-Pixel-Reflow (entspricht der 360 × 800-
  200-%-Grenze) ohne geclippte Flugraum-, Vergleichs- oder Aktionsinhalte.

Outcome: Der zweite Flug ist ein fairer, erklärbarer Vergleich auf demselben
Daten-Snapshot. Unterschiedliche Profile erzeugen sichtbar unterschiedliche
Routen; Vorhersage und Replay schaffen einen natürlichen Wiederholungsreiz,
ohne die Modellgrenze zu verschleiern.

### Datenschutzbefund der v1.1-Migration

Das zweckweise Inventar steht in `docs/PRIVACY_STORAGE_INVENTORY.md`. Wolkenpost
hat keine Cookies, kein Tracking und keine optionale Speicherung; daher gibt es
keinen Banner. Ein nicht notwendiger Session-Offline-Merker wurde entfernt.
Notwendig bleiben ausschließlich der lokale App-/Sprachzustand und der
versionierte PWA-Assetcache. Die Datenschutzinformation ist dauerhaft sichtbar.

### Finales lokales Gate auf v1.1.2

- Shared-Validatoren: Shell v2.0.3 PASS, Layout v1.1.0 PASS und Essentials
  v1.1.2 PASS; der Essentials-Lock enthält exakt sechs Artefakte einschließlich
  vendortem Schema und portablem Verifier.
- Vitest: 22/22; Standard- und GitHub-Pages-Build PASS.
- Playwright: 50 anwendbare Fälle PASS, 102 bewusst profilbedingt übersprungen,
  0 Fehler. Enthalten sind Smartphone hoch/quer, Tablet, Desktop, Maus,
  Pointer-Abbruch, Tastatur, Offline/Resume, Timeout, verweigerte Ortung,
  Reduced Motion, Axe, DE/EN-Persistenz und der exakte 180 × 400-CSS-Pixel-
  Reflowfall für 360 × 800 bei 200 %.
- Pages-Artefakt: PASS für vier externe Essentials-Runtimedateien, CSP/MIME,
  Service-Worker-Cache und alle sechs Quell-Lockdateien. `public/icon.svg` und
  `dist/icon.svg` sind byteidentisch mit SHA-256
  `35b7213e031d3c749f3f38996934b20c559c983204e0b150a22119c935c05a59`.
- Sichtbare Abschlussprüfung: Desktop 1440 × 900 mit echtem Open-Meteo-Abruf
  (229-km-Wolkenflug, 14-km-Samenvergleich), Modellgrenze, Vorhersage und
  Ursache lesbar; Mobil 390 × 844 beziehungsweise 375 CSS-Pixel mit Karte
  `top=12,39`, `bottom=218,72`, Ergebnisfokus `result-heading`, Routenlupe und
  0 Overflow; schmaler Reflow ohne geclippte Flugraum-/Aktionsinhalte.
- Deutsch/Englisch einschließlich Reload, permanente Datenschutzinformation,
  No-Login-Grenze und Browserkonsole blieben fehlerfrei.
- Die erste Linux-CI auf dem finalen Pin deckte eine veraltete Race-
  Testannahme auf: Bei absichtlich verzögertem Bootstrap darf das Gate nicht
  voraussetzen, ob das unabhängige App-Modul hinter dem deckenden Loader bereits
  ausgewertet wurde. Der Regressionstest prüft stattdessen den weiterhin
  sichtbaren, autoritativen Loader und anschließend den fehlerfreien sichtbaren
  Handoff nach Freigabe des Bootstrap.
- Ein vollständiger lokaler Rerun deckte außerdem auf, dass das Share-Gate eine
  absolute Viewport-X-Koordinate statt die Geometrie im eigenen Aktionscontainer
  verglich. Bei unveränderter Größe und Y-Lage verschob eine dokumentweite
  Scrollbar-/Zentrierungsänderung den absoluten Wert. Das Gate misst nun Größe
  und relative Containerposition über Native-, Clipboard- und Abbruchpfad;
  dadurch bleibt die geforderte lokale Layoutstabilität präzise geprüft.
- Der parallele Linux-Push-Lauf reproduzierte schließlich eine seltene echte
  Bootstrap-Reihenfolgeflanke beim Sprach-Reload: React konnte den Ready-Handoff
  erreichen, bevor der globale Essentials-Controller gesetzt war. Die App wartet
  jetzt ohne Polling auf die Definition des vendorten Share-Elements und ruft
  danach weiterhin ausschließlich `globalThis.milosAppEssentials.ready()` auf.
  Das verzögerte Bootstrap-Gate prüft zusätzlich, dass dabei kein Page- oder
  Konsolenfehler entsteht.

## Runde 11 – prominenter Länder-Flugraum, Umrisse und Windentscheidung

Basis ist der portal-verifizierte öffentliche DEV-Stand
`ddaffbd268580f8415fb22a47bafef50ee8be6d2`. Die Änderung liegt lokal auf
`codex/cloud-post-map-flight-details` und übernimmt atomar
`public-app-essentials/v1.1.3` aus Shared-Commit
`babe74a0e62e1a7f9095648195e54b322a837726`. Eine externe Veröffentlichung
erfolgt erst nach dem vollständigen App- und Pages-Gate.

### Baseline und Nutzeraufgaben

Simulierte frische Nutzeraufgaben:

1. Für jede Flugart eine erkennbar andere Grundform wählen und anschließend
   frei weiterzeichnen.
2. Einen Start anhand von Ländern finden, Windstärke und -richtung vor dem
   Start vergleichen und bei Bedarf bewusst einen anderen Ort wählen.
3. Nach dem Flug erkennen, an welchen großen Orten oder Wahrzeichen die grobe
   Modellroute vorbeikam, ohne daraus einen exakten Überflug abzuleiten.

Gemessene Baseline: Am Desktop teilten sich Zeichnung und Karte Spalten von
447/547 px; die Weltkarte maß nur 527×297 px. Mobil begann sie erst bei rund
`y=1182` und maß 293×206 px. Die groben handgezeichneten Kontinente hatten
keine Ländergrenzen. Eine Windstärke war erst nach dem Flug lesbar, Umrisse
waren nicht auswählbar und Routenorte fehlten.

### Visuelle QA-Runde 1

Änderungen:

- Primärarbeit einspaltig; die Karte folgt als eigener vollbreiter Flugraum
  unter der intern kompakten Zeichenwerkstatt.
- Je Flugart drei SVG-vorgeschaute Umrisse als echte Radiogruppe; eine Auswahl
  ersetzt die Zeichnung deterministisch, freies Weiterzeichnen bleibt möglich.
- 177 lokal gebündelte Natural-Earth-Länder mit Küsten und Grenzen ersetzen die
  groben Eigenpolygone; keine Tiles oder Laufzeit-Kartenanfrage.
- Eine Windvorschau zeigt 10 m, 925 hPa und 850 hPa mit Richtung,
  Geschwindigkeit, Stärke, Balken und markiertem Flugprofil. Start am
  unveränderten Ort verwendet genau diesen Snapshot und erzeugt keinen zweiten
  Windrequest.
- Eine lokale CC0-Liste bekannter Wahrzeichen plus bestehende Großortliste wird
  gegen den nächsten Routenpunkt geprüft. Nummern in der Karte und eine
  DE/EN-Liste nennen nur grobe Nähe innerhalb 70/95 km.

Browsermessung Desktop 1440×900 (tatsächlicher Client 1425): Weltkarte
994×497 px, `data-country-count=177`, vollständig unter der Zeichenfläche und
ohne horizontalen Overflow. Mobil 390×844 (Client 375): Karte 293×270 px,
Windbereich 293×484,5 px, 0 Overflow und 0 sichtbare Ziele unter 44 px.

Gefundene Befunde und Korrekturen:

- Der Leerlauf wiederholte die Windbeschreibung in einem zweiten Statusblock;
  der redundante Block wurde entfernt.
- Die Routenlupe war halbtransparent und ließ fremde Weltregionen als scheinbare
  Linsengeografie durchscheinen. Sie erhielt einen opaken, themengerechten
  Hintergrund, ein Orientierungsraster und wechselt auf die dem Start
  gegenüberliegende Kartenseite.
- Der visuelle Kompass nahm im extremen Textreflow zu viel Breite ein; unter
  240 CSS-Pixeln entfällt ausschließlich diese dekorative Doppelung, während
  Richtungstext und Windbalken erhalten bleiben.

### Visuelle QA-Runde 2 und vollständiges lokales Gate

Frischer echter Open-Meteo-Lauf bei 1440×900: Länder, Start, Route,
Routenlupe, Windpfeil, Profil und Modellgrenze gleichzeitig lesbar; 994×497 px,
0 Overflow. Bei 390×844/Client 375 blieben Länderkarte, drei Windhöhen,
markiertes Profil, Datenzeit und Startaktion vollständig sichtbar und
touchfähig. DE/EN, Dark Mode, Reduced Motion und 180×400 CSS-Pixel als
360×800@200-%-Äquivalent blieben ohne Clipping.

Automatisierte Evidenz:

- Shell v2.0.3, Layout v1.1.0 und Essentials v1.1.3 Validatoren PASS;
- Vitest 28/28 in acht Dateien, darunter Umriss-Klonung,
  Windstärkengrenzen/-richtungen und Wahrzeichenchronologie;
- Playwright 52 anwendbare Fälle PASS, 108 bewusst profilbedingt übersprungen:
  Smartphone hoch/quer, Tablet, Desktop, Touch/Pointer/Maus/Tastatur,
  Pointer-Abbruch, langsames Netz/Timeout/Offline/Resume, verweigerte Ortung,
  Axe, DE/EN+Reload, Reduced Motion, CSP/MIME und 200-%-Reflow;
- neuer Produktgate: drei Umrisse pro Flugart, Weltkarte nach statt neben der
  Zeichnung, Breite >900 px am Desktop, 177 Länder, drei Windhöhen, markiertes
  Profil und exakt ein Windrequest für Vorschau plus Start;
- Share-Geometrie nach Native-/Clipboard-/Abbruchpfad zusätzlich 5/5 stabil
  wiederholt; der app-eigene Exportknopf besitzt am Desktop nun eine konstante
  Mindestbreite und reflowt mobil weiter auf 100 %;
- Standardbuild PASS; GitHub-Pages-Build und `verify:dev-artifact` PASS. Der
  finale kombinierte Rerun auf dem atomar synchronisierten v1.1.3-Pin bestätigt
  den HTML-Fallback sowie berechnete 32×32 px bei 1440×900, 390×844 und
  180×400 CSS-Pixeln als 360×800@200-%-Äquivalent. Quell- und Build-Icon sind
  byteidentisch mit SHA-256
  `35b7213e031d3c749f3f38996934b20c559c983204e0b150a22119c935c05a59`.
- Ein erster kombinierter Lauf startete unter gleichzeitiger Windows-Last
  keinen der acht Vitest-Worker und führte folglich null Tests aus. Der
  unveränderte isolierte Wiederholungslauf bestand anschließend 28/28; Build
  und die vollständige Browsermatrix liefen danach auf demselben Stand grün.
- Das erweiterte Artefaktgate fand dabei einen echten Offline-Randfall: Der neu
  ausgelieferte Drittanbieter-Lizenzhinweis war im Build vorhanden, aber noch
  nicht Teil des Service-Worker-App-Shell-Caches. `THIRD_PARTY_NOTICES.txt`
  wird nun explizit vorgehalten; der anschließende Pages-Build und das
  Fail-closed-Artefaktgate sind grün.
- Ein echter Windows-Recheckout mit `core.autocrlf=true` bestätigte zunächst den
  neuen Essentials-v1.1.3-Sechserlock, schrieb aber die älteren vendorten
  Shell- und Layouttexte mangels enger Vendorregel nach CRLF um. Beide
  Vendorverzeichnisse besitzen nun ebenfalls `* text eol=lf`; im wiederholten
  frischen Checkout melden alle drei Vertragsverzeichnisse `i/lf w/lf`, und
  Shell-, Layout- sowie Essentials-Verifier bestehen gemeinsam.
- Die erste Linux-CI maß bei 320 CSS-Pixeln 337 px Dokumentbreite, während der
  identische Windows-Lauf mit 320/320 gerade noch grün blieb. Die Diagnose
  zeigte einen bereits intern überbreiten `Papierflieger`-Text in der
  zweispaltigen Objektwahl. Griditem und Textspalte dürfen nun schrumpfen und
  lange deutsche Komposita bei Bedarf umbrechen; das fokussierte Gate prüft
  zusätzlich jede Objektoption auf eigene Scrollbreite.
- Zwei identische docs-only CI-Läufe lieferten beim nativen Share-Abbruch einmal
  PASS und einmal einen um 14,72 px verschobenen Shareknopf bei unveränderter
  eigener Größe. Die erste Härtung auf `data-visible=false` belegte, dass nicht
  die Shared-Komponente, sondern der davor stehende Exportknopf während der
  asynchronen Payload-Erzeugung noch zwischen „Ergebnisbild speichern“ und
  „Grafik wird erstellt …“ wechselte. Eine feste, mobil weiter reflowende
  14-rem-Breite deckt beide DE/EN-Labels ab; das Gate wartet zusätzlich auf den
  autoritativen Sharezustand.

Outcome: Karte und Wind sind nun eine echte Startentscheidung statt eine kleine
Nebenanzeige. Länder geben Orientierung, Umrisse liefern sofort spielerische
Variation, und Routenorte schaffen Erzählwert, ohne Navigation oder exakte
Ballistik vorzutäuschen.

## Contract-QA – Shell-Icon-Übergang mit Essentials v1.1.5

Der app-eigene Shell-Slot deklariert intrinsisch 38 × 38 px. Der atomare Sync
auf `public-app-essentials/v1.1.5` aus Shared-Commit
`2942132ad3bf6cf39edc9f52ed918de6a230be23` ersetzt den vorherigen
40-px-Critical-CSS-Floor durch die gemeinsame 38-px-Grenze. Shell v2.0.3,
Layout v1.1.0, Loaderfunktion und Fachoberfläche bleiben unverändert.

Automatisierte Evidenz der Contract-Stufe:

- Essentials-v1.1.5- und Shell-v2.0.3-Verifier PASS;
- fokussierter Playwright-Lauf 2/2 PASS: frischer verzögerter Start sowie
  getrennt blockiertes Shell-Bootstrap und Shell-Komponenten-CSS;
- bei 390 × 844: Essentials-CSS geladen und Shell undefiniert ergibt ein
  verborgenes 38 × 38-Slot-SVG; nach Upgrade bei noch blockiertem
  Komponenten-CSS ist es sichtbar und 38 × 38; nach CSS-Last bleibt es exakt
  38 × 38;
- der getrennte Essentials-Loader misst im Startzustand exakt 32 × 32 px;
- 180 × 400 CSS-Pixel als 360 × 800@200-%-Äquivalent bleiben ohne
  horizontalen Überlauf; Endzustand weiterhin 38 × 38;
- Standardbuild sowie GitHub-Pages-Build und `verify:dev-artifact` PASS; der
  Service Worker verwendet wegen stabiler Vendor-URLs den neuen Cachepräfix
  `wolkenpost-essentials-v1.1.5-*`;
- echter temporärer Windows-Recheckout mit `core.autocrlf=true`: alle Dateien
  im Essentials-Vendorordner `i/lf w/lf`; Essentials- und Shell-Verifier PASS.

## Interaktive Windkarte - zwei sichtbare Runden

Runde 1 pruefte den neuen zusammenhaengenden Bedienfluss auf Desktop und
Smartphone: Figur per Maus/Touch verschieben, Wind nach der Startwahl auf der
Karte, Welt-/Laenderansicht, Zoom und Spielwind. Der Pointer-Abbruch schreibt
keinen Start; vier Kartenknopfe messen jeweils mindestens 44 x 44 px. Ein
Unit-Gate belegt, dass Faktor 2 die Distanz deutlich vergroessert, aber
Punkt-, Durchschnitts- und Maximalwind unveraendert laesst.

Runde 2 pruefte die sichtbare Laenderkarte bei 1440 x 900 und 390 x 844 sowie
den 360 x 800@200-Prozent-Fall. Laenderlinien behalten beim Zoom ihre
Bildschirmstaerke; Berlin, Figur, Richtungsbahnen und km/h-Badge sind gemeinsam
lesbar. Der Reflow blieb bei 180/180 CSS-Pixeln ohne horizontalen Overflow.
Das bestehende Gameplay-Gate fand einen begrenzenden Toolbar-Wrapper, durch
den die Sticky-Karte beim Vergleich aus dem Viewport rutschte. Nach der
`display: contents`-Korrektur bestanden Route-im-Blick, Vergleich/Replay und
mobiler/200-Prozent-Reflow 3/3.

Automatisierte Evidenz auf dem lokalen Featurestand:

- Vitest 32/32 PASS;
- Standardbuild PASS;
- Karten-/Windinteraktion Desktop und Phone 4 anwendbare Faelle PASS;
- Gameplay Desktop 3/3 PASS;
- Eingabematrix Smartphone hoch/quer, Tablet, Desktop 12/12 PASS;
- Resilienzgate 6 anwendbare Faelle PASS: Abbruch, Netzwerk, Timeout,
  verweigerte Ortung, Offline/Demo und App-Resume;
- Accessibility/Export/PWA 6 anwendbare Faelle PASS: DE/EN, Hell/Dunkel,
  Reduced Motion, 320-Reflow, privater PNG-Export und Offline-Shell;
- visuelles Layoutgate Desktop/Dark/375/390/EN/200-Prozent 6/6 PASS.

## Verbleibende Prüfgrenzen

- Keine echte Betriebslast oder API-Quota-Prüfung; nur ein einzelner echter
  Live-Abruf und deterministische Testfixtures.
- Keine reale Screenreader-Ausgabe mit menschlicher Assistive-Technology-
  Bewertung; Semantik, Fokus und Axe sind automatisiert geprüft.
- Keine Production-Prüfung oder -Änderung.

## Flight-adventure Stufe 1 - Kartenbuehne und Reichweite

Die Nutzerfreigabe begrenzt diese Iteration bewusst auf den neuen Spielkern;
Fotopostkarten, Reisepass, Missionen, Geisterrouten und optionale Geraeusche
bleiben bis zum direkten Nutzertest auf der dokumentierten Agenda.

Sichtbare Runde 1 pruefte den Startzustand. Auf Desktop bleibt die Karte 500
Pixel hoch und das Wind-/Reichweiten-Widget liegt kompakt rechts auf der
Kartenflaeche. Auf 390 x 844 dockt das Widget unter der 320 Pixel hohen Karte
an; Start, Windpruefung und 1/4/10-Reichweite sind ohne Kartenverlust
bedienbar. Der Screenshot zeigte keine Karten-in-Karten-Kaskade und keinen
horizontalen Overflow.

Sichtbare Runde 2 pruefte den laufenden Abenteuerflug auf 390 x 844 mit einem
deterministischen Windfixture. Die Kamera folgte aktiv (`data-follow-flight`
`true`), passte den sichtbaren Routenabschnitt bis Zoom 4,17 ein und hielt
Laendergrenzen, Route, Figur, Richtung und Routenlupe im Flugraum. Gemessene
Dokumentbreite: Client/Scroll 390/390. `Gesamte Route zeigen` und
`Flug folgen` bleiben getrennte, mindestens 44 Pixel grosse Aktionen.

Automatisierte Evidenz vor dem finalen Publish:

- Vitest 32/32 PASS;
- Standardbuild PASS;
- fokussiertes Karten-/Windgate auf Desktop und Phone: 4 anwendbare Faelle
  PASS, einschliesslich Drag, Pointer-Abbruch, Laenderfokus, Zoom, Reichweite,
  sichtbaren Sehenswuerdigkeiten, Folge-Modus und mobilem Overflow;
- Gameplay einschliesslich Vergleich, Replay, Sticky-Kartenbuehne und
  200-Prozent-Reflow 3/3 PASS;
- visuelles Vertragsgate Desktop, Dark, 375, 390, EN und 360x800@200 Prozent
  6/6 PASS;
- Accessibility/Export/PWA und Resilienz jeweils 6/6 anwendbare Faelle PASS.

## Design-Follow-up - ruhige Kartenbuehne und kompakte Ergebnisse

Der direkte Nutzerscreenshot zeigte trotz funktionaler Karte drei sichtbare
Probleme: ein zu grosser Windbereich ueber der Route, einen inneren
Scrollbalken im Widget und eine sticky Kartenbuehne, die den Ergebnistext beim
Seitenscrollen verdraengte. Die Agenda fuer weitere Spielmodule bleibt deshalb
bewusst pausiert; dieser Stand aendert nur Layout und Lesefluss.

Sichtbare Runde 1 am lokalen Build: Die Arbeitsflaeche nutzt am
1280-Pixel-Browser 56,5 Pixel Aussenabstand und 1152 Pixel Inhaltsbreite. Die
Karte misst 994 x 520 Pixel. Der verbundene Start-/Winddock liegt ausserhalb
der Kartenflaeche, misst im bereiten Windzustand 962 x rund 231 Pixel und hat
keinen inneren Scrollbereich (`overflow-y: visible`, Client/Scroll identisch).
Die Toolbar bleibt frei auf der Karte; reale Windwerte und die getrennte
Spielweite bleiben vollstaendig erhalten.

Sichtbare Runde 2 bei 390 x 844: Karte, Startort, Windentscheidung und Suche
stapeln in einer durchgehenden Lesereihenfolge ohne horizontales Clipping. Die
Ergebnisflaeche verwendet am Desktop ein kompaktes Zweispaltenraster, faellt
mobil auf eine Spalte zurueck und behaelt vier Kennzahlen als 2-x-2-Gruppe. Die
Karte bleibt beim Ergebnis relativ statt sticky; der programmatisch fokussierte
Ergebnistitel wird mit Headerabstand in den sichtbaren Bereich gescrollt.

Fokussierte Regression prueft Desktop und Phone auf Widgetbreite, fehlenden
inneren Scroll, Ergebnisfokus, relative Kartenposition, Vergleich/Replay,
200-Prozent-Reflow und horizontalen Overflow. Fachlogik, Windmodell,
Karteninteraktion, Shared-Pins und Productiongrenze bleiben unveraendert.

Der erste vollstaendige CI-Lauf fand zusaetzlich am iPad-Mini-Profil nach dem
Flug 792 statt 769 CSS-Pixel Dokumentbreite. Ursache war die zweispaltige
Desktopanordnung des bereiten Winddocks knapp oberhalb des mobilen Breakpoints.
Der Dock stapelt deshalb bis 820 Pixel; die gezielte Tablet-Reise besteht danach
3/3 ohne Overflow.

## Reise-Arbeitsplatz und Agenda-Paket

Dieser Abschnitt ersetzt die frühere Follow-up-Aussage, die Karte bleibe
grundsätzlich relativ und weitere Spielmodule seien pausiert. Der direkte
Nutzervergleich mit „Irgendwo ist gerade“ führte zu einem klaren
Arbeitsplatzprinzip: Auf breiten Viewports steht links eine ruhige, 320 Pixel
breite Steuerspur; rechts erhält die Karte den verbleibenden Raum. Auf kleinen
Viewports bleibt die lineare Lesereihenfolge erhalten.

### Sichtbare Runde 1 – Start und Planung

- 1440 × 1000: Arbeitsbereich 1152 Pixel, linke Steuerspur 320 Pixel,
  Kartenfläche mindestens 800 × 600 Pixel; kein horizontaler Overflow und kein innerer
  Widget-Scroll.
- „Dein Reisender · Was fliegt heute?“, „Der Startpunkt · Wo geht die Reise
  los?“ sowie „Wind vor dem Start · Wie kräftig trägt der Wind hier?“ bleiben
  jeweils in einer kompakten Titelzeile.
- Der erste Reflow-Lauf fand bei 180 CSS-Pixeln vier nur rund 32 Pixel breite
  Objekttasten. Die Auswahl wird dort nun einspaltig; alle sichtbaren Ziele
  messen wieder mindestens 44 Pixel. Der gezielte 360 × 800@200-%-Lauf ist
  danach ohne Überlauf oder geclippten sichtbaren Text grün.

### Sichtbare Runde 2 – Flug, Ergebnis und Reisejournal

Ein echter Open-Meteo-Flug ab München wurde im In-App-Browser ausgeführt. Vor
dem Ergebnis ist die Karte 600 Pixel hoch; im Ergebniszustand wird sie zum
kompakten Leserahmen von 345,6 Pixeln. Kartenunterkante 361,6 Pixel und
Ergebnistitel-Oberkante 374,5 Pixel belegen, dass Fokus und Ergebnis nicht mehr
hinter der sticky Karte liegen. Dokumentbreite blieb bei 1265/1265 Pixeln.

Das neue Reisejournal zeigt danach den lokalen Reisepass, eine reproduzierbare
Tagesmission und ein aus demselben Snapshot abgeleitetes Reiseereignis. Eine
Fotopostkarte erscheint ausschließlich, wenn die Modellroute an einem dafür
vorhandenen, klar lizenzierten Motiv vorbeiführt; sonst wird die fehlende
Fotogelegenheit ehrlich benannt. Die Nutzerzeichnung liegt dabei als
transparente SVG-Spur über dem lokalen JPEG statt als weißer Screenshotblock.

### Automatisierte Evidenz

- Vitest: 10 Dateien, 38/38 PASS einschließlich Speicherung, Mission,
  Reisepass, reproduzierbarem Ereignis und Fotopostkarten-Markup.
- Essentials v1.1.5, Shell v2.0.3 und Layout v1.1.0: Verifier jeweils PASS.
- Build: TypeScript/Vite PASS.
- Karten-, Gameplay-, Accessibility-/Export-/PWA- und Shell-Gate auf Desktop
  und Phone: 17/17 anwendbare Fälle PASS.
- Eingabematrix Smartphone hoch/quer, Tablet und Desktop: 12/12 PASS.
- Essentials-/Place-/Lifecycle-Gates sowie sechs visuelle Vertragsfälle:
  30 zusätzliche anwendbare Läufe PASS; darin DE/EN, Dark Mode, 375/390,
  320-Reflow, 360×800@200 %, Keyboard/Pointer/Pointer-Abbruch, Offline und
  Share-Abbruch.
- Der DEV-Artefaktprüfer verlangt beide lokalen Fotodateien bytegleich im
  Build, die zugehörigen Drittanbieterhinweise und beide Offline-Cachepfade.

Prüfgrenzen bleiben ehrlich: Die Landmarken-Fotomontage ist nur für die zwei
lokal vendorten Motive Eiffelturm und Kölner Dom verfügbar. Route, Wind und
„vorbeigeflogen“-Hinweise sind weiterhin eine spielerische Modellierung, keine
Navigation oder exakte Ballistik.

Der erste Linux-CI-Lauf machte zwei Windows-lokal nicht sichtbare
Schriftmetriken transparent: 12 Pixel Überbreite nach dem Flug bei 320 Pixeln
und eine zu starre 22-Pixel-Testannahme für die kompakten Titel. Textblöcke im
Ergebnis-/Reisejournal erhalten deshalb unter 390 Pixeln jetzt einen echten
Umbruchpuffer. Der Shell-Gutter nutzt dort den vorgesehenen App-Token mit vier
Pixeln und verhindert die zusätzlich aus dem Shadow-DOM stammende Überbreite,
ohne die Karte auf normalen Mobilbreiten einzuengen.
Das Titelgate prüft eine gemeinsame `nowrap`-Zeile samt fehlendem
Scrollüberlauf statt einer betriebssystemspezifischen absoluten Höhe. Die
gezielte Regression besteht 320, 375, 390 und 360×800@200 %.

## Breiter Desktop-Arbeitsplatz

Das Nutzerfeedback nach der ersten öffentlichen Runde zeigte, dass die
72-rem-Shellgrenze für diese kartenbetonte App zu viel ungenutzten Außenraum
ließ. Wolkenpost setzt deshalb ausschließlich den dokumentierten app-eigenen
Shell-Token auf 100 rem; Shell v2.0.3 und seine Vendorbytes bleiben unverändert.
Die Arbeitsfläche wahrt 16 Pixel Außenabstand und nutzt bei 1440 Pixeln
1408 Pixel. Die linke Steuerspur bleibt lesbare 320 Pixel breit, während die
Karte von 804 auf 1060,4 Pixel wächst.

Das responsive Gate belegt 1440×1000, 390×844, 375×844, 320 CSS-Pixel und
360×800@200 % ohne horizontalen Overflow. Der Desktop-Geometrievertrag verlangt
mindestens 94 Prozent Fensterbreite und eine Kartenbreite über 900 Pixel;
Mobilreihenfolge, Touchziele, Intro- und Einstellungsbudgets bleiben unverändert.
