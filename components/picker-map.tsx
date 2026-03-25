"use client";

import { useEffect, useRef, useState } from "react";
import { createEnglishBaseLayer, ensureLeaflet, type LeafletGlobal, type LeafletMapInstance, type LeafletMapLibreLayer } from "@/lib/leaflet";

interface CoordinatePickerMapProps {
  latitude: number;
  longitude: number;
  onPick: (latitude: number, longitude: number) => void;
}

export function CoordinatePickerMap({ latitude, longitude, onPick }: CoordinatePickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const markerRef = useRef<{ setLatLng: (coords: [number, number]) => void; remove: () => void } | null>(null);
  const leafletRef = useRef<LeafletGlobal | null>(null);
  const baseLayerRef = useRef<LeafletMapLibreLayer | null>(null);
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
          zoomControl: false,
        });

        baseLayerRef.current = await createEnglishBaseLayer(leaflet);
        baseLayerRef.current.addTo(map);

        const marker = leaflet
          .marker([latitude, longitude], {
            icon: leaflet.divIcon({
              className: "photo-marker-wrapper",
              html: '<div class="photo-marker photo-marker-picker"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            }),
          })
          .addTo(map);

        map.setView([latitude, longitude], 2);
        map.on("click", (event) => {
          const nextLat = Number(event.latlng.lat.toFixed(6));
          const nextLng = Number(event.latlng.lng.toFixed(6));
          marker.setLatLng([nextLat, nextLng]);
          onPick(nextLat, nextLng);
        });

        mapRef.current = map;
        markerRef.current = marker;
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Unable to load the map.");
        }
      }
    }

    void loadMap();

    return () => {
      active = false;
      markerRef.current?.remove();
      baseLayerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, [onPick]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) {
      return;
    }

    mapRef.current.flyTo([latitude, longitude], Math.max(mapRef.current.getZoom(), 2), {
      animate: true,
      duration: 0.4,
    });
    markerRef.current.setLatLng([latitude, longitude]);
  }, [latitude, longitude]);

  if (loadError) {
    return (
      <div className="flex h-[260px] w-full items-center justify-center bg-slate-100 p-6 text-center text-sm leading-6 text-slate-500">
        {loadError}
      </div>
    );
  }

  return <div ref={containerRef} className="h-[260px] w-full" />;
}
