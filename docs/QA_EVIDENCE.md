# Wolkenpost QA-Evidenz

Stand: 30. Juli 2026, Branch `codex/cloud-post-dev`

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

## Nicht extern testbar

- Kein externes HTTPS-DEV-Deployment, weil weder Hostingziel noch Zugangsdaten
  oder eigene GitHub-Remote eingetragen sind.
- Keine echte Betriebslast oder API-Quota-Prüfung; nur ein einzelner echter
  Live-Abruf und deterministische Testfixtures.
- Keine reale Screenreader-Ausgabe mit menschlicher Assistive-Technology-
  Bewertung; Semantik, Fokus und Axe sind automatisiert geprüft.
- Keine Production-Prüfung oder -Änderung.
