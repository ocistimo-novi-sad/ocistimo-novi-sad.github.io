# Kuka i Motika

**Mapa problema u javnim prostorima Novog Sada i mesto za organizovanje zajedničkih akcija čišćenja i uređenja grada.**

Kuka i Motika je zamišljen kao praktičan alat za građane koji žele da prijave smeće, oštećen javni inventar, grafite i druge probleme u svom okruženju. Cilj je da se takvi problemi lakše uoče, dokumentuju i povežu sa ljudima koji žele da pomognu u njihovom rešavanju.

Ideja projekta je jednostavna: umesto da informacije o zapuštenim mestima ostanu rasute po porukama i društvenim mrežama, sve prijave mogu da budu pregledno prikazane na jednoj mapi. Tako zajednica lakše može da proceni gde je pomoć potrebna i da organizuje konkretnu akciju.

## Pregled aplikacije

![Desktop prikaz aplikacije Kuka i Motika](docs/preview.png)

<p align="center">
  <img src="docs/mobile.png" alt="Mobilni prikaz liste prijava i filtera" width="330" />
</p>

> **Napomena:** Prikazi iznad predstavljaju demonstracioni režim aplikacije. Primeri prijava služe za prikaz izgleda i funkcionalnosti i ne predstavljaju stvarno stanje na terenu.

## Kako funkcioniše

### 1. Pregled mape

Glavni deo aplikacije je interaktivna mapa Novog Sada. Na njoj se nalaze oznake koje prikazuju prijavljene probleme. Korisnici mogu da pomeraju mapu, zumiraju određeno područje i otvore pojedinačnu prijavu izborom oznake ili stavke iz liste.

Mapa i lista prijava rade zajedno: izbor prijave u listi usmerava mapu na njenu lokaciju, dok izbor oznake na mapi otvara detalje odgovarajuće prijave.

### 2. Prijavljivanje problema

Korisnik bira lokaciju na mapi i popunjava prijavu. Ona može da sadrži:

- naslov i opis problema;
- kategoriju;
- lokaciju označenu na mapi;
- adresu, ako je poznata;
- do tri fotografije, kada je funkcija za slanje fotografija podešena.

Pre slanja, korisnik može da proveri podatke i prilagodi lokaciju oznake. Aplikacija proverava obavezna polja i prikazuje poruku o uspešnom slanju ili objašnjenje greške.

### 3. Pronalaženje relevantnih prijava

Prijave se mogu pretraživati, filtrirati i sortirati. Dostupne su opcije za pregled po kategoriji i statusu, kao i sortiranje prema vremenu prijave, udaljenosti ili statusu. Lista je podeljena na stranice kako bi pregled ostao praktičan i kada broj prijava poraste.

### 4. Detalji i praćenje statusa

Svaka prijava ima prikaz sa opisom, fotografijama kada su dostupne, lokacijom i trenutnim statusom. Lokaciju je moguće otvoriti i na OpenStreetMap mapi, a koordinate kopirati radi lakšeg deljenja.

Statusi pomažu da se razlikuje tek prijavljen problem od potvrđenog problema ili onog koji je već uključen u plan akcije.

### 5. Organizovanje akcija

Aplikacija sadrži i deo za planirane i završene akcije čišćenja. Svaka akcija može da prikaže:

- naziv i opis;
- datum i vreme;
- mesto okupljanja;
- potrebnu opremu i potrepštine;
- podatke o organizatoru;
- povezane prijave koje se tokom akcije mogu rešavati.

Povezivanje više prijava sa jednom akcijom olakšava planiranje rada na nekoliko problema u istom delu grada.

## Kategorije problema

Prijave su grupisane prema vrsti problema:

