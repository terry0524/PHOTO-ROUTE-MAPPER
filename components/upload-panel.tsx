"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, PlusCircle, Upload } from "lucide-react";
import { extractPhotoMetadata } from "@/lib/exif";
import type { ParsedPhotoInput, TripRecord, UploadTripSelection } from "@/lib/types";
import { MissingMetadataModal } from "@/components/missing-metadata-modal";

interface UploadPanelProps {
  isBusy: boolean;
  trips: TripRecord[];
  selectedTripId: string | null;
  onSelectedTripChange: (tripId: string | null) => void;
  onUploadComplete: (payload: ParsedPhotoInput[], tripSelection: UploadTripSelection) => Promise<void>;
}

const CREATE_NEW_TRIP = "__create_new_trip__";

export function UploadPanel({
  isBusy,
  trips,
  selectedTripId,
  onSelectedTripChange,
  onUploadComplete,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [drafts, setDrafts] = useState<ParsedPhotoInput[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [tripMode, setTripMode] = useState<"existing" | "new">(() =>
    trips.length > 0 && selectedTripId ? "existing" : "new",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trips.length === 0) {
      setTripMode("new");
      return;
    }

    if (selectedTripId) {
      setTripMode("existing");
    }
  }, [selectedTripId, trips.length]);

  function resetDrafts(nextDrafts: ParsedPhotoInput[]) {
    for (const draft of nextDrafts) {
      URL.revokeObjectURL(draft.previewUrl);
    }
  }

  function handleReviewClose() {
    resetDrafts(drafts);
    setDrafts([]);
    setIsReviewOpen(false);
  }

  function getTripSelection(): UploadTripSelection {
    if (tripMode === "existing" && selectedTripId) {
      return {
        selectedTripId,
        newTripName: "",
      };
    }

    return {
      selectedTripId: null,
      newTripName,
    };
  }

  function validateTripSelection() {
    if (tripMode === "existing") {
      if (!selectedTripId) {
        throw new Error("업로드할 여행을 먼저 선택해 주세요.");
      }

      return;
    }

    if (!newTripName.trim()) {
      throw new Error("새 여행 이름을 입력해 주세요.");
    }
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setError(null);
    setIsParsing(true);

    try {
      validateTripSelection();

      const parsed = await Promise.all(Array.from(files).map((file) => extractPhotoMetadata(file)));
      const needsReview = parsed.some(
        (item) => !item.takenAt || item.latitude === null || item.longitude === null,
      );

      if (needsReview) {
        setDrafts(parsed);
        setIsReviewOpen(true);
      } else {
        await onUploadComplete(parsed, getTripSelection());
        resetDrafts(parsed);
        if (tripMode === "new") {
          setNewTripName("");
        }
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to read photo metadata.");
    } finally {
      setIsParsing(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleConfirm(payload: ParsedPhotoInput[]) {
    setError(null);

    try {
      await onUploadComplete(payload, getTripSelection());
      resetDrafts(payload);
      setDrafts([]);
      setIsReviewOpen(false);
      if (tripMode === "new") {
        setNewTripName("");
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload photos.");
    }
  }

  return (
    <>
      <div className="flex w-full max-w-xl flex-col gap-3 lg:items-end">
        <div className="shell-panel w-full rounded-[1.3rem] p-3">
          <div className="flex flex-col gap-2 md:flex-row">
            <select
              value={tripMode === "existing" ? selectedTripId ?? "" : CREATE_NEW_TRIP}
              onChange={(event) => {
                if (event.target.value === CREATE_NEW_TRIP) {
                  setTripMode("new");
                  onSelectedTripChange(null);
                  return;
                }

                setTripMode("existing");
                onSelectedTripChange(event.target.value || null);
              }}
              className="min-h-11 w-full rounded-[1rem] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 text-sm text-slate-700 outline-none transition focus:border-[color:var(--accent)] md:flex-1"
            >
              <option value={CREATE_NEW_TRIP}>Create new trip</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setTripMode("new");
                onSelectedTripChange(null);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              <PlusCircle className="size-4" />
              New trip
            </button>
          </div>

          {tripMode === "new" ? (
            <input
              type="text"
              value={newTripName}
              onChange={(event) => setNewTripName(event.target.value)}
              placeholder="Trip name"
              className="mt-2 min-h-11 w-full rounded-[1rem] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 text-sm text-slate-700 outline-none transition focus:border-[color:var(--accent)]"
            />
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => handleFilesSelected(event.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy || isParsing}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-wait disabled:opacity-60"
        >
          {isBusy || isParsing ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {isParsing ? "Reading EXIF..." : "Upload photos"}
        </button>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
          <Camera className="size-3.5" />
          Local-only storage per browser
        </div>
        {error ? <p className="max-w-sm text-sm text-[color:var(--danger)]">{error}</p> : null}
      </div>

      <MissingMetadataModal
        isOpen={isReviewOpen}
        drafts={drafts}
        onClose={handleReviewClose}
        onConfirm={handleConfirm}
      />
    </>
  );
}
