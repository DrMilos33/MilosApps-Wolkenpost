import { registerMilosAppShell } from "./milos-app-shell.js";

const appKey = "cloud-post";
document.body?.setAttribute("data-milos-app-shell-page", "");
const themeUrl = new URL("./milos-app-shell-theme.css", import.meta.url).href;
let themeLink = document.querySelector(`link[data-milos-app-shell-theme="${appKey}"]`);
if (!themeLink) {
  themeLink = document.createElement("link");
  themeLink.rel = "stylesheet";
  themeLink.href = themeUrl;
  themeLink.dataset.milosAppShellTheme = appKey;
  await new Promise((resolve, reject) => {
    themeLink.addEventListener("load", resolve, { once: true });
    themeLink.addEventListener("error", () => reject(new Error("MilosApps shell theme stylesheet failed to load")), { once: true });
    document.head.append(themeLink);
  });
}
registerMilosAppShell({
  "appKey": "cloud-post",
  "environment": "dev",
  "productionApproved": false,
  "description": {
    "de": "Deine Zeichnung reist mit dem Wind – privat, verspielt und ohne Anmeldung.",
    "en": "Your drawing travels with the wind – private, playful and without an account."
  }
});
