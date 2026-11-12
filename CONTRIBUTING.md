# Kako radimo na projektu

Na Kuki i Motici sada radi više ljudi, pa je teže pratiti šta je spojeno i šta je spremno za objavu. Zato svaka izmena prolazi isti put: preuzimanje tiketa, pregled koda i lokalno testiranje, spajanje u `staging`, testiranje na stagingu, pa tek onda `main`.

```mermaid
flowchart LR
    A[Slobodan issue:<br/>dodeli ga sebi] --> B[Grana iz issue-a,<br/>od staging-a]
    B --> C[Pull request]
    C --> D{Pregled i lokalno<br/>testiranje}
    D -- bar 1 odobrenje --> E[Spajanje u staging,<br/>tiket se zatvara]
    E --> F[Automatska objava<br/>na Vercelu]
    F --> G{Testiranje<br/>na stagingu}
    G -- u redu --> H[Više PR-ova zajedno:<br/>staging → main]
    G -- treba ispravka --> I[Novi issue, povezan<br/>sa spojenim tiketom]
    I --> A
```

## Preuzimanje tiketa

Da dvoje ljudi ne bi radilo na istoj stvari, tiket se preuzima ovako:

1. Izaberi issue koji **nema nikog u polju Assignees** i dodeli ga sebi (**assign yourself**). Time je jasno da je tiket zauzet, pa ne treba posebno da se dogovaramo u grupi.
2. Granu napravi iz samog issue-a: u desnoj koloni, pod **Development**, klikni **Create a branch**. Grana se pravi od `staging`-a (to je podrazumevana grana repoa), a njeno ime počinje brojem tiketa (npr. `44-…`), pa se issue i PR posle sami povezuju (vidi pravila 1 i 6).
3. Preuzmi granu lokalno komandom koju GitHub ponudi (npr. `git fetch origin` i `git switch 44-…`) i kreni sa radom.

Ako ti treba povratna informacija ili smernica, ili ti nešto nije jasno, napiši komentar u issue-u i označi nas u njemu. Ako ipak odustaneš od tiketa, skini se sa Assignees, da bi drugi mogli da ga preuzmu.

### Ime grane

Od imena grane zavisi koju labelu PR dobija za Release Notes (pravilo 6), ako je ne dobije na drugi način.

| Ime grane počinje sa | PR dobija labelu | Primer |
|---|---|---|
| brojem tiketa | labelu tog issue-a | `44-filter-po-statusu` |
| `feat-` ili `feature-` | `enhancement` | `feat-deljenje-akcije` |
| `bug-` ili `fix-` | `bug` | `fix-mapa-na-telefonu` |
| `docs-` ili `doc-` | `documentation` | `docs-pokretanje-lokalno` |

- **Grana napravljena iz issue-a** (`44-…`) je najbolji izbor: povezuje se sa tiketom i preuzima njegovu labelu. Zato proveri da issue ima labelu (`enhancement`, `bug`, `accessibility` ili `documentation`). Ako je nema, prefiks ne pomaže, jer ime počinje brojem, pa labelu dodaj na issue ili na PR.
- **Prefiks se koristi za granu bez tiketa.** Mora da bude na samom početku imena i malim slovima: `fix-44-…` daje `bug`, ali `44-fix-…` ne daje.
- Za `accessibility` prefiks ne postoji; ta labela se dodaje na issue ili na PR.
- Labela koju PR već ima uvek ima prednost i ništa je ne menja.

## Pokretanje lokalno

Potreban je Node 22 (vidi [.nvmrc](.nvmrc)).

```sh
npm ci
npm run dev
```

