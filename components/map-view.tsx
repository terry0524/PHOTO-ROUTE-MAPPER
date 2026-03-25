"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { PhotoRecord } from "@/lib/types";
import { MapPopupCard } from "@/components/map-popup-card";
import { createEnglishBaseLayer, ensureLeaflet, type LeafletGlobal, type LeafletMapInstance, type LeafletMapLibreLayer } from "@/lib/leaflet";

interface MapViewProps {
  photos: PhotoRecord[];
  selectedPhotoId: string | null;
  onSelectPhoto: (photoId: string) => void;
  onSaveMemo: (id: string, memo: string) => Promise<void>;
}

type PopupBinding = {
  root: Root;
};

function disposePopupBindings(bindings: Record<string, PopupBinding>) {
  for (const { root } of Object.values(bindings)) {
    queueMicrotask(() => {
      root.unmount();
    });
  }
}

export function MapView({ photos, selectedPhotoId, onSelectPhoto, onSaveMemo }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const leafletRef = useRef<LeafletGlobal | null>(null);
  const baseLayerRef = useRef<LeafletMapLibreLayer | null>(null);
  const markersRef = useRef<Record<string, { openPopup: () => void; remove: () => void }>>({});
  const popupBindingsRef = useRef<Record<string, PopupBinding>>({});
  const routeLineRef = useRef<{ remove: () => void } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadMap() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      try {
        const leaflet = await ensureLeaflet();

        if (!active || !containerRef.current) {
          return;
        }

        leafletRef.current = leaflet;

        const map = leaflet.map(containerRef.current, {
          zoomControl: true,
          worldCopyJump: true,
        });

        baseLayerRef.current = await createEnglishBaseLayer(leaflet);
        baseLayerRef.current.addTo(map);

        map.setView([20, 0], 2);
        mapRef.current = map;
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Unable to load the map.");
        }
      }
    }

    void loadMap();

    return () => {
      active = false;
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      disposePopupBindings(popupBindingsRef.current);
      routeLineRef.current?.remove();
      baseLayerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;

    if (!map || !leaflet) {
      return;
    }

    Object.values(markersRef.current).forEach((marker) => marker.remove());
    disposePopupBindings(popupBindingsRef.current);
    routeLineRef.current?.remove();
    markersRef.current = {};
    popupBindingsRef.current = {};
    routeLineRef.current = null;

    const coordinates = photos.map((photo) => [photo.latitude, photo.longitude] as [number, number]);

    for (const [index, photo] of photos.entries()) {
      const isStart = index === 0;
      const isEnd = index === photos.length - 1;
      const markerNode = document.createElement("div");
      markerNode.className = [
        "photo-marker",
        isStart ? "photo-marker-start" : "",
        isEnd ? "photo-marker-end" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const popupNode = document.createElement("div");
      const popupRoot = createRoot(popupNode);
      popupRoot.render(<MapPopupCard photo={photo} onSaveMemo={onSaveMemo} />);

      const marker = leaflet
        .marker([photo.latitude, photo.longitude], {
          icon: leaflet.divIcon({
            className: "photo-marker-wrapper",
            html: markerNode.outerHTML,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        })
        .addTo(map)
        .bindPopup(popupNode, {
          maxWidth: 260,
          closeButton: true,
        })
        .on("click", () => {
          onSelectPhoto(photo.id);
        })
        .on("popupopen", () => {
          onSelectPhoto(photo.id);
        });

      markersRef.current[photo.id] = marker;
      popupBindingsRef.current[photo.id] = { root: popupRoot };
    }

    if (coordinates.length > 1) {
      routeLineRef.current = leaflet
        .polyline(coordinates, {
          color: "#b65a2a",
          weight: 4,
          opacity: 0.85,
        })
        .addTo(map);
    }

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 6);
    } else if (coordinates.length > 1) {
      map.fitBounds(coordinates, {
        padding: [48, 48],
      });
    }
  }, [onSaveMemo, onSelectPhoto, photos]);

  useEffect(() => {
    const map = mapRef.current;
    const selected = selectedPhotoId ? photos.find((photo) => photo.id === selectedPhotoId) : null;

    if (!map || !selected) {
      return;
    }

    map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 4), {
      animate: true,
      duration: 0.75,
    });

    markersRef.current[selected.id]?.openPopup();
  }, [photos, selectedPhotoId]);

  if (loadError) {
    return (
      <section className="flex min-h-[60vh] flex-1 items-center justify-center rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="max-w-lg space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
            Map unavailable
          </p>
          <h3 className="text-2xl font-semibold text-slate-900">English map could not be loaded.</h3>
          <p className="text-sm leading-6 text-slate-600">{loadError}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-0 min-h-[60vh] flex-1 overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)] isolate">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between p-4">
        <div className="rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-700 backdrop-blur">
          English map
        </div>
        <div className="rounded-full bg-white/85 px-4 py-2 text-xs font-semibold text-slate-700 backdrop-blur">
          {photos.length > 1 ? `${photos.length - 1} route segments` : `${photos.length} stop`}
        </div>
      </div>
    </section>
  );
}
