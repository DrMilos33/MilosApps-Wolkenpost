import type { Coordinate } from '../types';

export interface Landmark extends Coordinate {
  id: string;
  name: { de: string; en: string };
}

// Curated local CC0 facts from Wikidata. Coordinates are intentionally rounded:
// the flight remains a playful coarse model and never claims exact overflight.
export const LANDMARKS: Landmark[] = [
  { id: 'brandenburg-gate', name: { de: 'Brandenburger Tor', en: 'Brandenburg Gate' }, latitude: 52.5164, longitude: 13.3778 },
  { id: 'sanssouci', name: { de: 'Schloss Sanssouci', en: 'Sanssouci Palace' }, latitude: 52.403, longitude: 13.038 },
  { id: 'voelkerschlachtdenkmal', name: { de: 'Völkerschlachtdenkmal', en: 'Monument to the Battle of the Nations' }, latitude: 51.313, longitude: 12.413 },
  { id: 'frauenkirche-dresden', name: { de: 'Dresdner Frauenkirche', en: 'Dresden Church of Our Lady' }, latitude: 51.052, longitude: 13.742 },
  { id: 'elbphilharmonie', name: { de: 'Elbphilharmonie', en: 'Elbphilharmonie' }, latitude: 53.541, longitude: 9.984 },
  { id: 'cologne-cathedral', name: { de: 'Kölner Dom', en: 'Cologne Cathedral' }, latitude: 50.941, longitude: 6.958 },
  { id: 'heidelberg-castle', name: { de: 'Heidelberger Schloss', en: 'Heidelberg Castle' }, latitude: 49.411, longitude: 8.716 },
  { id: 'wartburg', name: { de: 'Wartburg', en: 'Wartburg Castle' }, latitude: 50.966, longitude: 10.306 },
  { id: 'neuschwanstein', name: { de: 'Schloss Neuschwanstein', en: 'Neuschwanstein Castle' }, latitude: 47.557, longitude: 10.749 },
  { id: 'eiffel-tower', name: { de: 'Eiffelturm', en: 'Eiffel Tower' }, latitude: 48.858, longitude: 2.294 },
  { id: 'atomium', name: { de: 'Atomium', en: 'Atomium' }, latitude: 50.895, longitude: 4.342 },
  { id: 'big-ben', name: { de: 'Elizabeth Tower · Big Ben', en: 'Elizabeth Tower · Big Ben' }, latitude: 51.501, longitude: -0.125 },
  { id: 'sagrada-familia', name: { de: 'Sagrada Família', en: 'Sagrada Família' }, latitude: 41.404, longitude: 2.174 },
  { id: 'colosseum', name: { de: 'Kolosseum', en: 'Colosseum' }, latitude: 41.89, longitude: 12.492 },
  { id: 'acropolis', name: { de: 'Akropolis von Athen', en: 'Acropolis of Athens' }, latitude: 37.972, longitude: 23.726 },
  { id: 'statue-of-liberty', name: { de: 'Freiheitsstatue', en: 'Statue of Liberty' }, latitude: 40.689, longitude: -74.045 },
  { id: 'golden-gate', name: { de: 'Golden Gate Bridge', en: 'Golden Gate Bridge' }, latitude: 37.82, longitude: -122.478 },
  { id: 'sydney-opera', name: { de: 'Opernhaus Sydney', en: 'Sydney Opera House' }, latitude: -33.857, longitude: 151.215 },
  { id: 'tokyo-tower', name: { de: 'Tokyo Tower', en: 'Tokyo Tower' }, latitude: 35.659, longitude: 139.745 },
  { id: 'gateway-india', name: { de: 'Gateway of India', en: 'Gateway of India' }, latitude: 18.922, longitude: 72.835 },
  { id: 'table-mountain', name: { de: 'Tafelberg', en: 'Table Mountain' }, latitude: -33.962, longitude: 18.409 },
  { id: 'christ-redeemer', name: { de: 'Cristo Redentor', en: 'Christ the Redeemer' }, latitude: -22.952, longitude: -43.211 },
];
