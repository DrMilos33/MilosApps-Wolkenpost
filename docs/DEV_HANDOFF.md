# Wolkenpost DEV- und Portalübergabe

Stand: 30. Juli 2026

## Lokal vollständig

| Feld | Wert |
|---|---|
| App-Key | `cloud-post` |
| Titel DE | Wolkenpost |
| Kurzbeschreibung DE | Zeichne ein Flugobjekt und schicke es mit echten Winddaten auf eine stilisierte Weltreise. |
| Sprachen | `de` |
| Anmeldung | keine |
| Status | `local-dev-ready` |
| lokaler DEV-Port | `4315`, strikt |
| lokale URL | `http://127.0.0.1:4315` |
| Healthcheck | `/health.json` |
| Integrationsdatei | `/integration.json` |
| gewünschte Portalroute | `/apps/cloud-post` |
| Vorschaubild | `/preview.png` |
| Vorschaurechte | eigenes App-Screenshot; nur eigene Gestaltung/Weltvisualisierung |

Readiness verlangt inhaltlich:

```json
{
  "status": "ok",
  "appKey": "cloud-post",
  "environment": "dev-build"
}
```

Ein HTTP-200 allein oder nur der Pfadname `/health.json` genügt nicht. Port 4315
ist vorläufig für Wolkenpost reserviert. Bei Kollision bricht der Prozess ab.

## Externe DEV-Grenze

`devUrl` in `public/integration.json` bleibt bewusst `null`. Eine stabile,
unabhängige HTTPS-DEV-URL wurde nicht erfunden:

- im App-Register ist kein GitHub-Repository eingetragen;
- lokal ist kein externer Hostingdienst für Wolkenpost konfiguriert;
- es liegen keine freigegebenen DEV-Hostingzugangsdaten vor;
- Sites-Deployment-URLs gelten als Production und sind deshalb durch die
  ausdrückliche Production-Sperre ausgeschlossen.

Sobald ein eigenes DEV-Hostingziel freigegeben und verbunden ist:

1. den exakt getesteten Commit auf den eigenen DEV-Dienst ausliefern;
2. HTTPS-App, `/health.json`, Direktaufruf und Offlinegrenze prüfen;
3. `devUrl` aktualisieren;
4. App-Key, Titel, Kurzbeschreibung, DEV-URL, Sprache, Status, Vorschaurechte,
   Healthcheck und Route an den Portal-Task übergeben;
5. Portal bleibt ein Redirect auf die unabhängige App und importiert keinen
   Wolkenpost-Quellcode.

## Production

Production ist nicht freigegeben und wurde nicht verändert. Vor Production
müssen zusätzlich Open‑Meteo-Nutzungsart/Plan, Datenschutztext, Betriebslast,
Monitoring, eigener Remote, Rollback und erneute vollständige QA ausdrücklich
freigegeben werden.
