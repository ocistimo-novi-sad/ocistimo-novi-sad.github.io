import { APP } from '../config';

export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className="brand-mark"
    >
      <rect width="64" height="64" fill="#234C3B" />
      <circle cx="32" cy="28" r="12.5" fill="none" stroke="#F3F2ED" strokeWidth="3" />
      <circle cx="32" cy="28" r="4.5" fill="#F3F2ED" />
      <path d="M32 40.5V50" stroke="#F3F2ED" strokeWidth="3" />
      <path d="M18 55h28" stroke="#B94A3B" strokeWidth="3" />
    </svg>
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
