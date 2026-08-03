# QA-Plan: Wolkenpost

Der erste funktionierende Flug ist nur der Beginn. Vor einer Abschlussmeldung
sind mindestens drei Verbesserungsrunden mit dokumentierter Evidenz nötig.

## Automatisierbare Logik

- deterministische Windinterpolation und Routenfortschreibung;
- schwacher, fehlender und extremer Wind;
- Datumsgrenze, Nord-/Südpolnähe und ungültige Datenpunkte;
- Begrenzung von Schrittweite, Laufzeit und exportierter Genauigkeit;
- lokale Speicherung, Löschung und Migration des Speicherformats.
- Essentials-Manifest, Sechs-Artefakt-Lock, Hashes, externe CSS-/JS-Pfade und
  Service-Worker-Cache;
- explizite Ortssuche mit normalisiertem Name-/Region-/Land-Ergebnis sowie
  natives Teilen, Clipboard-Fallback und stiller Nutzerabbruch.

## Simulierte Nutzung

- Smartphone hoch und quer, Tablet und Desktop;
- Zeichnen mit Touch, Stift-Simulation, Maus und Tastaturalternative;
- sehr kurze, sehr lange und selbstschneidende Striche;
- schneller Wechsel der Objektart, wiederholtes Starten und Abbrechen;
- Pointer-Abbruch, Fensterverlust, Rotation und App-Wiederaufnahme;
- verweigerte Ortung, langsames Netz, Timeout, Offline und veraltete Winddaten;
- reduzierte Bewegung, 200 Prozent Zoom, Tastatur und Screenreader-Semantik.
- frischer und künstlich verlangsamter Start, Start-Reihenfolgerace,
  wahrheitsgemäßer Datenschutzhinweis und Sprachpersistenz;
- strikte Same-Origin-CSP, korrekte MIME-Typen und kein CSS-/JS-`data:`-Inlining
  im tatsächlich gebauten DEV-Artefakt.
- drei unterschiedliche Umrisse pro Flugart, vollbreite Länderkarte,
  Windvorschau mit drei Höhen sowie grob kuratierte Routenorte;
- Wiederverwendung des Windvorschau-Snapshots beim Start und Verwerfen nach
  Ortswechsel, Abbruch oder Fehler.

- Kartenfigur per Touch, Stift und Maus ziehen; Pointer-Abbruch darf keinen
  neuen Start speichern; Pfeiltasten bleiben bedienbar;
- Welt-/Laenderansicht, Zoom plus/minus und automatisches Herauszoomen bei
  verlassenem Ausschnitt;
- Windfeld nach bewusster Startwahl sowie Spielweite 1/4/10 mit veraenderter
  Distanz, aber identischen angezeigten Realwindwerten.
- Karten-Widget als Overlay auf Desktop und angedockt auf Mobil; echter Wind,
  Reichweitenschaetzung und Startort bleiben ohne Kartenverlust lesbar.
- Flugfolge, bewusste Gesamtansicht, Laender-Sehenswuerdigkeiten und sichtbarer
  Vorbeiflugmoment; die Karte bleibt beim Ergebnis im Blick.

## Runden

1. Kernlogik und kompletter Happy Path mit reproduzierbaren Fixtures.
2. Rushed-user-, Fehler-, Offline-, Eingabe- und Zustandsübergangstests; gefundene
   Probleme beheben und Regressionen ergänzen.
3. Performance, Barrierefreiheit, visuelle Hierarchie, mobile Bedienung und
   Export prüfen; erneut verbessern und die vollständige Matrix wiederholen.

## Abschlussnachweis

Dokumentiert werden ausgeführte Tests, Viewports, Datenfixtures,
Leistungsgrenzen, bestätigte Restprobleme und nicht testbare externe Dienste.
