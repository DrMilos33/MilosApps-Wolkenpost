# QA-Plan: Wolkenpost

Der erste funktionierende Flug ist nur der Beginn. Vor einer Abschlussmeldung
sind mindestens drei Verbesserungsrunden mit dokumentierter Evidenz nötig.

## Automatisierbare Logik

- deterministische Windinterpolation und Routenfortschreibung;
- schwacher, fehlender und extremer Wind;
- Datumsgrenze, Nord-/Südpolnähe und ungültige Datenpunkte;
- Begrenzung von Schrittweite, Laufzeit und exportierter Genauigkeit;
- lokale Speicherung, Löschung und Migration des Speicherformats.
- Essentials-Manifest, Fünf-Artefakt-Lock, Hashes, externe CSS-/JS-Pfade und
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

## Runden

1. Kernlogik und kompletter Happy Path mit reproduzierbaren Fixtures.
2. Rushed-user-, Fehler-, Offline-, Eingabe- und Zustandsübergangstests; gefundene
   Probleme beheben und Regressionen ergänzen.
3. Performance, Barrierefreiheit, visuelle Hierarchie, mobile Bedienung und
   Export prüfen; erneut verbessern und die vollständige Matrix wiederholen.

## Abschlussnachweis

Dokumentiert werden ausgeführte Tests, Viewports, Datenfixtures,
Leistungsgrenzen, bestätigte Restprobleme und nicht testbare externe Dienste.
