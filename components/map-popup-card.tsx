"use client";

import { format } from "date-fns";
import { LoaderCircle, MapPinned, Save } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import type { PhotoRecord } from "@/lib/types";
import { formatCoordinate } from "@/lib/utils";

interface MapPopupCardProps {
  photo: PhotoRecord;
  onSaveMemo: (id: string, memo: string) => Promise<void>;
}

export function MapPopupCard({ photo, onSaveMemo }: MapPopupCardProps) {
  const [memo, setMemo] = useState(photo.memo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const manualFields = [
    photo.taken_at_source === "manual" ? "time" : null,
    photo.latitude_source === "manual" ? "lat" : null,
    photo.longitude_source === "manual" ? "lng" : null,
  ].filter(Boolean);

  useEffect(() => {
    setMemo(photo.memo ?? "");
  }, [photo.memo]);

  function handleSave() {
    startTransition(async () => {
      setError(null);
      try {
        await onSaveMemo(photo.id, memo);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Unable to save memo.");
      }
    });
  }

  return (
    <div className="w-[240px] bg-white">
      <img src={photo.thumbnail_url} alt={photo.file_name} className="h-28 w-full object-cover" />
      <div className="space-y-2.5 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="line-clamp-1 text-[13px] font-semibold text-slate-900">{photo.file_name}</p>
          <div className="flex flex-wrap justify-end gap-1">
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                photo.metadata_source === "manual" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {photo.metadata_source === "manual" ? "Manual" : "EXIF"}
            </span>
            {manualFields.length > 0 ? (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                {manualFields.join(" / ")}
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-[13px] text-slate-600">{format(new Date(photo.taken_at), "PPP p")}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <MapPinned className="size-3.5" />
          {formatCoordinate(photo.latitude)}, {formatCoordinate(photo.longitude)}
        </div>
        <label className="block space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Memo</span>
          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            rows={3}
            placeholder="Add a note for this stop..."
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none transition focus:border-[color:var(--accent)]"
          />
        </label>
        {error ? <p className="text-xs text-[color:var(--danger)]">{error}</p> : null}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save memo
        </button>
      </div>
    </div>
  );
}
