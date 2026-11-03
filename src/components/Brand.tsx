import { APP } from '../config';

export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <img
      // Small copies for the 26px header logo; brand-mark.png (192px) stays the favicon.
      src={`${import.meta.env.BASE_URL}brand-mark-52.png`}
      srcSet={`${import.meta.env.BASE_URL}brand-mark-52.png 2x, ${import.meta.env.BASE_URL}brand-mark-78.png 3x`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className="brand-mark"
    />
  );
}

export function Brand() {
  return (
    <a
      className="brand"
      href={import.meta.env.BASE_URL}
      aria-label={`${APP.name}, početna`}
    >
      <BrandMark />
      <span className="brand__text">
        <span className="brand__name">{APP.wordmark}</span>
        <span className="brand__city">{APP.city}</span>
      </span>
    </a>
  );
}
