export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export function errorCode(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }
  return 'unknown';
}

const MESSAGES: Record<string, string> = {
  'permission-denied': 'Ova radnja nije dozvoljena za tvoj nalog. Osveži stranicu i pokušaj ponovo.',
  unauthenticated: 'Potrebna je prijava na nalog.',
  'auth/requires-recent-login': 'Prijavi se ponovo da nastaviš.',
  unavailable: 'Nema veze sa serverom. Proveri internet vezu i pokušaj ponovo.',
  timeout: 'Server ne odgovara. Pokušaj ponovo za nekoliko minuta.',
  'failed-precondition': 'Nešto ne radi na sajtu. Pokušaj ponovo kasnije.',
  'invalid-argument': 'Neki podaci nisu ispravni. Proveri polja i pokušaj ponovo.',
  'resource-exhausted': 'Prekoračen je dozvoljeni broj zahteva. Pokušaj kasnije.',
  'deadline-exceeded': 'Zahtev je istekao. Pokušaj ponovo.',
  'not-found': 'Traženi zapis više ne postoji.',
  'already-exists': 'Ovaj zapis već postoji.',
  'auth/popup-closed-by-user': 'Prijava je otkazana.',
  'auth/cancelled-popup-request': 'Prijava je otkazana.',
  'auth/popup-blocked':
    'Pregledač je blokirao prozor za prijavu. Dozvoli iskačuće prozore za ovaj sajt.',
  'auth/operation-not-allowed': 'Prijava preko Google naloga trenutno ne radi. Pokušaj kasnije.',
  'auth/unauthorized-domain': 'Prijava preko Google naloga trenutno ne radi. Pokušaj kasnije.',
  'auth/network-request-failed': 'Prijava nije uspela zbog mreže. Pokušaj ponovo.',
  'auth/account-exists-with-different-credential':
    'Nalog sa ovom mejl adresom već koristi drugi način prijave.',
  'auth/too-many-requests': 'Previše pokušaja prijave. Pokušaj kasnije.',
  'storage/not-configured':
    'Otpremanje fotografija nije podešeno za ovaj sajt. Prijava može biti poslata bez fotografija.',
  'storage/type': 'Dozvoljene su JPG, PNG i WebP fotografije.',
  'storage/too-large': 'Fotografija je veća od dozvoljene veličine.',
  'storage/network': 'Otpremanje fotografije nije uspelo zbog mreže. Pokušaj ponovo.',
  'storage/upload-failed': 'Otpremanje fotografije nije uspelo. Pokušaj ponovo.',
  'storage/processing':
    'Fotografiju nije moguće obraditi. Probaj drugu fotografiju (JPG, PNG ili WebP).',
  'storage/unauthorized': 'Fotografija nije poslata. Prijavi se ponovo na nalog i pokušaj opet.',
  'storage/unauthenticated': 'Prijavi se da dodaš fotografiju.',
  'storage/retry-limit-exceeded':
    'Otpremanje fotografije nije uspelo zbog mreže. Pokušaj ponovo.',
  'storage/quota-exceeded':
    'Fotografije trenutno ne mogu da se sačuvaju. Pošalji bez njih ili pokušaj kasnije.',
  'storage/canceled': 'Otpremanje fotografije je prekinuto.',
};

/**
 * A message people can act on, in plain words (GOV.UK error messages). The
 * technical cause goes to the console for whoever maintains the site.
 */
export function toSerbianError(error: unknown, fallback: string): string {
  if (error instanceof AppError) return error.message;
  const code = errorCode(error);
  console.warn(`[kuka-i-motika] ${code}`, error);
  if (MESSAGES[code]) return MESSAGES[code];

  if (code.startsWith('auth/')) {
    return 'Prijava nije uspela. Pokušaj ponovo.';
  }
  if (code.startsWith('storage/')) {
    return MESSAGES['storage/upload-failed'];
  }
  return fallback;
}
