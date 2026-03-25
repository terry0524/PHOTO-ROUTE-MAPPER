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

    if (trip === undefined) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete \"${trip.name}\" and all photos saved inside it? This only removes local IndexedDB data on this browser.`,
    );

    if (shouldDelete === false) {
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
    <main className="flex min-h-screen flex-col">
      <div className="border-b border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[color:var(--accent)]">
              Photo Route Mapper
            </p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Turn scattered travel photos into organized trip routes.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Create separate trips, upload photos into each one, fix metadata gaps, and review each route on its own map and timeline.
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
      </div>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 lg:flex-row lg:p-6">
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
    </main>
  );
}
