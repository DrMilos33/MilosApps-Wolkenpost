# Wolkenpost Repository-Regeln

## Zuständigkeit

Dieses Repository enthält ausschließlich `Wolkenpost` mit dem App-Key
`cloud-post`. Fachlogik anderer MilosApps gehört nicht hierher.

## Portfolio-Verträge

- App-Klasse: `öffentlich`
- Plattformen: `Web, mobil und Desktop`
- Datenhaltung: `Zeichnung, Einstellungen und letzter Startpunkt lokal; keine App-Datenbank`
- Deployment: `eigener DEV-Dienst; Production nicht freigegeben`
- Gemeinsame Abhängigkeiten: `keine`

Wenn der lokale MilosApps Workspace verfügbar ist, vor appübergreifenden
Änderungen `docs/APP_REGISTRY.md`, `docs/PORTFOLIO_ARCHITECTURE.md`,
`docs/IDENTITY_MODEL.md` und `docs/PORTFOLIO_LEARNINGS.md` im Workspace lesen.

## Arbeitsgrenzen

- Nur Dateien dieses Repositorys ändern.
- Keine Datenbank, Cookies, Passwörter oder Secrets mit einer anderen App teilen.
- Gemeinsame Assets erst über eine feste veröffentlichte Version beziehen.
- Keine Quellcodeimporte aus Portal oder anderen Apps.
- Externe Wind-, Wetter-, Karten- und Ortsdaten vor Nutzung auf Lizenz,
  Attribution, Verfügbarkeit und kommerzielle Nutzung prüfen.
- DEV und Production strikt trennen.
- Production nur nach ausdrücklicher Freigabe verändern.

## Besondere Qualitätsanforderung

Wolkenpost erhält bewusst mehr Produkt- und Interaktionsarbeit als ein normales
Kleinst-MVP. Zeichnen, Starten, Flugbewegung und Teilen müssen mit Touch, Maus
und Tastatur verständlich sein. Simulationen müssen reproduzierbar testbar sein;
Netzwerkfehler benötigen einen ehrlichen, nutzbaren Zustand.

## Qualität

- Vor Änderungen Status und vorhandene Dokumentation prüfen.
- Automatisierte Logik-, Interaktions- und End-to-End-Tests aufbauen.
- Nach dem ersten lauffähigen Stand mindestens drei QA-/Verbesserungsrunden
  durchführen.
- Mobile Hoch-/Querformate, Tablet und Desktop prüfen.
- Touch, Maus, Tastatur, reduzierte Bewegung, langsames Netz und Offlinezustand
  simulieren.
- Allgemeine Erkenntnisse in `docs/LEARNINGS.md` festhalten und an Struktur- und
  Ideen-Task melden.
- Abschluss mit Branch, Commit, Tests, DEV-Status, Portalvertrag und offenen
  Blockern dokumentieren.
