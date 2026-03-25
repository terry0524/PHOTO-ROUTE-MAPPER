"use client";

import type { AppDataSnapshot, ParsedPhotoInput, PhotoRecord, TripRecord, UploadTripSelection } from "@/lib/types";

const DB_NAME = "photo-route-mapper";
const PHOTOS_STORE = "photos";
const TRIPS_STORE = "trips";
const DB_VERSION = 2;

function sortPhotos(photos: PhotoRecord[]) {
  return [...photos].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime());
}

function sortTrips(trips: TripRecord[]) {
  return [...trips].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB."));
    request.onupgradeneeded = () => {
      const database = request.result;

      if (database.objectStoreNames.contains(PHOTOS_STORE) === false) {
        const store = database.createObjectStore(PHOTOS_STORE, { keyPath: "id" });
        store.createIndex("taken_at", "taken_at", { unique: false });
        store.createIndex("trip_id", "trip_id", { unique: false });
      } else {
        const transaction = request.transaction;
        const store = transaction?.objectStore(PHOTOS_STORE);

        if (store && store.indexNames.contains("trip_id") === false) {
          store.createIndex("trip_id", "trip_id", { unique: false });
        }
      }

      if (database.objectStoreNames.contains(TRIPS_STORE) === false) {
        const store = database.createObjectStore(TRIPS_STORE, { keyPath: "id" });
        store.createIndex("created_at", "created_at", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
  });
}

async function withStores<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  operation: (stores: Record<string, IDBObjectStore>) => Promise<T>,
): Promise<T> {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(storeNames, mode);
    const stores = Object.fromEntries(storeNames.map((name) => [name, transaction.objectStore(name)]));
    const result = await operation(stores);
    await transactionDone(transaction);
    return result;
  } finally {
    database.close();
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error ?? new Error("Unable to read photo file."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to create a local image preview."));
        return;
      }

      resolve(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

async function migrateLegacyTrips(stores: Record<string, IDBObjectStore>): Promise<AppDataSnapshot> {
  const photoRows = ((await requestToPromise(stores[PHOTOS_STORE].getAll())) ?? []) as PhotoRecord[];
  const tripRows = ((await requestToPromise(stores[TRIPS_STORE].getAll())) ?? []) as TripRecord[];
  const photosMissingTrip = photoRows.filter((photo) => photo.trip_id === "");

  if (photosMissingTrip.length === 0) {
    return {
      photos: sortPhotos(photoRows),
      trips: sortTrips(tripRows),
    };
  }

  const fallbackTrip: TripRecord =
    tripRows[0] ?? {
      id: crypto.randomUUID(),
      name: "Imported trip",
      created_at: new Date().toISOString(),
    };

  if (tripRows.length === 0) {
    await requestToPromise(stores[TRIPS_STORE].put(fallbackTrip));
    tripRows.push(fallbackTrip);
  }

  for (const photo of photosMissingTrip) {
    const nextPhoto: PhotoRecord = {
      ...photo,
      trip_id: fallbackTrip.id,
    };

    await requestToPromise(stores[PHOTOS_STORE].put(nextPhoto));
  }

  const nextPhotos = photoRows.map((photo) => ({
    ...photo,
    trip_id: photo.trip_id || fallbackTrip.id,
  }));

  return {
    photos: sortPhotos(nextPhotos),
    trips: sortTrips(tripRows),
  };
}

export async function loadAppData(): Promise<AppDataSnapshot> {
  if (typeof window === "undefined" || ("indexedDB" in window) === false) {
    return { photos: [], trips: [] };
  }

  return withStores([PHOTOS_STORE, TRIPS_STORE], "readwrite", migrateLegacyTrips);
}

export async function saveUploadedPhotos(
  payload: ParsedPhotoInput[],
  tripSelection: UploadTripSelection,
): Promise<{ trip: TripRecord; photos: PhotoRecord[] }> {
  const newTripName = tripSelection.newTripName.trim();
  const preparedUploads = await Promise.all(
    payload.map(async (item) => ({
      item,
      imageDataUrl: await readAsDataUrl(item.file),
    })),
  );

  return withStores([PHOTOS_STORE, TRIPS_STORE], "readwrite", async (stores) => {
    let trip: TripRecord | undefined;

    if (tripSelection.selectedTripId) {
      trip = (await requestToPromise(stores[TRIPS_STORE].get(tripSelection.selectedTripId))) as TripRecord | undefined;
    }

    if (trip === undefined) {
      if (!newTripName) {
        throw new Error("Select a trip or create a new trip before uploading.");
      }

      trip = {
        id: crypto.randomUUID(),
        name: newTripName,
        created_at: new Date().toISOString(),
      };

      await requestToPromise(stores[TRIPS_STORE].put(trip));
    }

    const nextPhotos = preparedUploads.map(({ item, imageDataUrl }) => ({
      id: crypto.randomUUID(),
      trip_id: trip.id,
      file_name: item.fileName,
      storage_path: `indexeddb://${item.fileName}`,
      image_url: imageDataUrl,
      thumbnail_url: imageDataUrl,
      taken_at: item.takenAt!,
      taken_at_source: item.takenAtSource,
      latitude: item.latitude!,
      latitude_source: item.latitudeSource,
      longitude: item.longitude!,
      longitude_source: item.longitudeSource,
      memo: null,
      metadata_source: item.metadataSource,
      created_at: new Date().toISOString(),
    })) satisfies PhotoRecord[];

    for (const photo of nextPhotos) {
      await requestToPromise(stores[PHOTOS_STORE].put(photo));
    }

    return {
      trip,
      photos: sortPhotos(nextPhotos),
    };
  });
}

export async function deleteTrip(tripId: string): Promise<{ deletedTripId: string; deletedPhotoIds: string[] }> {
  return withStores([PHOTOS_STORE, TRIPS_STORE], "readwrite", async (stores) => {
    const trip = (await requestToPromise(stores[TRIPS_STORE].get(tripId))) as TripRecord | undefined;

    if (trip === undefined) {
      throw new Error("Trip not found.");
    }

    const allPhotos = ((await requestToPromise(stores[PHOTOS_STORE].getAll())) ?? []) as PhotoRecord[];
    const photosToDelete = allPhotos.filter((photo) => photo.trip_id === tripId);

    for (const photo of photosToDelete) {
      await requestToPromise(stores[PHOTOS_STORE].delete(photo.id));
    }

    await requestToPromise(stores[TRIPS_STORE].delete(tripId));

    return {
      deletedTripId: tripId,
      deletedPhotoIds: photosToDelete.map((photo) => photo.id),
    };
  });
}

export async function updatePhotoMemo(id: string, memo: string): Promise<PhotoRecord> {
  return withStores([PHOTOS_STORE], "readwrite", async (stores) => {
    const photo = (await requestToPromise(stores[PHOTOS_STORE].get(id))) as PhotoRecord | undefined;

    if (photo === undefined) {
      throw new Error("Photo not found.");
    }

    const nextPhoto: PhotoRecord = {
      ...photo,
      memo,
    };

    await requestToPromise(stores[PHOTOS_STORE].put(nextPhoto));
    return nextPhoto;
  });
}
