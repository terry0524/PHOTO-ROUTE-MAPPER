"use client";

declare global {
  interface Window {
    L?: LeafletGlobal;
    maplibregl?: unknown;
  }
}

type LeafletEvent = {
  latlng: {
    lat: number;
    lng: number;
  };
};

type LeafletPopup = {
  setDOMContent(content: HTMLElement): LeafletPopup;
  openOn(map: LeafletMapInstance): void;
  remove(): void;
};

type LeafletMarker = {
  addTo(map: LeafletMapInstance): LeafletMarker;
  bindPopup(content: HTMLElement, options?: Record<string, unknown>): LeafletMarker;
  on(event: string, handler: () => void): LeafletMarker;
  openPopup(): void;
  setLatLng(coords: [number, number]): LeafletMarker;
  remove(): void;
};

type LeafletPolyline = {
  addTo(map: LeafletMapInstance): LeafletPolyline;
  remove(): void;
};

type LeafletTileLayer = {
  addTo(map: LeafletMapInstance): LeafletTileLayer;
};

export type LeafletMapLibreLayer = {
  addTo(map: LeafletMapInstance): LeafletMapLibreLayer;
  remove(): void;
};

export type LeafletMapInstance = {
  setView(coords: [number, number], zoom: number): LeafletMapInstance;
  fitBounds(bounds: [number, number][], options?: Record<string, unknown>): LeafletMapInstance;
  flyTo(coords: [number, number], zoom?: number, options?: Record<string, unknown>): LeafletMapInstance;
  getZoom(): number;
  on(event: string, handler: (event: LeafletEvent) => void): LeafletMapInstance;
  off(): LeafletMapInstance;
  remove(): void;
  closePopup(): void;
};

export type LeafletGlobal = {
  map(element: HTMLElement, options?: Record<string, unknown>): LeafletMapInstance;
  tileLayer(urlTemplate: string, options?: Record<string, unknown>): LeafletTileLayer;
  marker(coords: [number, number], options?: Record<string, unknown>): LeafletMarker;
  polyline(coords: [number, number][], options?: Record<string, unknown>): LeafletPolyline;
  popup(options?: Record<string, unknown>): LeafletPopup;
  divIcon(options?: Record<string, unknown>): unknown;
  maplibreGL?(options: Record<string, unknown>): LeafletMapLibreLayer;
};

type MapStyle = {
  layers?: Array<{
    type?: string;
    layout?: Record<string, unknown>;
  }>;
  [key: string]: unknown;
};

let leafletPromise: Promise<LeafletGlobal> | null = null;
let englishStylePromise: Promise<MapStyle> | null = null;

function appendStyleOnce(href: string, key: string) {
  if (document.querySelector(`link[data-style-key="${key}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-style-key", key);
  document.head.appendChild(link);
}

function appendScriptOnce(src: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[data-script-key="${key}"]`);

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error(`Unable to load ${key}.`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute("data-script-key", key);
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Unable to load ${key}.`));
    document.body.appendChild(script);
  });
}

function ensureStyles() {
  appendStyleOnce("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "leaflet-css");
  appendStyleOnce("https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css", "maplibre-css");
}

function patchTextField(value: unknown): unknown {
  if (Array.isArray(value)) {
    const serialized = JSON.stringify(value);

    if (serialized.includes('"name"') || serialized.includes('"name:latin"') || serialized.includes('"name_int"')) {
      return [
        "coalesce",
        ["get", "name:en"],
        ["get", "name_en"],
        ["get", "name_int"],
        ["get", "name:latin"],
        ["get", "name"],
        "",
      ];
    }
  }

  return value;
}

async function fetchEnglishMapStyle(): Promise<MapStyle> {
  if (englishStylePromise) {
    return englishStylePromise;
  }

  englishStylePromise = fetch("https://tiles.openfreemap.org/styles/liberty")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Unable to load English map style.");
      }

      const style = (await response.json()) as MapStyle;
      const nextLayers = (style.layers ?? []).map((layer) => {
        if (layer.type !== "symbol" || !layer.layout || !("text-field" in layer.layout)) {
          return layer;
        }

        return {
          ...layer,
          layout: {
            ...layer.layout,
            "text-field": patchTextField(layer.layout["text-field"]),
          },
        };
      });

      return {
        ...style,
        layers: nextLayers,
      };
    })
    .catch(() => ({
      version: 8,
      sources: {},
      layers: [],
    }));

  return englishStylePromise;
}

export function ensureLeaflet(): Promise<LeafletGlobal> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet can only be loaded in the browser."));
  }

  if (window.L?.maplibreGL) {
    return Promise.resolve(window.L);
  }

  if (leafletPromise) {
    return leafletPromise;
  }

  leafletPromise = new Promise(async (resolve, reject) => {
    try {
      ensureStyles();
      await appendScriptOnce("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "leaflet-js");
      await appendScriptOnce("https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.js", "maplibre-js");
      await appendScriptOnce(
        "https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.20/leaflet-maplibre-gl.js",
        "maplibre-leaflet-js",
      );

      if (window.L) {
        resolve(window.L);
        return;
      }

      reject(new Error("Leaflet failed to initialize."));
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Unable to load map libraries."));
    }
  });

  return leafletPromise;
}

export async function createEnglishBaseLayer(leaflet: LeafletGlobal) {
  if (!leaflet.maplibreGL) {
    throw new Error("MapLibre Leaflet bridge is unavailable.");
  }

  const style = await fetchEnglishMapStyle();
  return leaflet.maplibreGL({
    style,
  });
}