| Kategorija | Primeri |
|---|---|
| **Smeće** | Otpad na stazama, smeće u parkovima ili otpad oko kontejnera |
| **Grafiti** | Grafiti i šaranje na javnim površinama |
| **Oštećena infrastruktura** | Polomljene klupe, oštećene kante ili drugi javni inventar |
| **Zapušten prostor** | Neodržavane zelene površine i zapušteni javni prostori |
| **Ostalo** | Drugi vidljivi problemi koji zaslužuju pažnju zajednice |

## Statusi prijava

- **Novo** — problem je prijavljen i čeka pregled.
- **Potvrđeno** — prijava je pregledana i problem je potvrđen.
- **Planirano** — prijava je povezana sa planom rešavanja ili akcijom.
- **U toku** — rad na rešavanju problema je počeo.
- **Rešeno** — problem je otklonjen.
- **Nije pogodno za volontersku akciju** — potrebna je druga vrsta intervencije.

Sama prijava ne znači da je problem zvanično potvrđen, niti da je nadležna služba obaveštena.

## Uloga zajednice i moderacija

Sajt je namenjen javnom pregledanju prijava, dok je za kreiranje prijave i prijavljivanje neprikladnog sadržaja potrebno prijavljivanje Google nalogom kada je aplikacija povezana sa Firebaseom.

Administratori mogu da pregledaju prijavljeni sadržaj, menjaju statuse problema i upravljaju akcijama čišćenja. Time se smanjuje mogućnost da neprimeren sadržaj ili netačne prijave ostanu bez reakcije.

Korisnici treba da objavljuju samo informacije relevantne za problem na javnom prostoru. Fotografije i opisi ne treba nepotrebno da otkrivaju lične podatke ili prikazuju ljude na način koji ugrožava njihovu privatnost.

## Pristupačnost i korišćenje na različitim uređajima

Interfejs je na srpskom jeziku, latinicom, i prilagođava se desktop računarima, tabletima i mobilnim telefonima. Na manjim ekranima korisnik može da pređe između mape i liste, dok se detalji i forma za prijavu prikazuju u panelima prilagođenim mobilnom uređaju.

Dizajn je usmeren na preglednost i brzo korišćenje: mapa ostaje u prvom planu, kontrole su jasno grupisane, a boje i oznake pomažu u razlikovanju kategorija i statusa.

## Trenutno stanje i ograničenja

- Aplikacija sadrži demonstracioni režim sa primerima prijava i akcija.
- U demonstracionom režimu nove prijave čuvaju se samo u lokalnom pregledaču. Ne dele se sa drugim korisnicima i nisu trajno sačuvane u zajedničkoj bazi.
- Pravo zajedničko čuvanje prijava i prijavljivanje korisnika zahtevaju povezivanje aplikacije sa Firebase projektom.
- Slanje fotografija je opciono i dostupno je tek kada je podešen odgovarajući servis za slike.
- Aplikacija trenutno nema komentare, obaveštenja putem e-pošte ni evidenciju prisustva volontera.
- Pretraga adresa nije automatska; korisnik može da označi lokaciju na mapi i, po potrebi, unese adresu kao tekst.
- Promene se ne osvežavaju automatski u realnom vremenu; aplikacija koristi osvežavanje podataka nakon relevantnih radnji ili na zahtev korisnika.

## Zašto ovaj projekat postoji

Čistiji i uređeniji grad ne zavisi samo od toga da li neko primeti problem, već i od toga da li drugi mogu da saznaju za njega i da li postoji način da se organizuju oko rešenja.

Kuka i Motika nastoji da poveže tri koraka na jednom mestu: **uočavanje problema, njegovo dokumentovanje i organizovanje zajedničke akcije**. Cilj je da se ljudima olakša da pređu sa opažanja problema na konkretnu pomoć svom naselju i gradu.

## Zahvalnice

- Kartografski podaci i podloga mape: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- Ikonice: [Lucide](https://lucide.dev/).
- Primeri prijava i akcija u demonstracionom režimu su izmišljeni i ne opisuju stvarno trenutno stanje u Novom Sadu.
