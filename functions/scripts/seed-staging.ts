/**
 * Fills the staging Firestore with test reports, actions and a flag, and can
 * grant the admin role. It runs only against the staging project, never
 * production. Usage (from the repo root):
 *
 *   npm --prefix functions run seed:staging
 *   npm --prefix functions run seed:staging -- --reset
 *   npm --prefix functions run seed:staging -- --admin ime@gmail.com
 *
 * Credentials come from `gcloud auth application-default login` (see
 * CONTRIBUTING.md → Staging baza).
 */
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { createDemoActions, createDemoReports } from '../../src/demo/data.ts';
import { connect, STAGING_PROJECT_ID } from './projects.ts';

/** Collections the seed owns. Roles and profiles are never wiped. */
const SEEDED_COLLECTIONS = ['reports', 'actions', 'flags', 'mail'];

const SEED_AUTHOR = 'demo-zajednica';
const SEED_ADMIN = 'demo-admin';

/**
 * Windows PowerShell drops the `--` in `npm run seed:staging -- --reset`, so
 * npm keeps the flags for itself: `--reset` arrives only as npm_config_reset
 * and `--admin` leaves the bare e-mail behind. Both forms are accepted.
 */
function parseArgs(argv: string[]): { reset: boolean; admins: string[] } {
  const admins: string[] = [];
  let reset = process.env.npm_config_reset === 'true';
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--reset') {
      reset = true;
    } else if (arg === '--admin' && argv[i + 1]) {
      admins.push(argv[i + 1].trim().toLowerCase());
      i += 1;
    } else if (arg.includes('@')) {
      admins.push(arg.trim().toLowerCase());
    } else {
      throw new Error(`Nepoznat argument: ${arg}`);
    }
  }
  return { reset, admins };
}

async function wipe(db: Firestore): Promise<void> {
  for (const name of SEEDED_COLLECTIONS) {
    await db.recursiveDelete(db.collection(name));
    console.log(`Obrisana kolekcija ${name}.`);
  }
}

async function seedReports(db: Firestore): Promise<void> {
  const batch = db.batch();
  for (const { id, source: _source, createdAt, ...report } of createDemoReports()) {
    batch.set(db.doc(`reports/${id}`), {
      ...report,
      createdAt: Timestamp.fromDate(createdAt),
    });
  }

  // Cases for the moderation panel that the demo data does not cover.
  const now = Date.now();
  batch.set(db.doc('reports/r-cekanje-bistrica'), {
    title: 'Kese sa otpadom na Bistrici',
    description:
      'Uz pešačku stazu iza zgrada ostavljeno je desetak kesa sa otpadom. Kese su pocepane, a smeće se raznosi po travi.',
    category: 'illegal_dump',
    status: 'new',
    moderation: 'pending',
    latitude: 45.24892,
    longitude: 19.80243,
    address: 'Novo naselje (Bistrica), iza zgrada',
    createdAt: Timestamp.fromMillis(now - 3 * 3_600_000),
    createdBy: SEED_AUTHOR,
    createdByName: 'Test korisnik',
    imageUrls: [],
  });
  batch.set(db.doc('reports/r-odbijena-adice'), {
    title: 'Neuredno dvorište na Adicama',
    description:
      'Dvorište privatne kuće je zatrpano starim stvarima i granjem, vidi se sa ulice i ružno izgleda.',
    category: 'other',
    status: 'new',
    moderation: 'rejected',
    rejectionReason: 'Prijava se odnosi na privatni posed, a ne na javnu površinu.',
    moderatedBy: SEED_ADMIN,
    moderatedByName: 'Test moderator',
    moderatedAt: Timestamp.fromMillis(now - 20 * 3_600_000),
    latitude: 45.23412,
    longitude: 19.78861,
    address: 'Adice',
    createdAt: Timestamp.fromMillis(now - 26 * 3_600_000),
    createdBy: SEED_AUTHOR,
    createdByName: 'Test korisnik',
    imageUrls: [],
  });
  await batch.commit();
}

async function seedActions(db: Firestore): Promise<void> {
  const batch = db.batch();
  for (const { id, source: _source, date, createdAt, ...action } of createDemoActions()) {
    batch.set(db.doc(`actions/${id}`), {
      ...action,
      date: Timestamp.fromDate(date),
      createdAt: Timestamp.fromDate(createdAt),
      updatedBy: action.createdBy,
    });
  }
  await batch.commit();
}

async function seedFlags(db: Firestore): Promise<void> {
  const reportId = 'r-strand-grafiti';
  await db.doc(`flags/${SEED_AUTHOR}__${reportId}`).set({
    reportId,
    reason: 'inappropriate',
    note: 'Natpis na fotografiji je uvredljiv.',
    status: 'open',
    createdBy: SEED_AUTHOR,
    createdAt: Timestamp.now(),
  });
}

/** Admins are found by the e-mail in their profile, so they must sign in once first. */
async function grantAdmins(db: Firestore, emails: string[]): Promise<void> {
  for (const email of emails) {
    const profiles = await db.collection('users').where('email', '==', email).get();
    if (profiles.empty) {
      console.warn(
        `Nema profila za ${email}. Prijavi se tim nalogom na staging, pa pokreni skriptu ponovo.`,
      );
      continue;
    }
    for (const profile of profiles.docs) {
      await db.doc(`admins/${profile.id}`).set({ email, addedAt: Timestamp.now() });
      console.log(`${email} je administrator (uid ${profile.id}).`);
    }
  }
}

async function main(): Promise<void> {
  const { reset, admins } = parseArgs(process.argv.slice(2));

  const app = connect(STAGING_PROJECT_ID);
  if (app.options.projectId !== STAGING_PROJECT_ID) {
    throw new Error('Seed sme da radi samo na staging projektu.');
  }
  const db = getFirestore(app);

  if (reset) await wipe(db);
  await seedReports(db);
  await seedActions(db);
  await seedFlags(db);
  console.log(`Staging (${STAGING_PROJECT_ID}) je popunjen test podacima.`);

  if (admins.length > 0) await grantAdmins(db, admins);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
