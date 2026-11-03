import type { ReactNode, Ref } from 'react';

/** An error under a field. Screen readers hear "Greška:" first (GOV.UK error message). */
export function FieldError({
  id,
  alert = false,
  children,
}: {
  id: string;
  /** For errors that come without pressing send, which the summary does not announce. */
  alert?: boolean;
  children: ReactNode;
}) {
  return (
    <p className="field__error" id={id} role={alert ? 'alert' : undefined}>
      <span className="visually-hidden">Greška: </span>
      {children}
    </p>
  );
}

/**
 * All of a form's errors in one box at the top, each a link to its field
 * (GOV.UK error summary). It takes focus after a failed send, so on a small
 * screen nothing below the fold is missed.
 */
export function ErrorSummary({
  errors,
  ref,
}: {
  /** `id` is the field the link moves focus to. */
  errors: { id: string; message: string }[];
  ref?: Ref<HTMLDivElement>;
}) {
  if (errors.length === 0) return null;
  return (
    <div className="error-summary" ref={ref} tabIndex={-1}>
      <div role="alert">
        <h2 className="error-summary__title">Proveri ova polja</h2>
        <ul className="error-summary__list">
          {errors.map((error) => (
            <li key={error.id}>
              <a
                href={`#${error.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById(error.id)?.focus();
                }}
              >
                {error.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
