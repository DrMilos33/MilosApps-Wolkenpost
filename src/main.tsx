import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import type { SupportedLanguage } from './copy';
import './styles.css';

function documentLanguage(): SupportedLanguage {
  return document.documentElement.lang === 'en' ? 'en' : 'de';
}

const root = createRoot(document.getElementById('root')!);

function renderApp(language: SupportedLanguage) {
  root.render(
    <StrictMode>
      <App initialLanguage={language} />
    </StrictMode>,
  );
}

window.addEventListener('milosapps:localechange', (event) => {
  const locale = (event as CustomEvent<{ locale?: string }>).detail?.locale;
  renderApp(locale === 'en' ? 'en' : 'de');
});

renderApp(documentLanguage());

/*
 * public-app-shell/v2 owns language persistence and dispatches
 * milosapps:localechange. The app also initializes from
 * document.documentElement.lang so reloads cannot race the first event.
 */

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    }).catch(() => {
      // Offline support is progressive; visible network states remain handled in the app.
    });
  });
}
