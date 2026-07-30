# Wolkenpost DEV- und Portalübergabe

Stand: 30. Juli 2026

## Öffentlicher DEV-Vertrag

| Feld | Wert |
|---|---|
| App-Key | `cloud-post` |
| Titel DE | Wolkenpost |
| Kurzbeschreibung DE | Zeichne ein Flugobjekt und schicke es mit echten Winddaten auf eine stilisierte Weltreise. |
| Sprachen | `de` |
| Anmeldung | keine |
| Status | `dev-online` |
| Git-Remote | `https://github.com/DrMilos33/MilosApps-Wolkenpost.git` |
| Hosting | app-eigene GitHub Pages über `.github/workflows/deploy-dev.yml` |
| öffentliche DEV-URL | `https://drmilos33.github.io/MilosApps-Wolkenpost/` |
| öffentliche Readiness | `https://drmilos33.github.io/MilosApps-Wolkenpost/health.json` |
| öffentliche Integrationsdatei | `https://drmilos33.github.io/MilosApps-Wolkenpost/integration.json` |
| lokaler DEV-Port | `4315`, strikt |
| lokale URL | `http://127.0.0.1:4315` |
| Healthcheck | `/health.json` |
| Integrationsdatei | `/integration.json` |
| gewünschte Portalroute | `/apps/cloud-post` |
| Vorschaubild | `https://drmilos33.github.io/MilosApps-Wolkenpost/preview.png` |
| Vorschaurechte | eigenes App-Screenshot; nur eigene Gestaltung/Weltvisualisierung |

Readiness verlangt inhaltlich:

```json
{
  "status": "ok",
  "appKey": "cloud-post",
  "environment": "dev-build",
  "productionApproved": false,
  "deploymentRevision": "<vollständiger Commit-SHA>"
}
```

Ein HTTP-200 allein oder nur der Pfadname `/health.json` genügt nicht. Port 4315
ist vorläufig für Wolkenpost reserviert. Bei Kollision bricht der Prozess ab.

## Deployment und Rollback

Der Workflow wird nur durch `main` oder bewusst manuell gestartet. Er installiert
den Lockfile-Stand, führt die Logiktests aus, baut mit dem festen
`/MilosApps-Wolkenpost/`-Basispfad, stempelt `GITHUB_SHA` in Health- und
Integrationsdatei und prüft App-Key, DEV-Umgebung, Production-Sperre und alle
öffentlichen Metadaten vor dem Upload.

Rollback bleibt app-eigen: den fehlerhaften `main`-Commit per normalem
Revert-Commit zurücknehmen und den DEV-Workflow erneut ausführen. Der erste
vollständig grüne und extern geprüfte Pages-Stand ist
`c5597051a1b3485975e9cb7f278f406005dc658e`. Die aktuell ausgelieferte Revision
ist immer die vollständige `deploymentRevision` in `/health.json`; sie wird
nicht manuell in dieser Dokumentation fortgeschrieben.

## Portalgrenze

Die gewünschte Portalroute `/apps/cloud-post` darf ausschließlich auf die oben
genannte unabhängige HTTPS-DEV-URL weiterleiten. Wolkenpost benötigt weder
Portal-Cookie noch Milos-Login und bleibt bei einem Portal-Ausfall direkt
erreichbar. Der Portal-Task besitzt die Portaländerung; dieses Repository
importiert keinen Portal-Quellcode.

## Production

Production ist nicht freigegeben, hat keine URL und wurde nicht verändert. Vor Production
müssen zusätzlich Open‑Meteo-Nutzungsart/Plan, Datenschutztext, Betriebslast,
Monitoring und erneute vollständige QA ausdrücklich freigegeben werden.
