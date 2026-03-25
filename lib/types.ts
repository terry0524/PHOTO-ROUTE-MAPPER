export type MetadataSource = "exif" | "manual";

export interface TripRecord {
  id: string;
  name: string;
  created_at: string;
}

export interface PhotoRecord {
  id: string;
  trip_id: string;
  file_name: string;
  storage_path: string;
  image_url: string;
  thumbnail_url: string;
  taken_at: string;
  taken_at_source: MetadataSource;
  latitude: number;
  latitude_source: MetadataSource;
  longitude: number;
  longitude_source: MetadataSource;
  memo: string | null;
  metadata_source: MetadataSource;
  created_at: string;
}

export interface ParsedPhotoInput {
  clientId: string;
  file: File;
  previewUrl: string;
  fileName: string;
  takenAt: string | null;
  takenAtSource: MetadataSource;
  latitude: number | null;
  latitudeSource: MetadataSource;
  longitude: number | null;
  longitudeSource: MetadataSource;
  metadataSource: MetadataSource;
}

export interface ManualMetadataDraft {
  takenAt: string;
  latitude: string;
  longitude: string;
  locationQuery: string;
}

export interface UploadTripSelection {
  selectedTripId: string | null;
  newTripName: string;
}

export interface AppDataSnapshot {
  photos: PhotoRecord[];
  trips: TripRecord[];
}
