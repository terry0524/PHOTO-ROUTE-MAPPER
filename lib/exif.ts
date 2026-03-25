"use client";

import exifr from "exifr";
import type { ParsedPhotoInput } from "@/lib/types";

type ExifResult = {
  DateTimeOriginal?: Date | string;
  latitude?: number;
  longitude?: number;
};

type GpsResult = {
  latitude?: number;
  longitude?: number;
};

export async function extractPhotoMetadata(file: File): Promise<ParsedPhotoInput> {
  const [exif, gps] = await Promise.all([
    exifr.parse(file, ["DateTimeOriginal", "latitude", "longitude"]) as Promise<ExifResult | null>,
    exifr.gps(file) as Promise<GpsResult | null>,
  ]);

  const takenAt = exif?.DateTimeOriginal ? new Date(exif.DateTimeOriginal).toISOString() : null;
  const latitude =
    typeof gps?.latitude === "number"
      ? gps.latitude
      : typeof exif?.latitude === "number"
        ? exif.latitude
        : null;
  const longitude =
    typeof gps?.longitude === "number"
      ? gps.longitude
      : typeof exif?.longitude === "number"
        ? exif.longitude
        : null;
  const takenAtSource = takenAt ? "exif" : "manual";
  const latitudeSource = latitude !== null ? "exif" : "manual";
  const longitudeSource = longitude !== null ? "exif" : "manual";

  return {
    clientId: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    fileName: file.name,
    takenAt,
    takenAtSource,
    latitude,
    latitudeSource,
    longitude,
    longitudeSource,
    metadataSource:
      takenAtSource === "exif" && latitudeSource === "exif" && longitudeSource === "exif"
        ? "exif"
        : "manual",
  };
}
