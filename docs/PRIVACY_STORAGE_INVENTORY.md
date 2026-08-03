# Datenschutz- und Speicherinventar

Stand: lokaler Migrationskandidat, 3. August 2026. Der Vertrag ist fest auf
`public-app-essentials/v1.1.3` und Shared-Commit
`babe74a0e62e1a7f9095648195e54b322a837726` gepinnt.

Wolkenpost verwendet keine Werbe-, Analyse- oder Tracking-Cookies, kein
Fingerprinting, keine Anmeldung und keine App-Datenbank. Es gibt keine
optionale Speicherung und deshalb keinen Einwilligungsbanner. Die
Datenschutzinformation bleibt dauerhaft über den sichtbaren Link in der App
und über die öffentliche Shell erreichbar.

## Endgerätezugriffe

| Technik / Schlüssel | Inhalt und Zweck | Lebensdauer | Erforderlichkeitsgrenze |
|---|---|---|---|
| `localStorage`: `milosapps.cloud-post.state` | Eigene Zeichnung, gewähltes Flugprofil, grober letzter Startpunkt sowie bewusst gewählte Darstellungs-, Bewegungs- und Toneinstellungen. Ermöglicht die ausdrücklich angebotene lokale Wiederaufnahme und Offline-Nutzung. | Bis „Lokale Daten löschen“ oder Browserlöschung. | Technisch notwendig für die angebotene lokale Wiederaufnahme; verlässt das Gerät nicht. |
| `localStorage`: `milosapps.cloud-post.language` | Bewusst gewählte Sprache für Shell, Fachoberfläche und zugängliche Beschriftungen. | Bis lokale Daten beziehungsweise Browserdaten gelöscht werden. | Technisch notwendig, damit die vollständige DE/EN-Wahl beim Reload konsistent bleibt. Die vendorte Shell besitzt diesen Schlüssel. |
| `CacheStorage`: versionsbezogener `wolkenpost-*`-Cache | Nur statische App-Dateien, Manifest, Health-/Integrationsmetadaten und vendorte Same-Origin-Verträge. | Bis die nächste App-Version den alten Cache beim Aktivieren entfernt oder Browserdaten gelöscht werden. | Technisch notwendig für die ausdrücklich angebotene PWA-/Offline-Funktion; enthält keine Zeichnung, Position, Route oder sonstige persönliche App-Daten. |
| Einmalige v1.1-Migration: `milosapps.cloud-post.privacyNotice.v1` | Ein früherer, nicht mehr benötigter Dismiss-Zustand wird ausschließlich entfernt. | Kein neuer Wert; einmalige Löschung beim ersten Start. | Datenminimierende Migration. Andere Schlüssel oder App-Namespaces werden nicht berührt. |

`sessionStorage`, Cookies und IndexedDB werden von Wolkenpost nicht verwendet.
Der frühere Session-Schlüssel für einen Offline-Merker wurde entfernt: Der
Browser liefert den aktuellen Online-/Offline-Zustand selbst; ein zusätzlich
persistiertes, möglicherweise veraltetes Signal war nicht notwendig.

## Externe und flüchtige Verarbeitung

- Eine Live-Windroute wird erst nach Nutzeraktion abgerufen. Dafür sendet die
  App neun auf 0,25 Grad gerundete Modellkoordinaten an Open-Meteo. Die
  öffentliche API sieht technisch auch die IP-Adresse. Die Antwort bleibt nur
  im Arbeitsspeicher des aktuellen Dokuments und wird nicht in Web Storage
  geschrieben.
- Browser-Ortung wird ausschließlich nach der Aktion „Meinen Ort verwenden“
  angefragt. Die genaue Browserantwort wird sofort auf einen groben Startpunkt
  reduziert. Nur dieser grobe, sichtbare Startpunkt kann anschließend im
  lokalen App-Zustand landen.
- Die Ortsuche arbeitet submit-only in einer app-eigenen handkuratierten Liste.
  Sie ruft keinen Geocoder, Suggestion-Provider oder App-Proxy auf.
- Teilen übergibt erst nach Nutzeraktion ein lokal erzeugtes PNG sowie die
  kanonische App-URL. Query, Hash, Koordinaten, Zeichnungszustand und andere
  private Daten werden nie in die URL geschrieben. Bei nativer Teilen-Funktion
  entscheidet der Nutzer im Betriebssystem über das Ziel; der Clipboard-
  Fallback kopiert nur Text und die kanonische URL.
- Der optionale Startton wird ausschließlich nach Nutzeraktion im Browser
  erzeugt. Es wird keine Audiodatei geladen, aufgezeichnet oder gespeichert.

## Löschung und Fehlergrenze

„Lokale Daten löschen“ entfernt den fachlichen App-Zustand und setzt die
Oberfläche zurück. Die Sprachwahl gehört der öffentlichen Shell und kann über
die Browserdaten gelöscht beziehungsweise durch eine neue Auswahl ersetzt
werden. Ist Web Storage nicht verfügbar oder voll, bleibt die App bedienbar
und meldet sichtbar, dass lokale Änderungen nicht gespeichert werden konnten.
Der PWA-Cache kann über die Browser-/Website-Daten gelöscht werden.
