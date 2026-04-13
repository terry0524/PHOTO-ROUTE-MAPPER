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
    <aside className="shell-panel w-full rounded-[1.5rem] p-3 lg:sticky lg:top-5 lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto">
      <div className="mb-4 space-y-3 px-1">
        <div>
          <p className="eyebrow">Trips</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Collections</h2>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onSelectTrip(null)}
            className={cn(
              "flex w-full items-center justify-between rounded-[1.1rem] border px-4 py-3 text-left transition",
              selectedTripId === null
                ? "border-[color:var(--accent)] bg-white"
                : "border-[color:var(--border)] bg-white/70 hover:bg-white",
            )}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">All trips</p>
              <p className="mt-1 text-xs text-slate-500">Browse everything together</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {totalPhotoCount}
            </span>
          </button>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
            {trips.map((trip) => {
              const isSelected = selectedTripId === trip.id;

              return (
                <div
                  key={trip.id}
                  className={cn(
                    "min-w-[240px] rounded-[1.1rem] border bg-white/72 lg:min-w-0",
                    isSelected ? "border-[color:var(--accent)] bg-white" : "border-[color:var(--border)]",
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
                  <div className="flex items-center justify-end border-t border-[color:var(--border)] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onDeleteTrip(trip.id)}
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {trips.length === 0 ? (
            <div className="rounded-[1.1rem] border border-dashed border-[color:var(--border)] bg-white/70 px-4 py-3 text-sm text-slate-500">
              Create your first trip from the upload area.
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-4 px-1">
        <div>
          <p className="eyebrow">Timeline</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Stops</h2>
        </div>
        <div className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--accent-strong)]">
          {photos.length}
        </div>
      </div>

      <div className="space-y-3">
        {photos.length === 0 ? (
          <div className="rounded-[1.1rem] border border-dashed border-[color:var(--border)] bg-white/70 p-4 text-sm leading-6 text-slate-500">
            {selectedTripId
              ? "No photos in this trip yet."
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
                "w-full rounded-[1.2rem] border p-3 text-left transition",
                isSelected ? "border-[color:var(--accent)] bg-white" : "border-[color:var(--border)] bg-white/78 hover:bg-white",
              )}
            >
              <div className="flex items-start gap-3">
                <img src={photo.thumbnail_url} alt={photo.file_name} className="h-14 w-14 rounded-[0.9rem] object-cover" />
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
                    <span className={cn(
                      "rounded-full px-2 py-1 text-[11px] font-semibold",
                      photo.metadata_source === "manual" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600",
                    )}>
                      {photo.metadata_source === "manual" ? "Manual" : "EXIF"}
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
