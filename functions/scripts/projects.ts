import { applicationDefault, initializeApp, type App } from 'firebase-admin/app';

export const PROD_PROJECT_ID = 'ocistimo-novi-sad';
export const STAGING_PROJECT_ID = 'project-7fe611ea-b32a-4a6e-85d';

/**
 * An Admin SDK app for one project, with the local gcloud credentials.
 *
 * Those credentials bill every call to their quota project, which is whatever
 * project gcloud defaulted to on this computer. Each script bills the project
 * it works on instead, so a script may connect to one project only.
 */
export function connect(projectId: string): App {
  const current = process.env.GOOGLE_CLOUD_QUOTA_PROJECT;
  if (current && current !== projectId) {
    throw new Error(
      `Skripta je već povezana sa ${current}; jedno pokretanje sme da radi samo sa jednim projektom.`,
    );
  }
  process.env.GOOGLE_CLOUD_QUOTA_PROJECT = projectId;
  return initializeApp({ projectId, credential: applicationDefault() }, projectId);
}
