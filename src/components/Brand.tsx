import { APP } from '../config';

export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}brand-mark.svg`}
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
