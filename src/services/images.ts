import { LIMITS } from '../config';
import { AppError } from './errors';
import type { StoredImage } from '../types';

/**
 * Image storage is deliberately modular.
 *
 * Why not Firebase Storage: Cloud Storage for Firebase requires the paid Blaze
 * plan for projects created after 30 October 2024, and this project must stay
 * on the free plan. The default adapter therefore uploads unsigned files to a
 * Cloudinary upload preset, which works from the browser without a backend.
 * Any other provider can be added by implementing the ImageStorage interface.
 */

export interface ImageStorage {
  readonly id: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly maxFiles: number;
  readonly maxBytes: number;
  readonly maxFileLabel: string;
  upload(file: File, onProgress?: (percent: number) => void): Promise<StoredImage>;
}

function fileTooLarge(file: File): boolean {
  return file.size > LIMITS.imageMaxBytes;
}

function assertValidImage(file: File): void {
  if (!(LIMITS.imageTypes as readonly string[]).includes(file.type)) {
    throw new AppError('storage/type', 'Dozvoljene su JPG, PNG i WebP fotografije.');
  }
  if (fileTooLarge(file)) {
    throw new AppError(
      'storage/too-large',
      `Fotografija je veća od ${Math.round(LIMITS.imageMaxBytes / (1024 * 1024))} MB.`,
    );
  }
}

class DisabledStorage implements ImageStorage {
  readonly id = 'none';
  readonly label = 'Nije podešeno';
  readonly enabled = false;
  readonly maxFiles = 0;
  readonly maxBytes = 0;
  readonly maxFileLabel = '0 MB';

  async upload(): Promise<StoredImage> {
    throw new AppError(
      'storage/not-configured',
      'Otpremanje fotografija nije podešeno za ovaj sajt. Prijava može biti poslata bez fotografija.',
    );
  }
}

interface CloudinaryResponse {
  secure_url?: string;
  public_id?: string;
}

class CloudinaryStorage implements ImageStorage {
  readonly id = 'cloudinary';
  readonly label = 'Cloudinary';
  readonly enabled = true;
  readonly maxFiles = LIMITS.imagesMax;
  readonly maxBytes = LIMITS.imageMaxBytes;
  readonly maxFileLabel = `${Math.round(LIMITS.imageMaxBytes / (1024 * 1024))} MB`;

  constructor(
    private readonly cloudName: string,
    private readonly uploadPreset: string,
    private readonly folder: string,
  ) {}

  upload(file: File, onProgress?: (percent: number) => void): Promise<StoredImage> {
    assertValidImage(file);

    return new Promise<StoredImage>((resolve, reject) => {
      const body = new FormData();
      body.append('file', file);
      body.append('upload_preset', this.uploadPreset);
      if (this.folder) body.append('folder', this.folder);

      const request = new XMLHttpRequest();
      request.open(
        'POST',
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(this.cloudName)}/image/upload`,
      );
      request.timeout = 60_000;

      request.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      request.onload = () => {
        let payload: CloudinaryResponse & { error?: { message?: string } } = {};
        try {
          payload = JSON.parse(request.responseText) as typeof payload;
        } catch {
          reject(
            new AppError(
              'storage/upload-failed',
              'Odgovor servisa za fotografije nije razumljiv. Pokušajte ponovo.',
            ),
          );
          return;
        }

        if (request.status >= 200 && request.status < 300 && payload.secure_url) {
          resolve({ url: payload.secure_url, publicId: payload.public_id });
          return;
        }

        const detail = payload.error?.message;
        reject(
          new AppError(
            'storage/upload-failed',
            detail
              ? `Otpremanje nije uspelo: ${detail}`
              : 'Otpremanje fotografije nije uspelo. Proverite podešavanja otpremanja.',
          ),
        );
      };

      request.onerror = () =>
        reject(
          new AppError(
            'storage/network',
            'Otpremanje fotografije nije uspelo zbog mreže. Pokušajte ponovo.',
          ),
        );
      request.ontimeout = () =>
        reject(
          new AppError(
            'storage/network',
            'Otpremanje fotografije je isteklo. Pokušajte sa manjom fotografijom.',
          ),
        );

      request.send(body);
    });
  }
}

const cloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '').trim();
const uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? '').trim();
const folder = (import.meta.env.VITE_CLOUDINARY_FOLDER ?? 'ns-cisto').trim();
const provider = (import.meta.env.VITE_IMAGE_PROVIDER ?? '').trim().toLowerCase();

export const imageStorage: ImageStorage =
  (provider === 'cloudinary' || (!provider && cloudName && uploadPreset)) &&
  cloudName &&
  uploadPreset
    ? new CloudinaryStorage(cloudName, uploadPreset, folder)
    : new DisabledStorage();

export const imagesEnabled = imageStorage.enabled;

export function validateImageFiles(files: File[], existingCount: number): string | null {
  if (existingCount + files.length > imageStorage.maxFiles) {
    return `Dozvoljeno je najviše ${imageStorage.maxFiles} fotografije po prijavi.`;
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

/** Adds Cloudinary delivery transformations for lighter gallery loading. */
export function optimizedImageUrl(url: string, width = 1000): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  if (/\/upload\/[^/]*(f_auto|q_auto|w_\d)/.test(url)) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
}
