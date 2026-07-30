import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const GITHUB_PAGES_BASE = '/MilosApps-Wolkenpost/';

function withBase(base: string, path: string) {
  return `${base}${path.replace(/^\/+/, '')}`;
}

function appShellServiceWorker(base: string): Plugin {
  return {
    name: 'wolkenpost-app-shell-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle)
        .filter((file) => !file.endsWith('.map') && file !== 'sw.js')
        .map((file) => withBase(base, file));
      const appShell = Array.from(new Set([
        base,
        withBase(base, 'index.html'),
        withBase(base, 'manifest.webmanifest'),
        withBase(base, 'icon.svg'),
        withBase(base, 'health.json'),
        withBase(base, 'integration.json'),
        withBase(base, 'preview.png'),
        ...files,
      ]));
      const cacheSignature = files
        .join('|')
        .split('')
        .reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 0)
        .toString(36);

      const source = `
const CACHE = 'wolkenpost-${cacheSignature}';
const BASE = ${JSON.stringify(base)};
const APP_SHELL = ${JSON.stringify(appShell)};
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET'
    || url.origin !== self.location.origin
    || !url.pathname.startsWith(BASE)
  ) return;
  event.respondWith(
    caches.match(url.pathname, { ignoreVary: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => event.request.mode === 'navigate'
        ? caches.match(\`\${BASE}index.html\`)
        : Response.error());
    })
  );
});`;

      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig(({ mode }) => {
  const base = mode === 'github-pages' ? GITHUB_PAGES_BASE : '/';

  return {
    base,
    plugins: [react(), appShellServiceWorker(base)],
    build: {
      sourcemap: true,
      target: 'es2022',
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/unit/setup.ts'],
      include: ['./tests/unit/**/*.test.ts'],
      coverage: {
        reporter: ['text', 'html'],
      },
    },
  };
});
