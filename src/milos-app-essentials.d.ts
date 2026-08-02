import type { DetailedHTMLProps, HTMLAttributes, Ref } from 'react';

export interface MilosPlaceSearchRequest {
  query: string;
  locale: 'de' | 'en';
  signal: AbortSignal;
}

export interface MilosPlaceLocationRequest {
  locale: 'de' | 'en';
}

export interface MilosPlaceResult {
  id: string;
  name: string;
  region: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  type: string;
  timeZone?: string;
}

export interface MilosPlaceSearchElement extends HTMLElement {
  setSearchProvider(
    provider: (request: MilosPlaceSearchRequest) => Promise<MilosPlaceResult[]> | MilosPlaceResult[],
  ): void;
  setLocateProvider(
    provider: (request: MilosPlaceLocationRequest) => Promise<MilosPlaceResult> | MilosPlaceResult,
  ): void;
}

export interface MilosSharePayload {
  title: string;
  text: string;
  url: string;
  files?: File[];
}

export interface MilosShareButtonElement extends HTMLElement {
  setPayloadProvider(
    provider: () => Promise<MilosSharePayload> | MilosSharePayload,
  ): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'milos-place-search': MilosPlaceSearchElement;
    'milos-share-button': MilosShareButtonElement;
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'milos-place-search': DetailedHTMLProps<
        HTMLAttributes<MilosPlaceSearchElement>,
        MilosPlaceSearchElement
      > & {
        ref?: Ref<MilosPlaceSearchElement>;
        'label-de'?: string;
        'label-en'?: string;
        'placeholder-de'?: string;
        'placeholder-en'?: string;
      };
      'milos-share-button': DetailedHTMLProps<
        HTMLAttributes<MilosShareButtonElement>,
        MilosShareButtonElement
      > & {
        ref?: Ref<MilosShareButtonElement>;
        primary?: string;
      };
    }
  }
}

export {};
