import {
  deleteObject,
  ref,
  uploadBytesResumable,
  type FirebaseStorage,
  type UploadMetadata,
} from 'firebase/storage';
import { LIMITS } from '../config';
import { plural } from '../lib/format';
import { prepareImage, type PreparedImage } from '../lib/image-processing';
import { AppError } from './errors';
import { auth, firebaseConfig, storage } from './firebase';
import type { StoredImage } from '../types';

/**
 * Photos are stored in Cloud Storage for Firebase. Each upload is shrunk in
 * the browser first (see image-processing.ts) and stored twice: the full
 * image and a small `_thumb` copy next to it, so lists and markers never load
 * full-size photos.
 *
 * Image storage stays behind the ImageStorage interface, so the provider can
 * change without touching the components.
 */

/** Report and proof photos, or admin photos of cleanup actions. */
export type ImageFolder = 'report-images' | 'action-images';

export interface ImageStorage {
  readonly id: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly maxFileLabel: string;
  /** `onProgress` starts once the shrunk image begins uploading. */
  upload(
    file: File,
    folder: ImageFolder,
    onProgress?: (percent: number) => void,
  ): Promise<StoredImage>;
  /** Best effort: failures are logged and never thrown. */
  remove(urls: string[]): Promise<void>;
}

const MAX_FILE_LABEL = `${Math.round(LIMITS.imageMaxBytes / (1024 * 1024))} MB`;
const MEDIA_BASE = 'https://firebasestorage.googleapis.com/v0/b/';

function fileTooLarge(file: File): boolean {
  return file.size > LIMITS.imageMaxBytes;
}

function assertValidImage(file: File): void {
  if (!(LIMITS.imageTypes as readonly string[]).includes(file.type)) {
    throw new AppError('storage/type', 'Dozvoljene su JPG, PNG i WebP fotografije.');
  }
  if (fileTooLarge(file)) {
    throw new AppError('storage/too-large', `Fotografija je veća od ${MAX_FILE_LABEL}.`);
  }
}

/** Public URL without a download token; Storage rules allow reading these files. */
function mediaUrl(bucket: string, path: string): string {
  return `${MEDIA_BASE}${bucket}/o/${encodeURIComponent(path)}?alt=media`;
}

/** Storage path of a URL this app created, or null for any other URL. */
function pathOf(url: string): string | null {
  if (!url.startsWith(MEDIA_BASE)) return null;
  const match = /\/o\/([^?]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

function thumbPathOf(path: string): string {
  return path.replace(/\.(webp|jpg)$/, '_thumb.$1');
}

class DisabledStorage implements ImageStorage {
  readonly id = 'none';
  readonly label = 'Nije podešeno';
  readonly enabled = false;
  readonly maxFileLabel = '0 MB';

  async upload(): Promise<StoredImage> {
    throw new AppError(
      'storage/not-configured',
      'Otpremanje fotografija nije podešeno za ovaj sajt. Prijava može biti poslata bez fotografija.',
    );
  }

  async remove(): Promise<void> {
    // Nothing was ever uploaded.
  }
}

class FirebaseImageStorage implements ImageStorage {
  readonly id = 'firebase';
  readonly label = 'Firebase Storage';
  readonly enabled = true;
  readonly maxFileLabel = MAX_FILE_LABEL;

  constructor(
    private readonly storage: FirebaseStorage,
    private readonly bucket: string,
  ) {}

  async upload(
    file: File,
    folder: ImageFolder,
    onProgress?: (percent: number) => void,
  ): Promise<StoredImage> {
    assertValidImage(file);
    const uid = auth?.currentUser?.uid;
    if (!uid) {
      throw new AppError('storage/unauthenticated', 'Prijavite se da biste dodali fotografiju.');
    }

    let prepared: PreparedImage;
    try {
      prepared = await prepareImage(file);
    } catch {
      throw new AppError(
        'storage/processing',
        'Fotografiju nije moguće obraditi. Probajte drugu fotografiju (JPG, PNG ili WebP).',
      );
    }

    // Random names: files are publicly readable by URL, so they must not be guessable.
    const path = `${folder}/${uid}/${crypto.randomUUID()}.${prepared.ext}`;
    const metadata: UploadMetadata = {
      contentType: prepared.contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    };

    await this.put(path, prepared.full, metadata, (fraction) =>
      onProgress?.(Math.round(fraction * 90)),
    );
    await this.put(thumbPathOf(path), prepared.thumb, metadata, (fraction) =>
      onProgress?.(90 + Math.round(fraction * 10)),
    );

    return { url: mediaUrl(this.bucket, path), path };
  }

  private put(
    path: string,
    blob: Blob,
    metadata: UploadMetadata,
    onFraction: (fraction: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(ref(this.storage, path), blob, metadata);
      task.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) onFraction(snapshot.bytesTransferred / snapshot.totalBytes);
        },
        reject,
        () => resolve(),
      );
    });
  }

  async remove(urls: string[]): Promise<void> {
    const paths = urls
      .map(pathOf)
      .filter((path): path is string => path !== null)
      .flatMap((path) => [path, thumbPathOf(path)]);

    await Promise.all(
      paths.map((path) =>
        deleteObject(ref(this.storage, path)).catch((error: unknown) => {
          // Not fatal: the record is already gone or changed; the file is just left over.
          console.warn('[Kuka i Motika] Photo not deleted', path, error);
        }),
      ),
    );
  }
}

const bucket = firebaseConfig.storageBucket;

export const imageStorage: ImageStorage =
  storage && bucket ? new FirebaseImageStorage(storage, bucket) : new DisabledStorage();

export const imagesEnabled = imageStorage.enabled;

/** Deletes photos no longer used anywhere. Best effort, never throws. */
export function removeImages(urls: string[]): Promise<void> {
  return urls.length > 0 ? imageStorage.remove(urls) : Promise.resolve();
}

/** Photos in `before` that `after` no longer uses. */
export function droppedImages(before: string[], after: string[]): string[] {
  const kept = new Set(after);
  return before.filter((url) => !kept.has(url));
}

export function validateImageFiles(
  files: File[],
  existingCount: number,
  max: number,
): string | null {
  if (existingCount + files.length > max) {
    return `Dozvoljeno je najviše ${max} ${plural(max, 'fotografija', 'fotografije', 'fotografija')}.`;
  }
  for (const file of files) {
    if (!(LIMITS.imageTypes as readonly string[]).includes(file.type)) {
      return 'Dozvoljene su JPG, PNG i WebP fotografije.';
    }
    if (fileTooLarge(file)) {
      return `Fotografija „${file.name}” je veća od ${imageStorage.maxFileLabel}.`;
    }
  }
  return null;
}

/**
 * Small displays (lists, markers, review queues) get the `_thumb` copy;
 * anything larger gets the full image.
 */
export function optimizedImageUrl(url: string, width = 1000): string {
  if (width > LIMITS.imageThumbPx || !url.startsWith(MEDIA_BASE)) return url;
  return url.replace(/\.(webp|jpg)\?alt=media$/, '_thumb.$1?alt=media');
}
