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
  'permission-denied':
    'Pristup bazi je odbijen. Proverite da li ste prijavljeni i da li su Firestore pravila objavljena.',
  unauthenticated: 'Potrebna je prijava na nalog.',
  'auth/requires-recent-login': 'Prijavite se ponovo da biste nastavili.',
  unavailable:
    'Baza trenutno nije dostupna. Proverite internet vezu i da li je Cloud Firestore omogućen.',
  timeout:
    'Baza ne odgovara. Proverite da li je Cloud Firestore kreiran u Firebase konzoli, da li je API omogućen i da li su pravila objavljena.',
  'failed-precondition':
    'Baza nije pravilno pripremljena. Proverite da li su pravila i indeksi primenjeni.',
  'invalid-argument': 'Poslati podaci nisu ispravni.',
  'resource-exhausted': 'Prekoračen je dozvoljeni broj zahteva. Pokušajte kasnije.',
  'deadline-exceeded': 'Zahtev je istekao. Pokušajte ponovo.',
  'not-found': 'Traženi zapis više ne postoji.',
  'already-exists': 'Ovaj zapis već postoji.',
  'auth/popup-closed-by-user': 'Prijava je otkazana.',
  'auth/cancelled-popup-request': 'Prijava je otkazana.',
  'auth/popup-blocked':
    'Pregledač je blokirao prozor za prijavu. Dozvolite iskačuće prozore za ovaj sajt.',
  'auth/operation-not-allowed': 'Google prijava nije omogućena u Firebase konzoli.',
  'auth/unauthorized-domain':
    'Ovaj domen nije autorizovan u Firebase konzoli (Authentication → Settings → Authorized domains).',
  'auth/network-request-failed': 'Prijava nije uspela zbog mreže. Pokušajte ponovo.',
  'auth/account-exists-with-different-credential':
    'Nalog sa ovom mejl adresom već koristi drugi način prijave.',
  'auth/too-many-requests': 'Previše pokušaja prijave. Pokušajte kasnije.',
  'storage/not-configured':
    'Otpremanje fotografija nije podešeno za ovaj sajt. Prijava može biti poslata bez fotografija.',
  'storage/type': 'Dozvoljene su JPG, PNG i WebP fotografije.',
  'storage/too-large': 'Fotografija je veća od dozvoljene veličine.',
  'storage/network': 'Otpremanje fotografije nije uspelo zbog mreže. Pokušajte ponovo.',
  'storage/upload-failed': 'Otpremanje fotografije nije uspelo. Pokušajte ponovo.',
  'storage/processing':
    'Fotografiju nije moguće obraditi. Probajte drugu fotografiju (JPG, PNG ili WebP).',
  'storage/unauthorized':
    'Otpremanje je odbijeno. Proverite da li ste prijavljeni i da li su Storage pravila objavljena.',
  'storage/unauthenticated': 'Prijavite se da biste dodali fotografiju.',
  'storage/retry-limit-exceeded':
    'Otpremanje fotografije nije uspelo zbog mreže. Pokušajte ponovo.',
  'storage/quota-exceeded': 'Prostor za fotografije je trenutno pun. Javite se administratoru.',
  'storage/canceled': 'Otpremanje fotografije je prekinuto.',
};

export function toSerbianError(error: unknown, fallback: string): string {
  if (error instanceof AppError) return error.message;
  const code = errorCode(error);
  if (MESSAGES[code]) return MESSAGES[code];

  if (code.startsWith('auth/')) {
    return 'Prijava nije uspela. Pokušajte ponovo.';
  }
  if (code.startsWith('storage/')) {
    return MESSAGES['storage/upload-failed'];
  }
  return fallback;
}
