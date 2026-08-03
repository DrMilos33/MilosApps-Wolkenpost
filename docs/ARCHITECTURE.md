# Wolkenpost-Architektur

Stand: 3. August 2026

## Stack und Grenze

- React 19 und TypeScript 7 für klar getrennte Zustands- und Interaktionslogik;
- Vite 8 für lokalen DEV-Server und statischen Build;
- Natural-Earth-110-m-Ländergeometrie über fest gepinntes `world-atlas` sowie
  `d3-geo`/`topojson-client` für die lokale Canvas-Darstellung; keine Tiles und
  kein Karten-Netzaufruf;
- keine Serverkomponente, App-Datenbank oder Anmeldung;
- `public-app-shell/v2.0.3` als feste, lokal vendorte Build-Abhängigkeit mit
  Manifest und SHA-256-Lock; kein CDN, kein Runtimeimport und keine gemeinsame
  Datenbank;
- `public-app-layout/v1.1.0` als davon getrennte, lokal vendorte
  Inhaltslayout-Abhängigkeit mit Profil `guided-flow` und eigenem Lock;
- `public-app-essentials/v1.1.3` als dritter, separat gepinnter Vertrag für
  Startscreen, Datenschutz, Teilen und explizite Ortssuche;
- Browser-Lokalspeicher ausschließlich für Zeichnung, Einstellungen und den
  groben letzten Startpunkt;
- Service Worker für den App-Shell-Offlinebetrieb;
- Vitest für reine Logik und Playwright für reale Browserinteraktion.

Die App ist eine einzelne Route. Der Build kann später statisch auf einem
eigenständigen Dienst liegen. Portal und App importieren keinen Quellcode
voneinander.

## Öffentliche App-Shell und Sprache

`milos-app.json` ist die app-eigene Metadatenquelle für den Vertrag
`public-app-shell/v2`. Der Sync aus dem unveränderlichen Shared-Tag
`public-app-shell-v2.0.3` kopiert Web Component, externe Shadow-CSS,
app-spezifische Theme-CSS, Bootstrap und portablen Validator nach
`vendor/milosapps-shell/v2/`. `shell-lock.json` bindet diese Kopie an
Shared-Commit `ed898412306e22c6ae1b10ee8953df29f8acd627` und die
Artefakt-Hashes. CI und
DEV-Deployment validieren Manifest, Einstiegspunkt, Lock und Hashes vor dem
Build.

Bootstrap und Komponente laden ihre CSS-Dateien relativ zu `import.meta.url`.
Damit bleibt auch GitHub-Pages-Unterpfadhosting unter
`default-src 'self'; script-src 'self'; style-src 'self'` funktionsfähig. Die
Shell injiziert weder `<style>` noch `style`-Attribute, setzt keine
Laufzeit-CSS-Properties und benötigt kein `unsafe-inline`, Nonce oder Hash.
Der Vite-Build behandelt den Bootstrap mit `vite-ignore` als unveränderte
Runtime-Grenze und kopiert Bootstrap, Komponente sowie beide Stylesheets unter
ihren festen Vendorpfad in das statische Artefakt. Die DEV-Artefaktprüfung
vergleicht alle vier ausgelieferten Dateien erneut mit `shell-lock.json` und
prüft, dass der Service Worker jeden Runtimepfad cached.

Die Shell besitzt Header, Footer, absolute umgebungsabhängige Portal- und
Rechtslinks sowie die Sprachpersistenz unter
`milosapps.cloud-post.language`. Die App besitzt ihr Inline-SVG und sämtliche
Fachtexte. `src/main.tsx` hört auf `milosapps:localechange` und initialisiert
zusätzlich aus `document.documentElement.lang`, damit der erste Render und ein
Reload nicht vom Zeitpunkt des Initialevents abhängen. Deutsch und Englisch
verwenden strukturgleiche Wörterbücher; Ortsnamen, dynamische Meldungen,
Exporttexte und zugängliche Namen werden gemeinsam umgeschaltet.

## Kompaktes Inhaltslayout

`milos-layout.json` pinnt `public-app-layout/v1.1.0` auf Shared-Commit
`55b649d997489ca703682679257ac1a5b790bdc7`. Der Shared-Sync erzeugt unter
`vendor/milosapps-layout/v1/` die frameworkneutrale Layout-CSS, die aus den
app-eigenen Grün-/Creme-Tokens erzeugte Theme-CSS, den portablen Validator und
`layout-lock.json`. Der Lock bindet genau diese drei Laufzeitartefakte per
SHA-256; es gibt weder CDN noch Runtimeimport aus dem Shared-Repository. Der
bestehende Fünf-Artefakt-Lock der App-Shell bleibt davon unabhängig.

