import { initMilosAppEssentials } from "./milos-app-essentials.js";

document.body?.setAttribute("data-milos-essentials-app", "cloud-post");
export const milosAppEssentials = initMilosAppEssentials({
  "appKey": "cloud-post",
  "environment": "dev",
  "productionApproved": false,
  "loading": {
    "appName": "Wolkenpost",
    "iconPath": "public/icon.svg",
    "iconRuntimePath": "icon.svg",
    "message": {
      "de": "Wolkenpost wird geöffnet …",
      "en": "Opening Cloud Post …"
    }
  },
  "privacy": {
    "mode": "no-cookies",
    "usesLocalStorage": true,
    "storagePurposes": [
      {
        "key": "milosapps.cloud-post.state",
        "purpose": "Bewahrt die selbst erstellte Zeichnung, das Flugobjekt, den groben Startpunkt sowie Darstellungs-, Bewegungs- und Tonpräferenzen für die ausdrücklich angebotene lokale Wiederaufnahme und Offline-Nutzung.",
        "lifetime": "until-user-clears",
        "strictlyNecessary": true
      },
      {
        "key": "milosapps.cloud-post.language",
        "purpose": "Bewahrt die ausdrücklich gewählte Sprache konsistent für Shell, Fachoberfläche und barrierefreie Beschriftungen.",
        "lifetime": "until-user-clears",
        "strictlyNecessary": true
      }
    ],
    "optionalTracking": false,
    "privacyUrl": "https://dev.milos-apps.de/datenschutz"
  },
  "features": {
    "startup": true,
    "privacyNotice": false,
    "share": true,
    "datePicker": false,
    "placeSearch": true,
    "placeSuggestions": {
      "enabled": false,
      "minChars": 3,
      "debounceMs": 350,
      "providerCapability": "submit-only",
      "evidenceFile": null
    }
  }
});
globalThis.milosAppEssentials = milosAppEssentials;
