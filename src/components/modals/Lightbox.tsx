import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { optimizedImageUrl } from '../../services/images';

export function Lightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(Math.min(initialIndex, images.length - 1));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') {
        setIndex((value) => Math.min(value + 1, images.length - 1));
        setFailed(false);
      }
      if (event.key === 'ArrowLeft') {
        setIndex((value) => Math.max(value - 1, 0));
        setFailed(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.getElementById('lightbox-close')?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [images.length, onClose]);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Fotografija ${index + 1} od ${images.length}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        id="lightbox-close"
        className="lightbox__close"
        onClick={onClose}
        aria-label="Zatvori pregled fotografija"
      >
        <X size={18} aria-hidden="true" />
      </button>

      {images.length > 1 ? (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--prev"
          onClick={() => {
            setIndex((value) => Math.max(value - 1, 0));
            setFailed(false);
          }}
          disabled={index === 0}
          aria-label="Prethodna fotografija"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
      ) : null}

      <figure className="lightbox__frame">
        {failed ? (
          <div className="lightbox__fallback">Fotografija nije dostupna</div>
        ) : (
          <img
            key={images[index]}
            src={optimizedImageUrl(images[index], 1700)}
            alt={`Fotografija prijave ${index + 1}`}
            onError={() => setFailed(true)}
          />
        )}
        <figcaption className="lightbox__counter">
          {index + 1} / {images.length}
        </figcaption>
      </figure>

      {images.length > 1 ? (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--next"
          onClick={() => {
            setIndex((value) => Math.min(value + 1, images.length - 1));
            setFailed(false);
          }}
          disabled={index === images.length - 1}
          aria-label="Sledeća fotografija"
        >
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
