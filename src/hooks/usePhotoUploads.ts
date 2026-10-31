import { useEffect, useRef, useState } from 'react';
import { toSerbianError } from '../services/errors';
import { imageStorage, validateImageFiles } from '../services/images';

export interface PhotoDraft {
  id: string;
  /** Missing for photos that were already uploaded earlier. */
  file?: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  url?: string;
  error?: string;
}

export type UploadResult = { urls: string[]; error?: undefined } | { urls?: undefined; error: string };

/** Already uploaded photos, shown like finished drafts. */
function storedPhotos(urls: string[]): PhotoDraft[] {
  return urls.map((url, index) => ({
    id: `stored-${index}`,
    previewUrl: url,
    status: 'done',
    progress: 100,
    url,
  }));
}

/**
 * Photo drafts with local previews, uploaded only when the form is sent.
 * Shared by the report form and the "fixed" proof dialog.
 */
export function usePhotoUploads(initialUrls: string[] = []) {
  const [photos, setPhotos] = useState<PhotoDraft[]>(() => storedPhotos(initialUrls));
  const previewUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  /** Adds picked files; returns a validation message instead when they do not fit. */
  const addFiles = (fileList: FileList | null): string | null => {
    if (!fileList || fileList.length === 0) return null;
    const incoming = Array.from(fileList);
    const error = validateImageFiles(incoming, photos.length);
    if (error) return error;

    const drafts: PhotoDraft[] = incoming.map((file) => ({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    }));
    previewUrls.current.push(...drafts.map((draft) => draft.previewUrl));
    setPhotos((prev) => [...prev, ...drafts]);
    return null;
  };

  const removePhoto = (draft: PhotoDraft) => {
    setPhotos((prev) => prev.filter((item) => item.id !== draft.id));
    if (!draft.file) return;
    URL.revokeObjectURL(draft.previewUrl);
    previewUrls.current = previewUrls.current.filter((url) => url !== draft.previewUrl);
  };

  const uploadPhoto = async (draft: PhotoDraft): Promise<UploadResult> => {
    const { file } = draft;
    if (!file) return draft.url ? { urls: [draft.url] } : { error: 'Fotografija nije dostupna.' };
    setPhotos((prev) =>
      prev.map((item) =>
        item.id === draft.id ? { ...item, status: 'uploading', error: undefined } : item,
      ),
    );

    try {
      const result = await imageStorage.upload(file, (percent) => {
        setPhotos((prev) =>
          prev.map((item) => (item.id === draft.id ? { ...item, progress: percent } : item)),
        );
      });
      setPhotos((prev) =>
        prev.map((item) =>
          item.id === draft.id
            ? { ...item, status: 'done', progress: 100, url: result.url }
            : item,
        ),
      );
      return { urls: [result.url] };
    } catch (error) {
      const message = toSerbianError(error, 'Fotografija nije otpremljena.');
      setPhotos((prev) =>
        prev.map((item) =>
          item.id === draft.id ? { ...item, status: 'error', error: message } : item,
        ),
      );
      return { error: message };
    }
  };

  /**
   * Uploads every photo that is not uploaded yet, in order. Already uploaded
   * ones are reused, so a retry after a failure does not send them again.
   */
  const uploadAll = async (): Promise<UploadResult> => {
    const urls: string[] = [];
    for (const draft of photos) {
      if (draft.status === 'done' && draft.url) {
        urls.push(draft.url);
        continue;
      }
      const result = await uploadPhoto(draft);
      if (result.error !== undefined) return result;
      urls.push(...result.urls);
    }
    return { urls };
  };

  return { photos, addFiles, removePhoto, uploadAll };
}
