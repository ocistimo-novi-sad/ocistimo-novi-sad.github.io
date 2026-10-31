import { ImageOff } from 'lucide-react';
import { optimizedImageUrl } from '../../services/images';

function Side({
  label,
  images,
  tone,
  onOpen,
}: {
  label: string;
  images: string[];
  tone: 'before' | 'after';
  onOpen?: (images: string[], index: number) => void;
}) {
  const first = images[0];
  const image = first ? (
    <img src={optimizedImageUrl(first, 600)} alt={`${label}: fotografija`} loading="lazy" />
  ) : (
    <span className="before-after__empty">
      <ImageOff size={16} aria-hidden="true" />
      Bez fotografije
    </span>
  );

  return (
    <figure className={`before-after__side before-after__side--${tone}`}>
      <span className="before-after__tag">{label}</span>
      {first && onOpen ? (
        <button type="button" className="before-after__media" onClick={() => onOpen(images, 0)}>
          {image}
        </button>
      ) : first ? (
        <a className="before-after__media" href={first} target="_blank" rel="noreferrer">
          {image}
        </a>
      ) : (
        <span className="before-after__media">{image}</span>
      )}
      {images.length > 1 ? (
        <span className="before-after__more">+{images.length - 1}</span>
      ) : null}
    </figure>
  );
}

/**
 * Side-by-side "before" and "after" photos of a fixed problem. Without
 * `onOpen` the photos open in a new tab, which is what dialogs use.
 */
export function BeforeAfter({
  before,
  after,
  onOpen,
}: {
  before: string[];
  after: string[];
  onOpen?: (images: string[], index: number) => void;
}) {
  return (
    <div className="before-after">
      <Side label="Pre" images={before} tone="before" onOpen={onOpen} />
      <Side label="Posle" images={after} tone="after" onOpen={onOpen} />
    </div>
  );
}
