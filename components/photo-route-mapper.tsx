"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ParsedPhotoInput, PhotoRecord, TripRecord, UploadTripSelection } from "@/lib/types";
import { UploadPanel } from "@/components/upload-panel";
import { TimelineSidebar } from "@/components/timeline-sidebar";
import { MapView } from "@/components/map-view";
import { deleteTrip, loadAppData, saveUploadedPhotos, updatePhotoMemo } from "@/lib/data";

export function PhotoRouteMapper({ initialPhotos }: { initialPhotos: PhotoRecord[] }) {
  const [photos, setPhotos] = useState<PhotoRecord[]>(initialPhotos);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(initialPhotos[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    void (async () => {
      const snapshot = await loadAppData();

      if (active) {
        startTransition(() => {
          setPhotos(snapshot.photos);
          setTrips(snapshot.trips);
          setSelectedPhotoId(snapshot.photos[0]?.id ?? null);
        });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()),
    [photos],
  );

  const filteredPhotos = useMemo(
    () => (selectedTripId ? sortedPhotos.filter((photo) => photo.trip_id === selectedTripId) : sortedPhotos),
    [selectedTripId, sortedPhotos],
  );

  const tripPhotoCounts = useMemo(
    () =>
      sortedPhotos.reduce<Record<string, number>>((acc, photo) => {
        acc[photo.trip_id] = (acc[photo.trip_id] ?? 0) + 1;
        return acc;
      }, {}),
    [sortedPhotos],
  );

  useEffect(() => {
    if (filteredPhotos.length === 0) {
      setSelectedPhotoId(null);
      return;
    }

    if (selectedPhotoId === null || filteredPhotos.some((photo) => photo.id === selectedPhotoId) === false) {
      setSelectedPhotoId(filteredPhotos[0]?.id ?? null);
    }
  }, [filteredPhotos, selectedPhotoId]);

  async function handleUploadReady(payload: ParsedPhotoInput[], tripSelection: UploadTripSelection) {
    const result = await saveUploadedPhotos(payload, tripSelection);

    startTransition(() => {
      setPhotos((current) =>
        [...current, ...result.photos].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()),
      );
      setTrips((current) => {
        if (current.some((trip) => trip.id === result.trip.id)) {
          return current;
        }

        return [...current, result.trip].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      });
      setSelectedTripId(result.trip.id);
      setSelectedPhotoId(result.photos[0]?.id ?? null);
    });
  }

  async function handleDeleteTrip(tripId: string) {
    const trip = trips.find((item) => item.id === tripId);

    if (!trip) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${trip.name}" and all photos saved inside it? This only removes local IndexedDB data on this browser.`,
    );

    if (!shouldDelete) {
      return;
    }

    const result = await deleteTrip(tripId);

    startTransition(() => {
      setTrips((current) => current.filter((tripItem) => tripItem.id !== result.deletedTripId));
      setPhotos((current) => current.filter((photo) => result.deletedPhotoIds.includes(photo.id) === false));
      setSelectedTripId((current) => (current === result.deletedTripId ? null : current));
      setSelectedPhotoId((current) => {
        if (current === null) {
          return null;
        }

        return result.deletedPhotoIds.includes(current) ? null : current;
      });
    });
  }

  async function handleMemoSave(id: string, memo: string) {
    const photo = await updatePhotoMemo(id, memo);
    setPhotos((current) => current.map((item) => (item.id === id ? photo : item)));
  }

  return (
    <main className="min-h-screen px-3 py-3 md:px-5 md:py-5">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4">
        <section className="shell-panel rounded-[1.75rem] px-4 py-5 md:px-6 md:py-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="eyebrow">Photo Route Mapper</p>
              <h1 data-display="true" className="max-w-3xl text-[2.4rem] leading-[0.95] text-slate-900 md:text-6xl">
                Minimal trip mapping for travel photos.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[color:var(--muted)] md:text-base">
                Upload photos, correct missing metadata, and browse each trip on a focused map and timeline.
              </p>
            </div>
            <UploadPanel
              isBusy={isPending}
              trips={trips}
              selectedTripId={selectedTripId}
              onSelectedTripChange={setSelectedTripId}
              onUploadComplete={handleUploadReady}
            />
          </div>
        </section>

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
          <TimelineSidebar
            trips={trips}
            tripPhotoCounts={tripPhotoCounts}
            totalPhotoCount={sortedPhotos.length}
            selectedTripId={selectedTripId}
            onSelectTrip={setSelectedTripId}
            onDeleteTrip={handleDeleteTrip}
            photos={filteredPhotos}
            selectedPhotoId={selectedPhotoId}
            onSelectPhoto={setSelectedPhotoId}
          />
          <MapView
            photos={filteredPhotos}
            selectedPhotoId={selectedPhotoId}
            onSelectPhoto={setSelectedPhotoId}
            onSaveMemo={handleMemoSave}
          />
        </div>
      </div>
    </main>
  );
}
