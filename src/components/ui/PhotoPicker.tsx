import { useRef } from 'react';
import { Check, ImagePlus, TriangleAlert, X } from 'lucide-react';
import { LIMITS } from '../../config';
import type { PhotoDraft } from '../../hooks/usePhotoUploads';

/** Grid of photo drafts with upload progress and an "add" tile. */
export function PhotoPicker({
  photos,
  onAdd,
  onRemove,
  disabled,
  addButtonId,
  addLabel = 'Dodaj',
}: {
  photos: PhotoDraft[];
  onAdd: (files: FileList | null) => void;
  onRemove: (photo: PhotoDraft) => void;
  disabled: boolean;
  addButtonId?: string;
  addLabel?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="photo-grid">
        {photos.map((photo) => (
          <div key={photo.id} className={`photo-draft photo-draft--${photo.status}`}>
            <img src={photo.previewUrl} alt="" />
            {photo.status === 'uploading' ? (
              <span className="photo-draft__bar">
                <span style={{ width: `${photo.progress}%` }} />
              </span>
            ) : null}
            {photo.status === 'done' ? (
              <span className="photo-draft__done" aria-label="Fotografija je otpremljena">
                <Check size={11} aria-hidden="true" />
              </span>
            ) : null}
            {photo.status === 'error' ? (
              <span className="photo-draft__error" title={photo.error}>
                <TriangleAlert size={12} aria-hidden="true" />
              </span>
            ) : null}
            <button
              type="button"
              className="photo-draft__remove"
              onClick={() => onRemove(photo)}
              aria-label="Ukloni fotografiju"
              disabled={disabled}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        ))}

        {photos.length < LIMITS.imagesMax ? (
          <button
            type="button"
            id={addButtonId}
            className="photo-add"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <ImagePlus size={18} aria-hidden="true" />
            <span>{addLabel}</span>
            <span className="photo-add__count">
              {photos.length}/{LIMITS.imagesMax}
            </span>
          </button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={LIMITS.imageTypes.join(',')}
        multiple
        style={{ display: 'none' }}
        onChange={(event) => {
          onAdd(event.target.files);
          event.target.value = '';
        }}
      />
    </>
  );
}
