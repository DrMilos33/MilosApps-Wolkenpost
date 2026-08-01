# Wolkenpost DEV- und Portalübergabe

Stand: 1. August 2026

## Öffentlicher DEV-Vertrag

| Feld | Wert |
|---|---|
| App-Key | `cloud-post` |
| Titel DE | Wolkenpost |
| Titel EN | Cloud Post |
| Kurzbeschreibung DE | Zeichne ein Flugobjekt und schicke es mit echten Winddaten auf eine stilisierte Weltreise. |
| Kurzbeschreibung EN | Draw a flying object and send it around a stylised world using real wind data. |
| Sprachen | `de`, `en` |
| Anmeldung | keine |
| Status | `dev-online` |
| Shell-Vertrag | `public-app-shell/v2.0.3`, Shared-Commit `ed898412306e22c6ae1b10ee8953df29f8acd627` |
| Layout-Vertrag | `public-app-layout/v1.0.0`, Profil `guided-flow`, Shared-Commit `bd09643e2767eddba032a82afc550043f3e3b31e` |
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

Für die Shell-v2-Migration ist
`bde623d72eb648f2af32b8f9124d24677e84b5da` der unmittelbar vorherige gesunde
App-/Pages-Stand. Ein Rollback stellt diesen Commit per normalem Revert wieder
her und löst ausschließlich das app-eigene DEV-Deployment neu aus; Shared und
Portal müssen dafür nicht zurückgerollt werden.

Für den Layout-v1-Piloten ist
`22af04ef5fe0c7ffc5b6a8474eee588aa0dac827` der unmittelbar vorherige gesunde
App-/Pages-Stand. Der Layout-Pilot bleibt mit einem normalen Revert auf diesen
Stand rückrollbar; der getrennte Shell-v2.0.3-Pin bleibt dabei erhalten.

## Portalgrenze

Die Portalroute `/apps/cloud-post` darf ausschließlich auf die oben genannte
unabhängige HTTPS-DEV-URL weiterleiten. Wolkenpost benötigt weder Portal-Cookie
noch Milos-Login und bleibt bei einem Portal-Ausfall direkt erreichbar. Der
Portal-Task besitzt die bestehende Route und ihre Revalidierung nach einem
neuen App-DEV-Deploy; dieses Repository importiert keinen Portal-Quellcode und
ändert keine Portaldatei.

## Production

Production ist nicht freigegeben, hat keine URL und wurde nicht verändert. Vor Production
müssen zusätzlich Open‑Meteo-Nutzungsart/Plan, Datenschutztext, Betriebslast,
Monitoring und erneute vollständige QA ausdrücklich freigegeben werden.
