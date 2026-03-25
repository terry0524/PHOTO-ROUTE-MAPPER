import { z } from "zod";

export const photoUploadSchema = z.array(
  z.object({
    clientId: z.string(),
    fileName: z.string(),
    takenAt: z.string().datetime(),
    takenAtSource: z.enum(["exif", "manual"]),
    latitude: z.number().min(-90).max(90),
    latitudeSource: z.enum(["exif", "manual"]),
    longitude: z.number().min(-180).max(180),
    longitudeSource: z.enum(["exif", "manual"]),
    metadataSource: z.enum(["exif", "manual"]),
  }),
);

export const memoSchema = z.object({
  memo: z.string().max(2000),
});
