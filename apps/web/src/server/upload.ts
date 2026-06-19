import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { extractColors, type ExtractedColor } from "./color-extract";

const cloudConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (cloudConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export type UploadResult = {
  url: string;
  publicId: string | null;
  /** Background-removed PNG (Cloudinary AI). null until Cloudinary is configured. */
  bgRemovedUrl: string | null;
  storage: "cloudinary" | "local";
  colors: ExtractedColor[];
};

/**
 * Store an uploaded image + extract dominant colors. Uses Cloudinary when
 * configured (with AI background removal), else a local public/uploads fallback
 * (dev only) so the flow works without keys.
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const colors = await extractColors(buffer).catch(() => [] as ExtractedColor[]);

  if (cloudConfigured) {
    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "closet" }, (err, res) => {
            if (err || !res) reject(err ?? new Error("upload failed"));
            else
              resolve(res as unknown as { secure_url: string; public_id: string });
          })
          .end(buffer);
      },
    );
    const bgRemovedUrl = cloudinary.url(result.public_id, {
      transformation: [{ effect: "background_removal" }],
      format: "png",
      secure: true,
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      bgRemovedUrl,
      storage: "cloudinary",
      colors,
    };
  }

  // Dev fallback — written under apps/web/public/uploads, served at /uploads/*.
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const safe = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await writeFile(join(dir, safe), buffer);
  return {
    url: `/uploads/${safe}`,
    publicId: null,
    bgRemovedUrl: null,
    storage: "local",
    colors,
  };
}
