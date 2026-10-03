import { useSyncExternalStore } from 'react';
import credits from './data/photos.json';
import type { Athlete } from './engine/types';

// Photos des animaux : fichiers de Wikimedia Commons (licences libres), récupérés par
// scripts/photos/telecharger-photos.mjs. Chaque photo garde son auteur et sa licence.

export interface PhotoCredit {
  file: string;
  /** photo détourée (fond transparent) : l'animal « sort » de la carte */
  cutout: boolean;
  author: string;
  license: string;
  licenseUrl: string;
  page: string;
}

const CREDITS = credits as Record<string, PhotoCredit>;

export function photoCredit(athleteId: string): PhotoCredit | undefined {
  return CREDITS[athleteId];
}

export function photoCount(): number {
  return Object.keys(CREDITS).length;
}

// Version « un seul fichier » : les images ne peuvent pas être de simples fichiers liés,
// elles arrivent par paquets d'une quinzaine de photos (photos/pNN.json), chargés à la demande
// d'après un index id → paquet (photos/index.json). Voir scripts/make-artifact.mjs.
const SINGLE_FILE = import.meta.env.MODE === 'single';
const cache = new Map<string, string>();
const requestedIds = new Set<string>();
const requestedChunks = new Set<string>();
const listeners = new Set<() => void>();
let index: Promise<Record<string, string>> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function fetchJson<T>(url: string, fallback: T): Promise<T> {
  return fetch(url)
    .then((response) => (response.ok ? (response.json() as Promise<T>) : fallback))
    .catch(() => fallback);
}

function loadPhoto(athleteId: string) {
  if (requestedIds.has(athleteId)) return;
  requestedIds.add(athleteId);
  index ??= fetchJson<Record<string, string>>('photos/index.json', {});
  void index.then((chunks) => {
    const chunk = chunks[athleteId];
    if (!chunk || requestedChunks.has(chunk)) return;
    requestedChunks.add(chunk);
    return fetchJson<Record<string, string>>(`photos/${chunk}.json`, {}).then((map) => {
      for (const [id, src] of Object.entries(map)) cache.set(id, src);
      listeners.forEach((listener) => listener());
    });
  });
  // sans photo, la carte garde sa silhouette
}

export function usePhoto(athlete: Athlete): { src?: string; cutout: boolean } {
  // seule la carte dont la photo vient d'arriver se redessine
  const loaded = useSyncExternalStore(subscribe, () => cache.get(athlete.id));
  const credit = CREDITS[athlete.id];
  if (!credit) return { cutout: false };
  if (!SINGLE_FILE) return { src: `${import.meta.env.BASE_URL}photos/${credit.file}`, cutout: credit.cutout };
  if (!loaded) loadPhoto(athlete.id);
  return { src: loaded, cutout: credit.cutout };
}
