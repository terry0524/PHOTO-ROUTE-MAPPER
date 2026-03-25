"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, LoaderCircle, MapPinned, Search } from "lucide-react";
import type { ManualMetadataDraft, ParsedPhotoInput, MetadataSource } from "@/lib/types";
import { cn, formatCoordinate, toDatetimeLocalValue } from "@/lib/utils";
import { CoordinatePickerMap } from "@/components/picker-map";

interface MissingMetadataModalProps {
  drafts: ParsedPhotoInput[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: ParsedPhotoInput[]) => Promise<void>;
}

type GeocodeResult = {
  displayName: string;
  latitude: number;
  longitude: number;
};

function createDraftState(photo: ParsedPhotoInput): ManualMetadataDraft {
  return {
    takenAt: photo.takenAt ? toDatetimeLocalValue(photo.takenAt) : "",
    latitude: photo.latitude !== null ? String(photo.latitude) : "",
    longitude: photo.longitude !== null ? String(photo.longitude) : "",
    locationQuery: "",
  };
}

function getFieldSourceBadge(source: MetadataSource) {
  return source === "manual" ? "Manual" : "EXIF";
}

async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "ko,en");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("위치 검색을 불러오지 못했습니다.");
  }

  const data = (await response.json()) as Array<{
    display_name?: string;
    lat?: string;
    lon?: string;
  }>;

  return data
    .map((item) => ({
      displayName: item.display_name ?? "Unnamed location",
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    }))
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
}

