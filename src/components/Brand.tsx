import { APP } from '../config';

export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className="brand-mark"
    >
      <rect width="64" height="64" rx="16" fill="#234C3B" />
      <path
        d="M32 50C32 50 18 36 18 26a14 14 0 0 1 28 0c0 10-14 24-14 24Z"
        fill="none"
        stroke="#F6F4EE"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M26 31c0-8 5-12 12-12 0 8-4 12-12 12Z" fill="#8FD19E" />
      <path d="M26.5 30.5 33 24" stroke="#234C3B" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M21 56h22" stroke="#F2B53A" strokeWidth="3.5" strokeLinecap="round" />
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
