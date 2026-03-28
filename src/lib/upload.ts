import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

// Magic bytes for each image format
const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF
  "image/gif": [0x47, 0x49, 0x46],
};

/**
 * Validates file by MIME type, extension, and magic bytes (3-layer check).
 */
export function validateFile(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): { valid: boolean; error?: string } {
  // 1. MIME type check
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `허용되지 않는 파일 형식입니다: ${mimeType}`,
    };
  }

  // 2. Extension check
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `허용되지 않는 확장자입니다: ${ext}`,
    };
  }

  // 3. Magic bytes check
  const expectedBytes = MAGIC_BYTES[mimeType];
  if (expectedBytes) {
    for (let i = 0; i < expectedBytes.length; i++) {
      if (buffer[i] !== expectedBytes[i]) {
        return {
          valid: false,
          error: "파일 내용이 선언된 형식과 일치하지 않습니다",
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Saves a processed image buffer to disk.
 * Returns the relative URL path (e.g. /uploads/userCode/gallery/1234-abcd.webp).
 */
export async function saveFile(
  buffer: Buffer,
  userCode: string,
  type: string
): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", userCode, type);
  await fs.mkdir(dir, { recursive: true });

  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex");
  const filename = `${timestamp}-${random}.webp`;

  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, buffer);

  return `/uploads/${userCode}/${type}/${filename}`;
}

/**
 * Deletes a file from disk given its relative URL path.
 */
export async function deleteFile(relativePath: string): Promise<void> {
  const filePath = path.join(process.cwd(), "public", relativePath);
  try {
    await fs.unlink(filePath);
  } catch {
    // File may already be deleted — ignore
  }
}