Die React-Struktur markiert Intro, Primärarbeit, Schritte, Aktionen, Ergebnis
und sekundäre Einstellungen semantisch mit den Vertragsattributen. Die
Primärarbeit ist bewusst einspaltig: Die Zeichenfläche darf intern am Desktop
Bedienung und Canvas nebeneinander stellen, die Weltkarte folgt jedoch als
eigener, vollbreiter Flugraum. Mobil und bei hohem Textzoom reflowen auch die
Zeichenwerkzeuge einspaltig. Wolkenpost behält Zeichenfläche, Weltkarte und
redaktionelle Typografie, verwendet aber nur eine gemeinsame visuelle
Arbeitsfläche statt verschachtelter Karten. Die Orbit-Wolke ist mit
`data-milos-intro-icon` als kompakte Identitätsstütze begrenzt. Darstellung,
Bewegung, Startton und lokale Löschung verwenden den eigenen kompakten
Settings-Baustein und werden progressiv offengelegt.

Der Vite-Build kopiert beide Layout-CSS-Dateien unter ihren festen
Same-Origin-Pfad. Die DEV-Artefaktprüfung vergleicht ihre Hashes mit dem
Layout-Lock und verlangt beide Pfade im Service-Worker-Cache. Der Browser-Gate
misst am echten Build `[data-milos-intro]` und
`[data-milos-primary-work]`, prüft 1440 × 900, 390 × 844 und den
360 × 800@200-%-Reflow sowie strikte `style-src 'self'` ohne Inline-Ausnahme.

## Öffentliche Essentials

`milos-essentials.json` pinnt `public-app-essentials/v1.1.3` auf den
unveränderlichen Shared-Commit
`babe74a0e62e1a7f9095648195e54b322a837726`. Der Sync erzeugt unter
`vendor/milosapps-essentials/v1/` Bootstrap, Web Component, Basis-/Theme-CSS,
portablen Verifier, das vendorte Manifestschema und `essentials-lock.json`.
Der Sechs-Artefakt-Lock bleibt
von Shell und Layout getrennt. Der Build kopiert alle vier Browserdateien unter
ihrem festen Same-Origin-Pfad; beide CSS-Dateien bleiben als externe
`<link>`-Elemente im gebauten HTML. Artefaktprüfung und Service Worker prüfen
Pfade und SHA-256 fail-closed. Es gibt weder `data:`-Inlining noch CDN- oder
Shared-Runtimeimport.
Eine ausschließlich in diesem Vendorordner geltende `.gitattributes` erzwingt
LF und schützt die bytegenauen Hashes auch bei einem Windows-Recheckout mit
aktivem `core.autocrlf`.

Der physische Loader-Iconpfad `public/icon.svg` und die ausgelieferte
Same-Origin-URL `icon.svg` sind getrennt im Manifest festgelegt. Der
Quell-Validator prüft die physische SVG-Datei; das Pages-Artefakt- und
HTTP-Gate verlangt `image/svg+xml` und Byteidentität mit der Quelldatei.

Der CSS-first Startscreen besitzt nur ein kleines App-Icon und verwendet für
`data-milos-loading-title` bewusst ein `<p>` statt einer zweiten
Dokumentüberschrift. Die React-App meldet sich erst nach dem ersten React-
Commit über die race-sichere API `globalThis.milosAppEssentials.ready()`
bereit. Der Essentials-Bootstrap ist das erste Modul im Quelldokument und
puffert die Bereitschaft deterministisch; direkte `milosapps:ready`-Dispatches
gibt es nicht. Bei einer tatsächlich fehlenden Runtime bleibt der Startscreen
ehrlich sichtbar.

Wolkenpost zeigt in `no-cookies`-Betrieb keinen Banner und keine Schein-
Einwilligung. Eine dauerhaft sichtbare app-eigene Datenschutzinformation
verlinkt exakt auf die dokumentierte HTTPS-Adresse; ein früherer Dismiss-
Schlüssel wird datenminimierend entfernt und nicht neu geschrieben.
Die gemeinsame Teilen-Funktion erhält das bestehende PNG als Datei und eine
kanonische URL ohne Query, Hash oder private Zustandsdaten. Sie nutzt natives
Teilen, Clipboard-Fallback und behandelt Nutzerabbruch still.

Die gemeinsame Ortssuche ist ausschließlich die zugängliche, explizit
ausgelöste Oberfläche. Ihr Provider bleibt app-eigen und offlinefähig: Er
sucht in der handkuratierten Ortsliste und normalisiert Ergebnisse zu Name,
Region und Land. Die getrennte Ortung wird weiterhin erst auf Nutzeraktion
angefragt und übernimmt keine exakten Koordinaten in Export oder Teil-URL.
Wolkenpost aktiviert kein Datumsmodul.

## Windabruf

Pro Live-Start wird eine gebündelte Open‑Meteo-Anfrage mit neun Punkten rund um
den grob gewählten Start gestellt. Die Koordinate wird vorher auf 0,25 Grad
gerundet. Es werden 36 Stunden eines festen globalen Modells angefordert.

Objekte verwenden unterschiedliche, sichtbare Flugprofile:

