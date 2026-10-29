import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { optimizedImageUrl } from '../services/images';

export function PhotoGallery({
  images,
  onOpen,
}: {
  images: string[];
  onOpen: (index: number) => void;
}) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setActive(0);
    setFailed({});
  }, [images.join('|')]);

  if (images.length === 0) {
    return (
      <div className="photo-empty">
        <ImageOff size={18} aria-hidden="true" />
        <div>
          <p>Prijava nema fotografija.</p>
          <span>Fotografija bi pomogla drugima da prepoznaju problem.</span>
        </div>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];
  const currentFailed = failed[current];

  return (
    <div className="gallery">
      <button
        type="button"
        className="gallery__main"
        onClick={() => onOpen(Math.min(active, images.length - 1))}
        aria-label="Uvećaj fotografiju"
      >
        {currentFailed ? (
          <span className="gallery__fallback">
            <ImageOff size={20} aria-hidden="true" />
            Fotografija nije dostupna
          </span>
        ) : (
          <img
            src={optimizedImageUrl(current, 1100)}
            alt="Fotografija prijavljenog problema"
            onError={() => setFailed((state) => ({ ...state, [current]: true }))}
          />
        )}
        {images.length > 1 ? (
          <span className="gallery__counter">
            {Math.min(active, images.length - 1) + 1} / {images.length}
          </span>
        ) : null}
      </button>

      {images.length > 1 ? (
        <div className="gallery__thumbs">
          {images.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              className={`gallery__thumb${index === active ? ' is-active' : ''}`}
              onClick={() => setActive(index)}
              aria-label={`Fotografija ${index + 1}`}
              aria-pressed={index === active}
            >
              {failed[url] ? (
                <ImageOff size={14} aria-hidden="true" />
              ) : (
                <img
                  src={optimizedImageUrl(url, 200)}
                  alt=""
                  loading="lazy"
                  onError={() => setFailed((state) => ({ ...state, [url]: true }))}
                />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
