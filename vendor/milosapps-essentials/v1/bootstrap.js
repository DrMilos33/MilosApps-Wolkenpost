import { initMilosAppEssentials } from "./milos-app-essentials.js";

document.body?.setAttribute("data-milos-essentials-app", "cloud-post");
export const milosAppEssentials = initMilosAppEssentials({
  "appKey": "cloud-post",
  "environment": "dev",
  "productionApproved": false,
  "loading": {
    "appName": "Wolkenpost",
    "iconPath": "icon.svg",
    "message": {
      "de": "Wolkenpost wird geöffnet …",
      "en": "Opening Cloud Post …"
    }
  },
  "privacy": {
    "mode": "no-cookies",
    "usesLocalStorage": true,
    "optionalTracking": false,
    "privacyUrl": "https://dev.milos-apps.de/datenschutz"
  },
  "features": {
    "startup": true,
    "privacyNotice": true,
    "share": true,
    "datePicker": false,
    "placeSearch": true
  }
});
globalThis.milosAppEssentials = milosAppEssentials;