| Objekt | Windniveau | Modellzeit | Driftfaktor |
|---|---:|---:|---:|
| Wolke | 850 hPa, ungefähr 1,5 km | 18 h | 0,90 |
| Ballon | 925 hPa, ungefähr 800 m | 12 h | 0,82 |
| Samen | 10 m | 3 h | 0,38 |
| Papierflieger | 10 m | 1,5 h | 0,52 |

Windrichtung ist meteorologisch als Herkunftsrichtung angegeben und wird in
Ost-/Nordvektoren umgerechnet. Zeitlich wird linear interpoliert, räumlich über
die vier nächsten gültigen Punkte invers distanzgewichtet. Jeder Schritt wird
auf einer Kugel fortgeschrieben; Längengrad, Datumsgrenze und Polnähe bleiben
begrenzt. Windkomponenten werden für Missbrauchs- und Ausreißerschutz auf
80 m/s begrenzt.

Gleicher Start, gleiche Objektart und dasselbe gespeicherte Windfeld ergeben
dieselbe Route. Es gibt keine versteckte Zufallszahl. Das UI beschreibt die
Route bewusst als spielerische Modellroute und nicht als Navigation oder
Wetterwarnung.

Vor dem Start kann derselbe gebündelte Snapshot bewusst als Windvorschau
geladen werden. Drei visuelle Höhenbänder zeigen Geschwindigkeit, Richtung und
eine sprachliche Stärke; das aktuell gewählte Flugprofil ist markiert. Startet
der Nutzer anschließend am unveränderten Ort, verwendet der Flug genau diesen
Snapshot statt eines zweiten Netzabrufs. Ein Ortswechsel verwirft die Vorschau.

## Karte und Routennähe

Die Weltkarte zeichnet 177 Länder aus der lokal gebündelten
Natural-Earth-110-m-Geometrie. Startwahl, Route, Windpfeil und Zeichnung bleiben
app-eigene Canvas-Schichten. Während eines Flugs ergänzt eine lokale,
zweisprachige CC0-Auswahl bekannte Bauwerke sowie die bestehende Großortliste.
Pro Kandidat wird der nächste simulierte Routenpunkt berechnet; nur innerhalb
von 70 km (Wahrzeichen) beziehungsweise 95 km (große Orte) erscheint eine
nummerierte Markierung. Nahe Duplikate werden zusammengeführt, Wahrzeichen
haben Vorrang. Die Oberfläche nennt diese Grenze ausdrücklich als grobe Nähe,
nicht als exakten Überflug.

## Fallback- und Fehlervertrag

- Live-Wind wird nie still durch synthetische Daten ersetzt.
- Offline, Timeout, Netzwerkfehler und unvollständige Daten haben getrennte,
  sichtbare Texte.
- Erst eine ausdrückliche Schaltfläche startet das feste Demo-Feld vom
  30. Juli 2026.
- Abbruch erhält Zeichnung, Start und Einstellungen.
- Die App-Shell funktioniert nach der ersten erfolgreichen Installation
  offline; Live-Wind benötigt weiter eine Verbindung.
- Die Kopfzeile verwendet bei nicht sicher belegbarer Erreichbarkeit neutral
  `bereit` und zeigt `offline` nur nach einem Browsersignal.

## Eingabe

Die Zeichenfläche verwendet Pointer Events und Pointer Capture. Ein
`pointercancel` oder verlorenes Capture verwirft nur den laufenden Strich.
Fehler von `setPointerCapture`/`releasePointerCapture` werden abgefangen, da
Browser einen Pointer zwischen Ereignis und API-Aufruf freigeben können.

Tastaturbedienung:

- Leertaste oder Eingabe startet und beendet einen Strich;
- Pfeiltasten bewegen den Zeichenstift;
- Umschalt + Pfeiltaste bewegt in größeren Schritten;
- Escape verwirft den laufenden Tastaturstrich;
- Strg/Command + Z nimmt den letzten Strich zurück.

Ortssuche, Bereichsregler und Weltkarte bieten voneinander unabhängige
Startpunktwege. Ortung wird ausschließlich nach bewusstem Tastendruck
angefragt.

## Datenschutz und Export

Externe Windanfragen enthalten neun gerundete Koordinaten und die IP-Adresse,
die beim API-Anbieter technisch sichtbar ist. Exakte Gerätekoordinaten werden
weder gespeichert noch geteilt. Der Ergebnisexport enthält Startname,
Zielregion und Route, aber keine exakten Startkoordinaten oder Teil-URL.

Geräusch ist standardmäßig aus. Wenn eingeschaltet, entsteht es prozedural im
Browser und beginnt nur als unmittelbare Folge eines Start-Klicks.

## PWA-Cache

Der Service Worker erhält pro Assetliste einen neuen Cache-Namen. Statische
Assets werden per exaktem Pfad und unabhängig von `Vary` aus dem Cache gelesen.
Nur Navigationsanfragen dürfen auf `index.html` zurückfallen; ein fehlendes
JavaScript-Modul erhält niemals HTML als Ersatz.
