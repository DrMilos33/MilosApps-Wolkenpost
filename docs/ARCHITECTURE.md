# Wolkenpost-Architektur

Stand: 30. Juli 2026

## Stack und Grenze

- React 19 und TypeScript 7 für klar getrennte Zustands- und Interaktionslogik;
- Vite 8 für lokalen DEV-Server und statischen Build;
- keine Serverkomponente, App-Datenbank, Anmeldung oder Shared-Abhängigkeit;
- Browser-Lokalspeicher ausschließlich für Zeichnung, Einstellungen und den
  groben letzten Startpunkt;
- Service Worker für den App-Shell-Offlinebetrieb;
- Vitest für reine Logik und Playwright für reale Browserinteraktion.

Die App ist eine einzelne Route. Der Build kann später statisch auf einem
eigenständigen Dienst liegen. Portal und App importieren keinen Quellcode
voneinander.

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
