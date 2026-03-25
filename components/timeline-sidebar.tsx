"use client";

import { format } from "date-fns";
import { Flag, MapPinned, PenSquare, Trash2 } from "lucide-react";
import type { PhotoRecord, TripRecord } from "@/lib/types";
import { cn, formatCoordinate } from "@/lib/utils";

interface TimelineSidebarProps {
  trips: TripRecord[];
  tripPhotoCounts: Record<string, number>;
  totalPhotoCount: number;
  selectedTripId: string | null;
  onSelectTrip: (tripId: string | null) => void;
  onDeleteTrip: (tripId: string) => void;
  photos: PhotoRecord[];
  selectedPhotoId: string | null;
  onSelectPhoto: (photoId: string) => void;
}

export function TimelineSidebar({
  trips,
  tripPhotoCounts,
  totalPhotoCount,
  selectedTripId,
  onSelectTrip,
  onDeleteTrip,
  photos,
  selectedPhotoId,
  onSelectPhoto,
}: TimelineSidebarProps) {
  return (
    <aside className="w-full shrink-0 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur lg:max-h-[calc(100vh-12rem)] lg:w-[var(--sidebar-width)] lg:overflow-y-auto">
      <div className="mb-5 space-y-3 px-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
            Trips
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Travel collections</h2>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onSelectTrip(null)}
            className={cn(
              "flex w-full items-center justify-between rounded-[1.25rem] border px-4 py-3 text-left transition",
              selectedTripId === null
                ? "border-[color:var(--accent)] bg-white shadow-[0_12px_28px_rgba(182,90,42,0.14)]"
                : "border-[color:var(--border)] bg-white/80 hover:bg-white",
            )}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">All trips</p>
              <p className="mt-1 text-xs text-slate-500">See the full photo history together.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {totalPhotoCount}
            </span>
          </button>

          {trips.map((trip) => {
            const isSelected = selectedTripId === trip.id;

            return (
              <div
                key={trip.id}
                className={cn(
                  "rounded-[1.25rem] border bg-white/80 transition",
                  isSelected
                    ? "border-[color:var(--accent)] bg-white shadow-[0_12px_28px_rgba(182,90,42,0.14)]"
                    : "border-[color:var(--border)] hover:bg-white",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectTrip(trip.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{trip.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{format(new Date(trip.created_at), "PPP")}</p>
                  </div>
                  <span className="rounded-full bg-[color:var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--accent-strong)]">
                    {tripPhotoCounts[trip.id] ?? 0}
                  </span>
                </button>

                <div className="flex items-center justify-between border-t border-[color:var(--border)] px-4 py-2.5">
                  <p className="text-xs text-slate-500">Delete this trip and its saved photos.</p>
                  <button
                    type="button"
                    onClick={() => onDeleteTrip(trip.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {trips.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm text-slate-500">
              Create your first trip from the upload area.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-4 px-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
            Timeline
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Chronological route</h2>
        </div>
        <div className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--accent-strong)]">
          {photos.length} photos
        </div>
      </div>

      <div className="space-y-3">
        {photos.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border)] bg-white/80 p-5 text-sm leading-6 text-slate-500">
            {selectedTripId
              ? "No photos in this trip yet. Upload photos into the selected trip to build its route."
              : "Select a trip or upload photos to start building routes."}
          </div>
        ) : null}

        {photos.map((photo, index) => {
          const isSelected = photo.id === selectedPhotoId;
          const isStart = index === 0;
          const isEnd = index === photos.length - 1;
          const manualFields = [
            photo.taken_at_source === "manual" ? "time" : null,
            photo.latitude_source === "manual" ? "lat" : null,
            photo.longitude_source === "manual" ? "lng" : null,
          ].filter(Boolean);

          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => onSelectPhoto(photo.id)}
              className={cn(
                "w-full rounded-[1.5rem] border p-3 text-left transition",
                isSelected
                  ? "border-[color:var(--accent)] bg-white shadow-[0_16px_32px_rgba(182,90,42,0.14)]"
                  : "border-[color:var(--border)] bg-white/80 hover:bg-white",
              )}
            >
              <div className="flex items-start gap-3">
                <img
                  src={photo.thumbnail_url}
                  alt={photo.file_name}
                  className="h-16 w-16 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {isStart ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        <Flag className="size-3" />
                        Start
                      </span>
                    ) : null}
                    {isEnd ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700">
                        <Flag className="size-3" />
                        End
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-[11px] font-semibold",
                        photo.metadata_source === "manual"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {photo.metadata_source === "manual" ? "Manual correction" : "EXIF"}
                    </span>
                    {manualFields.length > 0 ? (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                        {manualFields.join(" / ")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-slate-900">{photo.file_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{format(new Date(photo.taken_at), "PPP p")}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <MapPinned className="size-3.5" />
                    {formatCoordinate(photo.latitude)}, {formatCoordinate(photo.longitude)}
                  </div>
                  {photo.memo ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <PenSquare className="size-3.5" />
                      <span className="truncate">{photo.memo}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