Bez `.env.local` aplikacija radi u **demo režimu**: izmišljeni primeri, bez naloga, moderacije i e-pošte (vidi [Kako aplikacija radi → Demo režim](docs/use-cases.md#12-demo-režim)). To je dovoljno za većinu izmena u interfejsu.

Za rad sa nalozima, moderacijom i e-poštom pokreni aplikaciju na **staging bazi** (vidi [Staging baza](#staging-baza)). Kopiraj [.env.staging.example](.env.staging.example) u `.env.staging.local`, popuni prazne vrednosti iz Firebase konzole staging projekta (Project settings → Your apps → „Kuka i Motika (staging)“) i pokreni:

```sh
npm run dev:staging
```

`.env.staging.local` se ne commit-uje, a u ovom režimu ima prednost nad `.env.local`.

`.env.local` sa vrednostima produkcijskog projekta (kopija [.env.example](.env.example), vrednosti iz Firebase konzole → Project settings → Your apps) koristi se samo kada nešto mora da se proveri baš na produkciji. Te vrednosti nisu tajne; podatke štite `firestore.rules` i `storage.rules`.

> **Važno:** aplikacija se ne povezuje na Firebase emulatore, iako su navedeni u `firebase.json`. `npm run dev` sa popunjenim `.env.local` radi sa **produkcijskom bazom**, pa posle takvog testiranja obriši sve test podatke.

Pre otvaranja PR-a proveri da prolazi build (uključuje i proveru tipova):

```sh
npm run build
```

Ako menjaš Cloud Functions (folder `functions/`):

```sh
npm --prefix functions ci
npm --prefix functions run build
```

Ulogu administratora dodeljuje vlasnik projekta u Firebase konzoli: u Firestore-u napravi dokument `admins/{uid}`, gde je `uid` korisnikov ID iz Authentication. Sadržaj dokumenta nije bitan, proverava se samo da postoji. Moderatore posle toga dodeljuje administrator iz aplikacije. Na stagingu to radi i seed skripta (vidi ispod).

### Staging baza

Staging ima svoj Firebase projekat, **ocistimo-novi-sad-staging** (ID `project-7fe611ea-b32a-4a6e-85d`, u `.firebaserc` alias `staging`), sa posebnom bazom, nalozima, fotografijama i Cloud Functions. Na njega su povezani staging sajt na Vercelu i `npm run dev:staging`. Produkcijski projekat `ocistimo-novi-sad` (alias `prod`) se pri testiranju ne dira.

Staging baza se puni test podacima (prijave i akcije iz demo režima, plus prijava na čekanju, odbijena prijava i otvorena oznaka spornog sadržaja) skriptom:

```sh
npm --prefix functions ci
gcloud auth application-default login            # jednom, otvara pregledač
npm --prefix functions run seed:staging          # dopiše/osveži test podatke
npm --prefix functions run seed:staging -- --reset                  # prvo obriše prijave, akcije, oznake i mail
npm --prefix functions run seed:staging -- --admin ime@gmail.com    # da ulogu administratora
```

Za `--admin` se tim Google nalogom prvo jednom prijavi na staging, jer skripta korisnika traži po e-pošti iz profila. Skripta radi samo na staging projektu i odbija svaki drugi. Za pokretanje je potreban [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) i pristup staging projektu (dodaje ga vlasnik projekta).

Staging šalje prava obaveštenja e-poštom, sa iste adrese kao produkcija. Pošiljalac je „Kuka i Motika (staging)“, naslov počinje sa `[STAGING]`, a linkovi vode na staging sajt. Te vrednosti su u `functions/.env.staging` i `extensions/firestore-send-email.env.project-7fe611ea-b32a-4a6e-85d`, a Gmail app password staginga je u Secret Manager-u staging projekta, odvojen od produkcijskog.

Pravila, indeksi, funkcije i ekstenzija se na staging objavljuju isto kao na produkciju, samo sa `--project staging`. Izmene u `firestore.rules`, `storage.rules` i `functions/` prvo se objave na staging i tamo testiraju.

## Pravila

### 1. Svaki PR traži bar jedno odobrenje

PR se ne spaja dok ga bar jedna osoba ne pregleda i ne odobri (**Approve**). Odobrenje se poništava posle svakog novog push-a na granu PR-a, pa PR tada treba ponovo odobriti.

Čim se otvori PR, issue-u za koji je otvoren dodaje se labela `ready for review`. To radi GitHub sam, za issue iz reda u opisu PR-a koji počinje sa „Tiket #…“ i iz broja na početku imena grane (npr. `44-…`). Broj pomenut negde u tekstu se ne računa. Dok je PR draft, labela se skida, a vraća se kad se PR označi kao **Ready for review**. Ako issue već ima `on staging` ili `rework` (vidi pravilo 5), te labele se tada skidaju.

Piše se „Tiket #…“, ne „Closes #…“: `staging` je podrazumevana grana, pa bi „Closes #…“ (i „Fixes #…“, „Resolves #…“) zatvorio issue čim se PR spoji. I ti redovi se čitaju, a zatvoren issue se posle spajanja sam ponovo otvara, ali ostaje trag „closed… reopened“ i pratioci dobijaju suvišna obaveštenja.

### 2. Odobren PR se spaja u `staging`

Ciljna grana svakog PR-a je `staging`, ne `main`. `staging` je podrazumevana grana repoa, pa novi PR sam cilja nju.

- Spaja se dugmetom **Create a merge commit** ili **Squash and merge**. Rebase nije dozvoljen.
- Pre spajanja mora da prođe kontrola **labela** (vidi pravilo 6).
- Direktan push, force push i brisanje grane `staging` nisu dozvoljeni; sve ide kroz PR.
- Posle spajanja issue ostaje otvoren: skida mu se `ready for review` i dodaje `on staging`. Zatvara ga tester kada potvrdi da radi na stagingu (pravilo 3). Šta je stvarno objavljeno vidi se u [Releases](https://github.com/ocistimo-novi-sad/ocistimo-novi-sad.github.io/releases).

### 3. Testiranje: prvo lokalno, pa na stagingu

Svaka izmena se testira dva puta: pre spajanja na svom računaru, a posle spajanja na stagingu.

**Pre spajanja — lokalno.** Otvoren PR se proverava tako što se njegova grana preuzme lokalno i aplikacija pokrene (vidi [Pokretanje lokalno](#pokretanje-lokalno)):

```sh
git fetch origin
git switch ime-grane
npm ci
npm run dev
```

Sa GitHub CLI-jem prva dva reda zamenjuje `gh pr checkout <broj PR-a>`. PR se odobrava (pravilo 1) tek kada izmena lokalno radi kako treba.

**Posle spajanja — na stagingu.** Kada se PR spoji u `staging`:

- tiket iz „Tiket #…“ dobija labelu `on staging` umesto `ready for review` i ostaje otvoren;
- PR se pojavljuje u nacrtu Release Notes **„Sledeća verzija“** (pravilo 6);
- staging se sam objavljuje na **Vercelu**, ništa ne treba pokretati ručno;
- ako PR menja pravila, indekse, funkcije ili ekstenziju, oni se sami objavljuju na staging Firebase projekat (workflow **Firebase deploy**).

Kada se nova verzija pojavi na Vercelu, Tijana (i svako ko želi da pomogne u testiranju) prolazi kroz PR-ove iz nacrta „Sledeća verzija“ i issue-e sa labelom `on staging`. Ako je sve u redu, ručno zatvara issue. Ako nešto ne radi, issue-u dodaje labelu `rework` (pravilo 5).

Staging radi sa **staging bazom** (vidi [Staging baza](#staging-baza)), pa test podaci ne stižu do pravih korisnika i ne moraju da se brišu posle svakog testiranja. Kada se baza previše zatrpa, vraća se na poznato stanje sa `seed:staging -- --reset`.

Produkcija ostaje na GitHub Pages i objavljuje se sama kada se `staging` spoji u `main`: prvo Firestore/Storage pravila, indeksi, Cloud Functions i ekstenzija za e-poštu na produkcijski Firebase projekat, pa tek onda sajt. Detalji su u [Objavljivanje Firebase-a](docs/firebase-deploy.md).

### 4. Na `main` ide više PR-ova odjednom

Ne objavljujemo svaki PR posebno. Kada se na stagingu skupi više proverenih PR-ova, `staging` se spaja u `main`. Tako se sve testira na stagingu, a na `main` stiže samo ono što je potvrđeno.

- U `main` se spaja samo grana `staging`. Kontrola **samo-sa-staginga** pada na PR-u iz bilo koje druge grane, i GitHub ga blokira.
- PR `staging` → `main` sam dobija labelu `objava`. Ne treba mu „Tiket #…“ ni labela iz pravila 6, jer su tiketi već navedeni u PR-ovima ka `staging`-u, a sam taj PR ne ulazi u Release Notes.
- PR `staging` → `main` odobrava [@svilimonovicQA](https://github.com/svilimonovicQA) ili [@sekuchu](https://github.com/sekuchu) (spisak je u [.github/CODEOWNERS](.github/CODEOWNERS)). GitHub čita CODEOWNERS sa `main`-a, pa izmena spiska važi tek kada stigne na `main`.
- Kada jedno od njih odobri, dugme Merge može da pritisne svako sa `write` pristupom. Repo pripada ličnom nalogu, pa GitHub ne dozvoljava da se to ograniči na određene osobe.
- Dozvoljen je samo merge commit, pa dugme glasi samo **Merge pull request**, bez izbora Squash i Rebase. Tako `staging` i `main` ostaju usklađeni: squash bi napravio commit koji ne postoji na `staging`-u, i sledeće spajanje bi imalo konflikte.
- Direktan push, force push i brisanje grane `main` nisu dozvoljeni.

### 5. Ispravka za nešto što je na stagingu ide kroz isti issue

Ako se pri testiranju na stagingu nađe problem u spojenom PR-u, tester issue-u dodaje labelu **`rework`**, a `on staging` ostaje. Šta ne radi napiše se u komentaru na tom issue-u.

Ispravka se radi kroz novi PR za **isti** issue, sa „Tiket #44“ u opisu. Kada se taj PR otvori, issue opet dobija `ready for review`, a `on staging` i `rework` se skidaju. Posle spajanja issue ponovo dobija `on staging` i čeka testiranje.

Zatvoren tiket se ne otvara ponovo. Ako se problem nađe u tiketu koji je već zatvoren (npr. posle objave na `main`), otvara se **novi issue** i povezuje sa starim: u opisu novog issue-a (ili u opisu PR-a sa ispravkom) napiše se „Ispravka za #44“. GitHub tada u #44 prikaže link ka novom issue-u, pa se iz oba tiketa vidi kako su povezani.

„Ispravka za #44“ ne menja labele tiketa #44. Ako PR nema labelu, a ni issue iz „Tiket #…“ je nema (ili takvog reda nema), PR zbog toga dobija labelu `bug` (vidi pravilo 6).

### 6. Release Notes

Uvodimo Release Notes: spisak PR-ova (a preko njih i tiketa) koji su ušli u svaku objavu. Tako i mi i svi ostali lako vidimo šta je prošlo. Prave se same, na stranici [Releases](https://github.com/ocistimo-novi-sad/ocistimo-novi-sad.github.io/releases):

- Posle svakog spajanja u `staging` ažurira se nacrt **„Sledeća verzija“**: spisak PR-ova spojenih od poslednje objave, tj. onih koji su na stagingu, a još nisu na produkciji. Nacrt vide samo članovi tima.
- Posle spajanja `staging` → `main` pravi se javna objava sa tagom po datumu (npr. `v2026.11.04`, a `v2026.11.04-2`, `-3`… ako je istog dana bilo više objava) i naslovom „Objava DD.MM.GGGG.“. Nacrt se tada briše.
- PR-ovi su razvrstani po labeli: `enhancement` → Novo, `bug` → Ispravke, `accessibility` → Pristupačnost, `documentation` → Dokumentacija, ostalo → Ostalo. PR-ovi sa labelama `objava`, `duplicate` i `wontfix` se izostavljaju. Zato svaki PR ka `staging`-u treba da ima labelu.
- Labela se stavlja sama ako je PR nema. Prvo se prepisuje sa issue-a iz „Tiket #…“ (ili iz imena grane, npr. `44-…`). Ako issue nema labelu, „Ispravka za #…“ u opisu daje `bug`, a ako ni toga nema, odlučuje prefiks imena grane (vidi [Ime grane](#ime-grane)). Ako labela ne može da se odredi, kontrola **labela** pada i PR ne može da se spoji. Kada autor doda labelu ručno, kontrola se sama ponovo pokreće i prolazi.

## Ukratko, za svaki PR

- [ ] Issue je bio slobodan i dodeljen je tebi, a grana je napravljena iz njega (od `staging`-a).
- [ ] PR je otvoren ka grani `staging`.
- [ ] U opisu PR-a piše tiket („Tiket #…“ ili „Ispravka za #…“).
- [ ] Issue ima labelu `ready for review` (dodaje se sama kad PR nije draft i ima „Tiket #…“ ili broj tiketa na početku imena grane).
- [ ] PR ima labelu (`enhancement`, `bug`, …) zbog Release Notes; najčešće se doda sama sa issue-a.
- [ ] Ko pregleda PR, preuzeo je granu i lokalno proverio izmenu.
- [ ] Ima bar jedno odobrenje pre spajanja.
- [ ] Posle objave na staging, tester je potvrdio da radi i zatvorio issue (ili mu dodao `rework`).
- [ ] Posle testiranja na stagingu obrisani su test podaci.
- [ ] Ako je ovo ispravka, u issue-u ili PR-u piše na koji se tiket odnosi.
