# Objavljivanje Firebase-a

Staging i produkcija su odvojeni Firebase projekti, svaki sa svojom bazom, Storage-om, funkcijama i ekstenzijom za mejl:

| | Alias u `.firebaserc` | Projekat | Broj projekta | Sajt |
|---|---|---|---|---|
| Staging | `staging` | `project-7fe611ea-b32a-4a6e-85d` | `247888940343` | Vercel |
| Produkcija | `prod` | `ocistimo-novi-sad` | `69675330087` | GitHub Pages |

## Kako radi

Workflow [firebase-deploy.yml](../.github/workflows/firebase-deploy.yml) pokreće `firebase deploy` i objavljuje sve iz [firebase.json](../firebase.json): Firestore i Storage pravila, Firestore indekse, Cloud Functions i ekstenziju za mejl.

- **Spajanje u `staging`** → objava na staging projekat, ali samo ako PR menja nešto od Firebase-a (`firestore.rules`, `storage.rules`, `firestore.indexes.json`, `functions/`, `extensions/`, `firebase.json`, `.firebaserc`). Vercel objavljuje sajt nezavisno od toga, pa staging sajt može minut-dva da radi sa starim pravilima.
- **Spajanje `staging` → `main`** → [deploy.yml](../.github/workflows/deploy.yml) prvo objavi Firebase na prod, pa tek onda sajt na GitHub Pages. Ako Firebase deploy padne, ni sajt se ne objavljuje.
- **Ručno ponavljanje:** Actions → **Firebase deploy** → **Run workflow**, pa izaberi `staging` ili `prod`. `prod` radi samo sa grane `main`.

Pristup ide preko Workload Identity Federation, bez ključeva. GitHub za svaki deploy dobija kratkotrajni token, a Google ga prihvata samo za ovaj repo i samo za odgovarajući GitHub environment:

| GitHub environment | Dozvoljena grana | Projekat |
|---|---|---|
| `firebase-staging` | `staging` | staging |
| `firebase-prod` | `main` | prod |

Zato workflow sa `staging`-a ne može da dira produkciju, i obrnuto.

### Parametri ekstenzije po projektu

[extensions/firestore-send-email.env](../extensions/firestore-send-email.env) važi za oba projekta. Ono što se razlikuje stoji u fajlu `extensions/firestore-send-email.env.<ID projekta>` i ima prednost nad zajedničkim. Za sada se razlikuje samo putanja do Gmail app password-a u Secret Manager-u (`SMTP_PASSWORD`), jer svaki projekat ima svoju tajnu:

- prod: `projects/69675330087/secrets/ext-firestore-send-email-SMTP_PASSWORD/...` (u zajedničkom fajlu)
- staging: `projects/247888940343/secrets/ext-firestore-send-email-SMTP_PASSWORD/...` (u `firestore-send-email.env.project-7fe611ea-b32a-4a6e-85d`)

Lozinka se nikada ne upisuje u repozitorijum, samo putanja do tajne.

## Jednokratno podešavanje

Radi se jednom za svaki projekat. Treba ti `gcloud` prijavljen nalogom koji je vlasnik projekta i `gh` sa admin pristupom repou.

### 1. Google Cloud: servisni nalog i Workload Identity

Postavi promenljive za projekat koji podešavaš.

Staging:

```sh
PROJECT=project-7fe611ea-b32a-4a6e-85d
NUMBER=247888940343
ENVIRONMENT=firebase-staging
CONDITION="assertion.repository == 'ocistimo-novi-sad/ocistimo-novi-sad.github.io' && assertion.environment == 'firebase-staging'"
```

Produkcija:

```sh
PROJECT=ocistimo-novi-sad
NUMBER=69675330087
ENVIRONMENT=firebase-prod
CONDITION="assertion.repository == 'ocistimo-novi-sad/ocistimo-novi-sad.github.io' && assertion.environment == 'firebase-prod' && assertion.ref == 'refs/heads/main'"
```

Zatim, isto za oba:

```sh
REPO=ocistimo-novi-sad/ocistimo-novi-sad.github.io
SA=github-deploy@$PROJECT.iam.gserviceaccount.com

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project $PROJECT

# Servisni nalog sa kojim GitHub objavljuje
gcloud iam service-accounts create github-deploy --project $PROJECT \
  --display-name "GitHub Actions: firebase deploy"

for role in roles/firebase.admin roles/cloudfunctions.developer roles/iam.serviceAccountUser \
            roles/secretmanager.admin roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding $PROJECT --member "serviceAccount:$SA" --role $role --condition None
done

# Pool i provider za GitHub
gcloud iam workload-identity-pools create github --project $PROJECT --location global \
  --display-name "GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github-actions --project $PROJECT \
  --location global --workload-identity-pool github \
  --display-name "GitHub Actions" \
  --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.environment=assertion.environment,attribute.ref=assertion.ref" \
  --attribute-condition "$CONDITION"

# Samo ovaj repo sme da koristi servisni nalog
gcloud iam service-accounts add-iam-policy-binding $SA --project $PROJECT \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"
```

Uloge servisnog naloga:

| Uloga | Zašto |
|---|---|
| `roles/firebase.admin` | pravila, indeksi, ekstenzije |
| `roles/cloudfunctions.developer` | objava Cloud Functions |
| `roles/iam.serviceAccountUser` | funkcije i ekstenzija rade pod svojim servisnim nalozima |
| `roles/secretmanager.admin` | CLI daje ekstenziji pristup tajni sa lozinkom |
| `roles/serviceusage.serviceUsageConsumer` | CLI proverava da li su potrebni API-ji uključeni |

Ako deploy padne sa `Permission '…' denied`, dodaj ulogu koja nosi tu dozvolu i dopuni ovu tabelu.

### 2. GitHub: environment i promenljive

```sh
BRANCH=staging   # za firebase-prod: BRANCH=main

gh api -X PUT repos/$REPO/environments/$ENVIRONMENT \
  -F "deployment_branch_policy[protected_branches]=false" \
  -F "deployment_branch_policy[custom_branch_policies]=true"
gh api -X POST repos/$REPO/environments/$ENVIRONMENT/deployment-branch-policies -f name=$BRANCH -f type=branch

gh variable set GCP_WIF_PROVIDER --repo $REPO --env $ENVIRONMENT \
  --body "projects/$NUMBER/locations/global/workloadIdentityPools/github/providers/github-actions"
gh variable set GCP_DEPLOY_SA --repo $REPO --env $ENVIRONMENT --body "$SA"
```

Ovo su promenljive, ne tajne: bez Workload Identity uslova iz koraka 1 ne vrede ništa.

### 3. Provera

Actions → **Firebase deploy** → **Run workflow** → `staging`. Za `prod` workflow pokreni sa grane `main`.

## Ručno objavljivanje (rezerva)

Ako GitHub Actions ne radi, isto se objavljuje lokalno:

```sh
npm --prefix functions ci
firebase deploy --project staging --non-interactive   # ili --project prod
```

Pri prvom objavljivanju ekstenzije na novom projektu Firebase CLI traži Gmail app password i čuva ga u Secret Manager-u. Posle toga dodaj `extensions/firestore-send-email.env.<ID projekta>` sa putanjom do te tajne (vidi [Parametri ekstenzije po projektu](#parametri-ekstenzije-po-projektu)).
