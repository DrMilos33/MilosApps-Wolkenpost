export const copy = {
  de: {
    objectTypes: {
      cloud: { label: 'Wolke', hint: 'hoch und weit, 18 Stunden' },
      balloon: { label: 'Ballon', hint: 'ruhig schwebend, 12 Stunden' },
      seed: { label: 'Samen', hint: 'nah am Boden, 3 Stunden' },
      'paper-plane': { label: 'Papierflieger', hint: 'kurzer Flug, 90 Minuten' },
    },
    windErrors: {
      offline: 'Du bist gerade offline. Deine Zeichnung bleibt da – Live-Wind braucht eine Verbindung.',
      timeout: 'Der Winddienst hat zu lange gebraucht. Du kannst erneut versuchen oder bewusst den Demo-Wind wählen.',
      network: 'Live-Wind ist gerade nicht erreichbar. Nichts wurde verloren.',
      invalid: 'Die Winddaten waren unvollständig. Bitte versuche es noch einmal.',
    },
  },
} as const;

export type SupportedLanguage = keyof typeof copy;