export function MissingMetadataModal({
  drafts,
  isOpen,
  onClose,
  onConfirm,
}: MissingMetadataModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draftState, setDraftState] = useState<Record<string, ManualMetadataDraft>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCurrentIndex(0);
    setDraftState(
      drafts.reduce<Record<string, ManualMetadataDraft>>((acc, photo) => {
        acc[photo.clientId] = createDraftState(photo);
        return acc;
      }, {}),
    );
    setSearchResults([]);
    setSearchError(null);
    setError(null);
  }, [drafts, isOpen]);

  const currentPhoto = drafts[currentIndex];

  const completion = useMemo(() => {
    return drafts.every((photo) => {
      const values = draftState[photo.clientId] ?? createDraftState(photo);
      return values.takenAt && values.latitude && values.longitude;
    });
  }, [draftState, drafts]);

  if (!isOpen || !currentPhoto || typeof document === "undefined") {
    return null;
  }

  const currentDraft = draftState[currentPhoto.clientId] ?? createDraftState(currentPhoto);
  const missingAny = !currentPhoto.takenAt || currentPhoto.latitude === null || currentPhoto.longitude === null;
  const previewLatitude = Number.parseFloat(currentDraft.latitude);
  const previewLongitude = Number.parseFloat(currentDraft.longitude);

  function updateField(field: keyof ManualMetadataDraft, value: string) {
    setDraftState((current) => ({
      ...current,
      [currentPhoto.clientId]: {
        ...currentDraft,
        [field]: value,
      },
    }));
  }

  function applyCoordinates(latitude: number, longitude: number, locationQuery?: string) {
    setDraftState((current) => ({
      ...current,
      [currentPhoto.clientId]: {
        ...currentDraft,
        latitude: String(latitude),
        longitude: String(longitude),
        locationQuery: locationQuery ?? currentDraft.locationQuery,
      },
    }));
  }

  async function handleLocationSearch() {
    const query = currentDraft.locationQuery.trim();

    if (!query) {
      setSearchResults([]);
      setSearchError("위치명을 입력해 주세요.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchPlaces(query);
      setSearchResults(results);

      if (results.length === 0) {
        setSearchError("검색 결과가 없습니다. 더 구체적으로 입력해 주세요.");
      }
    } catch (searchFailure) {
      setSearchResults([]);
      setSearchError(searchFailure instanceof Error ? searchFailure.message : "위치 검색에 실패했습니다.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSubmit() {
    const completed = drafts.map((photo) => {
      const values = draftState[photo.clientId] ?? createDraftState(photo);
      const latitude = Number(values.latitude);
      const longitude = Number(values.longitude);

      if (
        !values.takenAt ||
        Number.isNaN(latitude) ||
        Number.isNaN(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new Error(`Please complete metadata for ${photo.fileName}.`);
      }

      const takenAtSource = photo.takenAt ? photo.takenAtSource : "manual";
      const latitudeSource = photo.latitude !== null ? photo.latitudeSource : "manual";
      const longitudeSource = photo.longitude !== null ? photo.longitudeSource : "manual";

      return {
        ...photo,
        takenAt: new Date(values.takenAt).toISOString(),
        takenAtSource,
        latitude,
        latitudeSource,
        longitude,
        longitudeSource,
        metadataSource:
          takenAtSource === "exif" && latitudeSource === "exif" && longitudeSource === "exif"
            ? "exif"
            : ("manual" as MetadataSource),
      };
    });

    setError(null);
    setIsSaving(true);

    try {
      await onConfirm(completed);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save photo metadata.");
    } finally {
      setIsSaving(false);
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="relative z-[10000] grid max-h-[95vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/50 bg-[color:var(--surface-strong)] shadow-2xl lg:grid-cols-[1.1fr_1fr]">
        <div className="relative min-h-[340px] bg-slate-900">
          <img src={currentPhoto.previewUrl} alt={currentPhoto.fileName} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent p-5 text-white">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-200">
              <MapPinned className="size-3.5" />
              Metadata review
            </div>
            <p className="text-lg font-semibold">{currentPhoto.fileName}</p>
            <p className="mt-1 text-sm text-slate-200">
              {missingAny
                ? "This photo is missing required metadata. Add it before the upload can continue."
                : "EXIF was found. You can still adjust it before saving if needed."}
            </p>
          </div>
        </div>

        <div className="flex flex-col overflow-y-auto p-5 md:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Review extracted metadata</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                날짜를 확인하고, 위치명으로 장소를 검색하거나 지도에서 직접 클릭해 좌표를 설정하세요.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[color:var(--border)] px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              Close
            </button>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2">
            {drafts.map((photo, index) => {
              const values = draftState[photo.clientId] ?? createDraftState(photo);
              const complete = Boolean(values.takenAt && values.latitude && values.longitude);

              return (
                <button
                  key={photo.clientId}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(index);
                    setSearchResults([]);
                    setSearchError(null);
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    currentIndex === index
                      ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]"
                      : "border-[color:var(--border)] bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {complete ? <Check className="size-3.5 text-[color:var(--success)]" /> : <AlertTriangle className="size-3.5 text-[color:var(--warning)]" />}
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Taken at</span>
              <input
                type="datetime-local"
                value={currentDraft.takenAt}
                onChange={(event) => updateField("takenAt", event.target.value)}
                className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none ring-0 transition focus:border-[color:var(--accent)]"
              />
            </label>
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Location name</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentDraft.locationQuery}
                  onChange={(event) => updateField("locationQuery", event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleLocationSearch();
                    }
                  }}
                  placeholder="예: 해운대해수욕장, 부산역, Seoul Station"
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => void handleLocationSearch()}
                  disabled={isSearching}
                  className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  {isSearching ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
                  검색
                </button>
              </div>
            </div>
          </div>

          {searchError ? <p className="mt-3 text-sm text-[color:var(--danger)]">{searchError}</p> : null}

          {searchResults.length > 0 ? (
            <div className="mt-3 space-y-2 rounded-[1.5rem] border border-[color:var(--border)] bg-white p-3">
              {searchResults.map((result) => (
                <button
                  key={`${result.displayName}-${result.latitude}-${result.longitude}`}
                  type="button"
                  onClick={() => {
                    applyCoordinates(result.latitude, result.longitude, result.displayName);
                    setSearchResults([]);
                    setSearchError(null);
                  }}
                  className="flex w-full items-start justify-between gap-3 rounded-2xl border border-slate-200 px-3 py-2 text-left transition hover:border-[color:var(--accent)] hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{result.displayName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatCoordinate(result.latitude)}, {formatCoordinate(result.longitude)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-[color:var(--accent)]">선택</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[color:var(--border)]">
            <CoordinatePickerMap
              latitude={Number.isFinite(previewLatitude) ? previewLatitude : 37.5665}
              longitude={Number.isFinite(previewLongitude) ? previewLongitude : 126.978}
              onPick={(latitude, longitude) => {
                applyCoordinates(latitude, longitude);
                setSearchResults([]);
                setSearchError(null);
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Current coordinates:{" "}
              {currentDraft.latitude && currentDraft.longitude
                ? `${formatCoordinate(Number(currentDraft.latitude))}, ${formatCoordinate(Number(currentDraft.longitude))}`
                : "Not set yet"}
            </span>
            <span>
              Time {getFieldSourceBadge(currentPhoto.takenAtSource)} / Lat {getFieldSourceBadge(currentPhoto.latitudeSource)} / Lng {getFieldSourceBadge(currentPhoto.longitudeSource)}
            </span>
          </div>

          {error ? <p className="mt-4 text-sm text-[color:var(--danger)]">{error}</p> : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex((value) => Math.max(0, value - 1));
                  setSearchResults([]);
                  setSearchError(null);
                }}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="size-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex((value) => Math.min(drafts.length - 1, value + 1));
                  setSearchResults([]);
                  setSearchError(null);
                }}
                disabled={currentIndex === drafts.length - 1}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!completion || isSaving}
              className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save all photos"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
