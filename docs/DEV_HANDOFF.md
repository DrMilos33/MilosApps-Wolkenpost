# Wolkenpost DEV- und Portalübergabe

Stand: 3. August 2026

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
| Layout-Vertrag | `public-app-layout/v1.1.0`, Profil `guided-flow`, Shared-Commit `55b649d997489ca703682679257ac1a5b790bdc7` |
| Essentials-Vertrag | `public-app-essentials/v1.1.3`, Shared-Commit `babe74a0e62e1a7f9095648195e54b322a837726`, Module Start/Privacy/Share/Place, sechs bytegenau gelockte Verbraucherartefakte |
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

Für die zweite Layoutiteration auf `public-app-layout/v1.1.0` ist
`b8a537901ca3cb598a4c270d17d76e5e4a2dba01` der unmittelbar vorherige
portal-verifizierte App-/Pages-Stand. Ein normaler Revert auf diesen Commit
stellt die v1.0.0-Dichte wieder her, ohne Shell, Shared oder Portal zu ändern.

Für den engen Folgepatch der deutschen Mobile-Dichte ist
`e5d4dd6869d921c8876433a7a860a65077474bd5` der unmittelbar vorherige gesunde
DEV-Stand und damit der bevorzugte Rollbackpunkt.

Für die Essentials-v1-Übernahme ist
`46f15c90858ba59aa07436641e7a52a005e06dae` der unmittelbar vorherige
portal-verifizierte App-/Pages-Stand. Ein normaler Revert auf diesen Commit
entfernt Startscreen, Datenschutzhinweis, gemeinsame Teilen-/Ortssuche und den
Essentials-Lock wieder, ohne Shell, Layout, Shared oder Portal zu verändern.

Für die Migration auf `public-app-essentials/v1.1.3` samt erweitertem Flugraum
und Profilvergleich ist `ddaffbd268580f8415fb22a47bafef50ee8be6d2`
der unmittelbar vorherige portal-verifizierte App-/Pages-Stand. Ein normaler
Revert des Karten-Merge-Commits
`a3ca525f053ec090edca58808e6d9403103fd5ae` stellt den vorherigen
Essentials-v1.1.2-Flugraum wieder her; Shell v2.0.3, Layout v1.1.0, Shared und
Portal bleiben davon unberührt.

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
