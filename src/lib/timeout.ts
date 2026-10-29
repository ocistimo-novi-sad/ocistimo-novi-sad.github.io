import { AppError } from '../services/errors';

export const FIRESTORE_TIMEOUT_MS = 12_000;

/**
 * Firestore keeps retrying some requests (for example when the Cloud Firestore
 * API is disabled) instead of rejecting. Without a timeout the UI would stay in
 * its loading state forever, so fail with an actionable message instead.
 */
export function withTimeout<T>(
  operation: Promise<T>,
  milliseconds = FIRESTORE_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(
        new AppError(
          'timeout',
          'Baza ne odgovara. Proverite da li je Cloud Firestore kreiran u Firebase konzoli, da li je API omogućen i da li su pravila objavljena.',
        ),
      );
    }, milliseconds);

    operation.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}
