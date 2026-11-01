# Kuka i Motika

**Mapa problema u javnim prostorima Novog Sada i mesto za organizovanje zajedničkih akcija čišćenja i uređenja grada.**

Kuka i Motika je zamišljen kao praktičan alat za građane koji žele da prijave smeće, oštećen javni inventar, grafite i druge probleme u svom okruženju. Cilj je da se takvi problemi lakše uoče, dokumentuju i povežu sa ljudima koji žele da pomognu u njihovom rešavanju.

Ideja projekta je jednostavna: umesto da informacije o zapuštenim mestima ostanu rasute po porukama i društvenim mrežama, sve prijave mogu da budu pregledno prikazane na jednoj mapi. Tako zajednica lakše može da proceni gde je pomoć potrebna i da organizuje konkretnu akciju.

Detaljan opis rada aplikacije — uloge, slučajevi korišćenja, životni ciklus prijava i akcija i sva obaveštenja e-poštom — nalazi se u dokumentu [Kako aplikacija radi](docs/use-cases.md).

## Sadržaj

- [Pregled aplikacije](#pregled-aplikacije)
- [Kako funkcioniše](#kako-funkcioniše)
- [Kategorije problema](#kategorije-problema)
- [Statusi prijava i akcija](#statusi-prijava-i-akcija)
- [Uloga zajednice i moderacija](#uloga-zajednice-i-moderacija)
- [Pristupačnost i korišćenje na različitim uređajima](#pristupačnost-i-korišćenje-na-različitim-uređajima)
- [Trenutno stanje i ograničenja](#trenutno-stanje-i-ograničenja)
- [Zašto ovaj projekat postoji](#zašto-ovaj-projekat-postoji)
- [Licenca i zahvalnice](#licenca-i-zahvalnice)

## Pregled aplikacije

![Desktop prikaz aplikacije Kuka i Motika](docs/preview.png)

<p align="center">
  <img src="docs/mobile.png" alt="Mobilni prikaz liste prijava i filtera" width="330" />
</p>

> **Napomena:** Prikazi iznad predstavljaju demonstracioni režim aplikacije. Primeri prijava služe za prikaz izgleda i funkcionalnosti i ne predstavljaju stvarno stanje na terenu.

## Kako funkcioniše

### 1. Pregled mape

Glavni deo aplikacije je interaktivna mapa Novog Sada (OpenStreetMap podloga). Na njoj se nalaze oznake koje prikazuju prijavljene probleme i planirane akcije čišćenja. Korisnici mogu da pomeraju mapu, zumiraju određeno područje i otvore pojedinačnu prijavu izborom oznake ili stavke iz liste.

- **Grupisanje oznaka** — kada je na jednom mestu mnogo prijava, oznake se spajaju u grupu sa brojem prijava; klik na grupu približava mapu.
- **Pregled pri prelasku mišem** — oznaka prikazuje kategoriju, naslov i, ako postoji, sličicu fotografije.
- **Legenda** — na desktop prikazu legenda prikazuje broj prijava po kategoriji i omogućava da se pojedine kategorije uključe ili isključe direktno sa mape.
- **Kontrole mape** — zumiranje, povratak na prikaz celog grada i „Moja lokacija“.

Mapa i lista prijava rade zajedno: izbor prijave u listi usmerava mapu na njenu lokaciju, dok izbor oznake na mapi otvara detalje odgovarajuće prijave.

Na vrhu liste nalazi se kratak pregled napretka zajednice: ukupan broj prijava, broj rešenih, udeo rešenih prijava i broj predstojećih akcija.

### 2. Prijavljivanje problema

Korisnik bira lokaciju na mapi (ili koristi svoju trenutnu lokaciju) i popunjava prijavu. Ona može da sadrži:

- naslov (5–90 znakova) i opis problema (20–1200 znakova);
- kategoriju;
- lokaciju označenu na mapi, unutar područja Novog Sada;
- adresu ili orijentir, opciono;
- do tri fotografije (JPG, PNG ili WebP, do 20 MB po fotografiji).

Pre slanja, korisnik može da proveri podatke i prilagodi lokaciju oznake. Aplikacija proverava obavezna polja, prikazuje napredak otpremanja fotografija i poruku o uspešnom slanju ili objašnjenje greške. Ako korisnik zatvori formu sa unetim podacima, aplikacija traži potvrdu pre odbacivanja.

**Fotografije.** Fotografije sa telefona mogu da se dodaju onakve kakve jesu, jer ih aplikacija pre slanja sama obrađuje u pregledaču:
- smanjuje ih na najviše 1600 px po dužoj strani i pravi sličicu za liste i mapu;
- čuva ih u formatu WebP (u Safari-ju JPEG), obično ispod 400 KB;
- ispravlja okretanje uspravnih fotografija;
- **uklanja podatke iz fotografije (EXIF), uključujući GPS lokaciju telefona.**

Fotografije se čuvaju u Firebase Storage-u. Kada se prijava obriše ili se fotografija ukloni izmenom, briše se i iz Storage-a.

### 3. Pronalaženje relevantnih prijava

Prijave se mogu pretraživati (po naslovu, opisu, adresi, kategoriji i statusu, bez obzira na dijakritike), filtrirati i sortirati:

- filter po jednoj ili više kategorija i statusa;
- sortiranje: najnovije, najstarije, najbliže ili po statusu;
- prikaz samo onih prijava koje su na vidljivom delu mape;
- dugme „Očisti“ za brzo uklanjanje svih filtera.

Taster `/` prebacuje fokus na polje za pretragu. Prijave se učitavaju u delovima, a dugme „Učitaj još prijava“ donosi sledeći deo kada broj prijava poraste.

### 4. Detalji i praćenje statusa

Svaka prijava ima prikaz sa opisom, fotografijama (sa uvećanim prikazom), lokacijom i trenutnim statusom. Lokaciju je moguće otvoriti i na OpenStreetMap mapi, a koordinate kopirati radi lakšeg deljenja. Ako je prijava uključena u akciju čišćenja, detalji prikazuju i povezanu akciju.

Statusi pomažu da se razlikuje tek prijavljen problem od potvrđenog problema ili onog koji je već uključen u plan akcije.

### 5. Organizovanje akcija

Aplikacija sadrži poseban prikaz za akcije čišćenja, podeljen na **predstojeće** i **završene**. Svaka akcija može da prikaže:

- naziv i opis;
- datum i vreme;
- mesto okupljanja, sa oznakom na mapi;
- potrebnu opremu i potrepštine;
- podatke o organizatoru i njegovu napomenu;
- povezane prijave koje se tokom akcije mogu rešavati;
- naslovnu fotografiju, a posle završene akcije i do šest fotografija sa akcije.

Povezivanje više prijava sa jednom akcijom olakšava planiranje rada na nekoliko problema u istom delu grada.

## Kategorije problema

Prijave su grupisane prema vrsti problema:

| Kategorija | Primeri |
|---|---|
| **Nepoželjni grafiti** | Šaranje, tagovi i uvredljive poruke na fasadama i javnim površinama |
| **Navijački grafiti** | Navijački natpisi, simboli i poruke |
| **Nalepnice i posteri** | Nalepnice, plakati i oglasi zalepljeni na javnim površinama |
| **Divlja deponija** | Nelegalno odložen otpad, građevinski šut i krupno smeće |
| **Oštećena infrastruktura** | Polomljene klupe, staze, igrališta i drugi javni inventar |
| **Ostalo** | Drugi vidljivi problemi u javnom prostoru |

## Statusi prijava i akcija

### Prijave

- **Nova** — prijava je poslata i čeka pregled.
- **Proverena** — problem je potvrđen na terenu.
- **Planirana akcija** — prijava je uključena u planirano čišćenje.
- **U toku** — radovi ili akcija su počeli.
- **Rešeno** — problem je uklonjen.
- **Nije za akciju** — problem nije pogodan za volontersko čišćenje i potrebna je druga vrsta intervencije.

Sama prijava ne znači da je problem zvanično potvrđen, niti da je nadležna služba obaveštena.

### Akcije

- **Planirano**, **U toku**, **Završeno** i **Otkazano**.

## Uloga zajednice i moderacija

Prijave i akcije može da pregleda svako, bez naloga. Za slanje prijave i prijavljivanje neprikladnog sadržaja potrebno je prijavljivanje Google nalogom (kada je aplikacija povezana sa Firebaseom). Uz prijavu se javno prikazuje ime iz naloga, ali ne i adresa e-pošte.

Svaki prijavljeni korisnik može da označi prijavu kao sporan sadržaj, jednom po prijavi, uz jedan od razloga: spam ili reklama, dupla prijava, netačna ili obmanjujuća prijava, neprimeren sadržaj ili drugo.

Administratori u panelu „Administracija“ mogu da:

- menjaju statuse prijava;
- pregledaju označen sadržaj i odbace ga ili zatvore kao rešen;
- kreiraju, uređuju i otkazuju akcije čišćenja i povezuju ih sa prijavama.

Time se smanjuje mogućnost da neprimeren sadržaj ili netačne prijave ostanu bez reakcije. Ova pravila nisu samo u interfejsu — sprovode ih Firestore Security Rules (vidi [Bezbednost i pravila pristupa](#bezbednost-i-pravila-pristupa)).

### Obaveštenja e-poštom

Aplikacija šalje kratka obaveštenja na adresu Google naloga:

- **autoru prijave** — kada je prijava odobrena ili odbijena (uz razlog), kada joj moderator promeni status ili vrati prethodnu verziju posle izmene, kada je dokaz sanacije potvrđen ili odbijen, kada je prijava uključena u akciju čišćenja, kada se toj akciji promeni termin ili mesto okupljanja i kada je akcija otkazana;
- **moderatorima i administratorima** — kada stigne nova ili ispravljena prijava, izmena objavljene prijave, dokaz sanacije ili oznaka spornog sadržaja.

Niko ne dobija obaveštenje o sopstvenoj radnji. Potpun spisak poruka, sa tačnim uslovima kada se šalju i kada ne, nalazi se u [Kako aplikacija radi → Obaveštenja e-poštom](docs/use-cases.md#10-obaveštenja-e-poštom). Obaveštenja pravi Cloud Function iz foldera `functions/` i upisuje ih u kolekciju `mail`, a ekstenzija Trigger Email ih šalje preko Gmail SMTP-a. Upisani zapisi se brišu posle nedelju dana. Funkcije, ekstenzija i pravila se objavljuju ručno, jer GitHub Actions objavljuje samo sajt:

```sh
firebase deploy --only functions,extensions,firestore --project ocistimo-novi-sad
```

Pri prvom objavljivanju ekstenzije Firebase CLI traži Gmail app password i čuva ga u Secret Manager-u. Lozinka se nikada ne upisuje u repozitorijum.

Korisnici treba da objavljuju samo informacije relevantne za problem na javnom prostoru. Fotografije i opisi ne treba nepotrebno da otkrivaju lične podatke ili prikazuju ljude na način koji ugrožava njihovu privatnost.

## Pristupačnost i korišćenje na različitim uređajima

Interfejs je na srpskom jeziku, latinicom, i prilagođava se desktop računarima, tabletima i mobilnim telefonima. Na manjim ekranima donja navigacija (Mapa, Prijave, Akcije) omogućava brz prelazak između prikaza, dok se detalji i forma za prijavu prikazuju u panelima prilagođenim mobilnom uređaju.

Dizajn je usmeren na preglednost i brzo korišćenje: mapa ostaje u prvom planu, kontrole su jasno grupisane, a boje i ikonice pomažu u razlikovanju kategorija i statusa. Kontrole imaju opisne oznake za čitače ekrana, a dijalozi i paneli se mogu zatvoriti tasterom `Esc`.

## Trenutno stanje i ograničenja

- Aplikacija sadrži demonstracioni režim sa primerima prijava i akcija. On se uključuje automatski kada Firebase nije podešen.
- U demonstracionom režimu nove prijave čuvaju se samo u lokalnom pregledaču (`localStorage`). Ne dele se sa drugim korisnicima i nisu trajno sačuvane u zajedničkoj bazi.
- Pravo zajedničko čuvanje prijava i prijavljivanje korisnika zahtevaju povezivanje aplikacije sa Firebase projektom.
- Slanje fotografija zahteva Firebase Storage (Blaze plan) i objavljena pravila iz `storage.rules`. Bez podešenog bucket-a (`VITE_FIREBASE_STORAGE_BUCKET`) prijave se šalju bez fotografija, a u demonstracionom režimu fotografije se ne otpremaju.
- Fotografije se čitaju preko javnih adresa sa nasumičnim imenima, a izlistavanje foldera je zabranjeno. Ko ima tačnu adresu fotografije može da je otvori, pa i fotografije „posle” u dokazu sanacije pre nego što ga moderator potvrdi.
- Ako slanje forme ne uspe pošto su fotografije već otpremljene, pa korisnik odustane, te fotografije ostaju u Storage-u. Automatsko čišćenje takvih fotografija još ne postoji.
- Aplikacija trenutno nema komentare ni evidenciju prisustva volontera.
- Obaveštenja e-poštom rade samo uz Firebase (Cloud Functions i ekstenziju Trigger Email), ne u demonstracionom režimu. Korisnik ih za sada ne može isključiti.
- Pretraga adresa nije automatska; korisnik označava lokaciju na mapi i, po potrebi, unosi adresu kao tekst.
- Promene se ne osvežavaju automatski u realnom vremenu; podaci se osvežavaju nakon relevantnih radnji ili dugmetom za osvežavanje.
- Prijave i akcije moraju biti unutar područja Novog Sada (približno 45.05–45.45° S, 19.55–20.05° I).

## Zašto ovaj projekat postoji

Čistiji i uređeniji grad ne zavisi samo od toga da li neko primeti problem, već i od toga da li drugi mogu da saznaju za njega i da li postoji način da se organizuju oko rešenja.

Kuka i Motika nastoji da poveže tri koraka na jednom mestu: **uočavanje problema, njegovo dokumentovanje i organizovanje zajedničke akcije**. Cilj je da se ljudima olakša da pređu sa opažanja problema na konkretnu pomoć svom naselju i gradu.

## Licenca i zahvalnice

Projekat je objavljen kao javno dobro pod licencom [The Unlicense](LICENSE).

- Kartografski podaci i podloga mape: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- Ikonice: [Lucide](https://lucide.dev/).
- Primeri prijava i akcija u demonstracionom režimu su izmišljeni i ne opisuju stvarno trenutno stanje u Novom Sadu.
