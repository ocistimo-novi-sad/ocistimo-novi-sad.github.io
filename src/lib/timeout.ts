import { AppError, TIMEOUT_MESSAGE } from '../services/errors';

export const FIRESTORE_TIMEOUT_MS = 12_000;

/**
 * Firestore keeps retrying some requests (a slow or blocked connection, or the
 * Cloud Firestore API being disabled) instead of rejecting. Without a timeout
 * the UI would stay in its loading state forever, so fail with a message the
 * person can act on instead.
 */
export function withTimeout<T>(
  operation: Promise<T>,
  milliseconds = FIRESTORE_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new AppError('timeout', TIMEOUT_MESSAGE));
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
