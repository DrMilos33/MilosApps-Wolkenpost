# Datenquellen und Lizenzen

Geprüft am 30. Juli 2026 anhand der verlinkten Primärquellen.

## Live-Wind

### Open‑Meteo Forecast API

- Dokumentation:
  <https://open-meteo.com/en/docs>
- Nutzungsbedingungen:
  <https://open-meteo.com/en/terms>
- Preise und Attribution:
  <https://open-meteo.com/en/pricing>
- verwendeter Endpoint:
  `https://api.open-meteo.com/v1/forecast`

Technisch bestätigt:

- mehrere Koordinaten sind in einer Anfrage zulässig;
- Windgeschwindigkeit und Windrichtung stehen auf 10 m sowie Druckniveaus zur
  Verfügung;
- Wolkenpost verwendet das globale NOAA-GFS-Modell, UTC und m/s;
- Open‑Meteo-Daten werden unter CC BY 4.0 bereitgestellt und benötigen
  Attribution.

Die freie API ist laut Terms nur nichtkommerziell nutzbar und hat Grenzen von
10.000 Aufrufen pro Tag, 5.000 pro Stunde und 600 pro Minute. Der heutige lokale
DEV-Stand ist werbefrei, ohne Abonnement und nichtkommerziell. Vor einer
Production-Freigabe muss erneut entschieden werden, ob der Betrieb weiterhin
nichtkommerziell ist oder ein kommerzieller Open‑Meteo-Plan benötigt wird.

Open‑Meteo weist außerdem darauf hin, dass technische Serverlogs IP-Adressen
und angefragte Koordinaten enthalten können und nach 90 Tagen gelöscht werden.
Wolkenpost rundet deshalb vor dem Abruf und erklärt die externe Anfrage.

### NOAA GFS

- Open‑Meteo GFS-Variablen:
  <https://open-meteo.com/en/docs/gfs-api>
- NOAA/NWS-Nutzungshinweis:
  <https://verification.nws.noaa.gov/services/public/disclaimer.aspx>

NOAA-Regierungsinformationen sind grundsätzlich Public Domain, sofern nicht
anders gekennzeichnet. Sie dürfen nicht als offizielle, von NOAA bestätigte
Wolkenpost-Ausgabe dargestellt werden. Wolkenpost nennt das Modell, gibt keine
NOAA-Unterstützung vor und bezeichnet das Ergebnis als eigene Modellroute.
Die direkt für Nutzer sichtbare Datenattribution bleibt Open‑Meteo, weil dessen
API die GFS-Daten aufbereitet und ausliefert.

## Browser-APIs

- Pointer Capture:
  <https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture>
- `pointercancel`:
  <https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event>
- Geolocation und sichere Kontexte:
  <https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API>
- reduzierte Bewegung:
  <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion>

Die Ortung funktioniert in ausgelieferten Umgebungen nur über HTTPS und nach
expliziter Browserfreigabe. Suche und Karte bleiben vollständig ohne Ortung
nutzbar.

## Eigene Inhalte

- Weltkonturen: bewusst grobe, von Wolkenpost selbst gezeichnete Polygone;
  keine Kartentiles und kein kopierter Geodatensatz.
- Ortsliste: kleine handkuratierte Auswahl grob gerundeter, nicht
  urheberrechtlich geschützter Fakten; keine fremde Such-API. Die gemeinsame
  Essentials-Ortsoberfläche ändert nur Interaktion und Ausgabeformat. Suche
  und Normalisierung zu Name, Region und Land bleiben vollständig lokal und
  fügen keinen Provider, Netzaufruf oder neuen Lizenzgegenstand hinzu.
- App-Icon, CSS-Gestaltung und Canvas-Export: eigenes Werk.
- `public/preview.png`: Screenshot des eigenen Builds; enthält ausschließlich
  die oben genannten eigenen Inhalte und Systemschriften.
- Keine externen Fotos, Videos, Webcams, Audiodateien oder Webfonts.

## Softwareabhängigkeiten

Die jeweiligen Lizenzdateien wurden aus den installierten Primärpaketen
geprüft:

| Paket | Version | Lizenz |
|---|---:|---|
| React / React DOM | 19.2.8 | MIT |
| Vite | 8.1.5 | MIT |
| Vitest | 4.1.10 | MIT |
| Playwright Test | 1.62.0 | Apache-2.0 |
| axe Playwright | 4.12.1 | MPL-2.0 |
| TypeScript | 7.0.2 | Apache-2.0 |
| jsdom | 30.0.1 | MIT |

Im ausgelieferten Browserbundle liegen React und eigener App-Code. Vitest,
Playwright, axe, TypeScript und jsdom sind reine Entwicklungsabhängigkeiten.
