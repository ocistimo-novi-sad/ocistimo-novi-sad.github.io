import type { Category, CleanupAction, Report, ReportStatus } from '../types';

/**
 * Sample content used only when Firebase is not configured (demo mode).
 * The UI labels these records explicitly, so they are never mistaken for
 * values stored in a database.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * HOUR_MS);
}

function dateFromNow(days: number, hour: number, minute = 0): Date {
  const date = new Date(Date.now() + days * DAY_MS);
  date.setHours(hour, minute, 0, 0);
  return date;
}

interface ReportSeed {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  address: string;
  hoursAgo: number;
  author: string;
}

const REPORT_SEEDS: ReportSeed[] = [
  {
    id: 'r-klupa-dunavski',
    title: 'Polomljena klupa u Dunavskom parku',
    description:
      'Drvena letva na klupi je pukla i viri iz šarki. Klupa je pored glavne staze, pa je nezgodna za starije ljude i decu. Susedna klupa u istoj aleji je u redu.',
    category: 'damaged_infrastructure',
    status: 'verified',
    latitude: 45.25253,
    longitude: 19.84052,
    address: 'Dunavski park, Novi Sad',
    hoursAgo: 52,
    author: 'Mila J.',
  },
  {
    id: 'r-pruga-deponija',
    title: 'Divlja deponija pored železničke pruge',
    description:
      'Pored koloseka je odloženo nekoliko vreća otpada i stari nameštaj. Prostor je vidljiv sa ulice i privlači dodatno bacanje smeća. Pristup je moguć sa staze sa gornje strane nasipa.',
    category: 'waste',
    status: 'verified',
    latitude: 45.26482,
    longitude: 19.81924,
    address: 'Salajka, uz prugu',
    hoursAgo: 70,
    author: 'Nikola P.',
  },
  {
    id: 'r-grafiti-detelinara',
    title: 'Grafiti na zidu pored igrališta',
    description:
      'Zid uz dečje igralište je prekriven sprejom u poslednjih nedelju dana. Igračka površina nije oštećena, ali je boja svuda oko ulaza. Potrebna je pomoć za čišćenje i prekrečavanje.',
    category: 'graffiti',
    status: 'planned',
    latitude: 45.26197,
    longitude: 19.80712,
    address: 'Detelinara, između zgrada',
    hoursAgo: 30,
    author: 'Ana S.',
  },
  {
    id: 'r-ljuljaske-liman',
    title: 'Polomljena ljuljaška na igralištu',
    description:
      'Jedna od dve ljuljaške je otkinuta sa rama i visi. Igralište je i dalje u upotrebi jer nema ograde ni znaka upozorenja. Deca se penju na oštećeni deo, što je rizično.',
    category: 'damaged_infrastructure',
    status: 'planned',
    latitude: 45.24165,
    longitude: 19.83798,
    address: 'Liman, blok 3',
    hoursAgo: 96,
    author: 'Marko D.',
  },
  {
    id: 'r-kontejneri-grbavica',
    title: 'Rasuto smeće oko kontejnera',
    description:
      'Kontejneri su prepuni, a vreće su ostavljene pored i vetar ih je raznosio po trotoaru. Prolaz je sužen i teško je proći sa kolicima. Potrebno je organizovano sakupljanje.',
    category: 'waste',
    status: 'new',
    latitude: 45.25186,
    longitude: 19.82956,
    address: 'Grbavica, ugao Ulice Vase Stajića',
    hoursAgo: 9,
    author: 'Jovana R.',
  },
  {
    id: 'r-telep-zelenilo',
    title: 'Zapuštena zelena površina na Telepu',
    description:
      'Travnjak između zgrada nije košen, a klupe su obrasle u korov. Biciklistička staza je delimično prekrivena granjem. Prostor je nekada bio glavno mesto okupljanja u kvartu.',
    category: 'neglected_area',
    status: 'planned',
    latitude: 45.24671,
    longitude: 19.79532,
    address: 'Telep, između ulica',
    hoursAgo: 120,
    author: 'Stefan M.',
  },
  {
    id: 'r-futoski-otpad',
    title: 'Iskršene grane i otpad u Futoškom parku',
    description:
      'Nakon nevremena ostalo je polomljenih grana i granja pored staza, a uz ogradu je i nekoliko boca i kesa. Staze su prohodne, ali je potrebno raščišćavanje pre sledeće kiše.',
    category: 'neglected_area',
    status: 'planned',
    latitude: 45.24713,
    longitude: 19.82214,
    address: 'Futoški park, severni deo',
    hoursAgo: 140,
    author: 'Ivana T.',
  },
  {
    id: 'r-kej-staza',
    title: 'Oštećena staza na keju',
    description:
      'Deo asfalta je propao i formirala se rupa duboka oko 10 cm. Noću je slabo osvetljena i lako se ne vidi. Staza je popularna za trčanje i vožnju bicikla.',
    category: 'damaged_infrastructure',
    status: 'in_progress',
    latitude: 45.24887,
    longitude: 19.84776,
    address: 'Kej, kod Štranda',
    hoursAgo: 200,
    author: 'Vladimir K.',
  },
  {
    id: 'r-gradilisni-otpad',
    title: 'Ostaci gradilišnog materijala',
    description:
      'Na javnoj površini su odložene palete, komadi betona i urolane folije. Obim i težina prevazilaze mogućnosti volonterske akcije, pa je slučaj prosleđen nadležnoj službi.',
    category: 'waste',
    status: 'not_suitable',
    latitude: 45.25731,
    longitude: 19.85244,
    address: 'Sajmište, uz novu zgradu',
    hoursAgo: 260,
    author: 'Dejan V.',
  },
  {
    id: 'r-stajaliste-grafit',
    title: 'Grafit na autobuskom stajalištu',
    description:
      'Staklo stajališta je prekriveno crnim sprejom, pa se red vožnje ne vidi. Prijavljeno je i očišćeno u okviru akcije čišćenja centra.',
    category: 'graffiti',
    status: 'resolved',
    latitude: 45.25432,
    longitude: 19.83911,
    address: 'Bulevar Mihajla Pupina',
    hoursAgo: 400,
    author: 'Sara L.',
  },
  {
    id: 'r-kanta-novonaselje',
    title: 'Prevrnuta kanta u Novom naselju',
    description:
      'Kanta za otpatke je prevrnuta i sadržaj se prosipao po travnjaku. Vreće su sakupljene tokom akcije, a kanta je vraćena na postolje.',
    category: 'waste',
    status: 'resolved',
    latitude: 45.25847,
    longitude: 19.84553,
    address: 'Novo naselje, kod pijace',
    hoursAgo: 430,
    author: 'Petar J.',
  },
  {
    id: 'r-strand-staza',
    title: 'Zarasla staza pored Štranda',
    description:
      'Staza je prekrivena rastinjem i teško je prohodna posle kiše. Pored su ostaci orezanih grana koje niko nije odneo. Pristup plaži je otežan.',
    category: 'neglected_area',
    status: 'new',
    latitude: 45.24595,
    longitude: 19.84621,
    address: 'Štrand, zapadni ulaz',
    hoursAgo: 16,
    author: 'Marija N.',
  },
  {
    id: 'r-info-table',
    title: 'Polomljene info table na punktu',
    description:
      'Dve info table su polomljene i vise sa stubova, a tekst se ne može pročitati. Stubovi su korodirali. Potrebna je zamena ili privremeno uklanjanje.',
    category: 'other',
    status: 'verified',
    latitude: 45.25243,
    longitude: 19.86137,
    address: 'Petrovaradinska tvrđava',
    hoursAgo: 88,
    author: 'Luka B.',
  },
  {
    id: 'r-petrovaradin-klupa',
    title: 'Oštećena klupa na tvrđavi',
    description:
      'Naslon klupe je odvojen od sedišta i klupa se klati. Nalazi se na vidikovcu gde je velika poseta. Popravka je jednostavna, potrebno je učvrstiti šrafove i zameniti letvu.',
    category: 'damaged_infrastructure',
    status: 'verified',
    latitude: 45.25192,
    longitude: 19.86259,
    address: 'Petrovaradinska tvrđava, gornja terasa',
    hoursAgo: 300,
    author: 'Tijana M.',
  },
  {
    id: 'r-futoski-klupe',
    title: 'Oštećene klupe u Futoškom parku',
    description:
      'Tri klupe u glavnoj aleji imaju polomljene letve i olabavljene šrafove. Jedna je potpuno nepodesna za sedenje. Potrebno je doneti alat i zameniti letve.',
    category: 'damaged_infrastructure',
    status: 'planned',
    latitude: 45.24621,
    longitude: 19.82104,
    address: 'Futoški park, glavna aleja',
    hoursAgo: 180,
    author: 'Ivana T.',
  },
  {
    id: 'r-detelinara-kontejneri',
    title: 'Smeće uz kontejnere na Detelinari',
    description:
      'Oko kontejnera je ostavljen otpad u rasutom stanju, uključujući staklo i ambalažu. Prostor je uz pešačku stazu kojom deca idu u školu. Potrebno je očistiti i oprati površinu.',
    category: 'waste',
    status: 'planned',
    latitude: 45.26231,
    longitude: 19.80821,
    address: 'Detelinara, kod škole',
    hoursAgo: 66,
    author: 'Ana S.',
  },
];

export function createDemoReports(): Report[] {
  return REPORT_SEEDS.map((seed) => ({
    id: seed.id,
    title: seed.title,
    description: seed.description,
    category: seed.category,
    status: seed.status,
    latitude: seed.latitude,
    longitude: seed.longitude,
    address: seed.address,
    createdAt: hoursAgo(seed.hoursAgo),
    createdBy: 'demo-zajednica',
    createdByName: seed.author,
    imageUrls: [],
    source: 'demo',
  }));
}

export function createDemoActions(): CleanupAction[] {
  return [
    {
      id: 'a-futoski',
      title: 'Jesenje čišćenje Futoškog parka',
      description:
        'Okupljamo se kod glavnog ulaza i delimo se u dve grupe. Prva grupa čisti staze i travnjake od granja i otpada, druga popravlja klupe u glavnoj aleji. Akcija traje do 13 časova, a alat i rukavice obezbeđuje organizator.',
      date: dateFromNow(9, 10),
      meetingPoint: 'Glavni ulaz u Futoški park, sa strane Bulevara oslobođenja',
      latitude: 45.24693,
      longitude: 19.82277,
      status: 'planned',
      reportIds: ['r-futoski-otpad', 'r-futoski-klupe'],
      supplies: ['Radne rukavice', 'Vreće za otpad', 'Grablje i metle', 'Voda za piće'],
      organizerName: 'Ekološko udruženje Futoški park',
      organizerNote:
        'Prijavite se porukom na mejl organizatora najkasnije dan ranije. Maloletni mogu doći uz pratnju roditelja.',
      createdAt: hoursAgo(150),
      createdBy: 'demo-admin',
      source: 'demo',
    },
    {
      id: 'a-detelinara',
      title: 'Veliko spremanje Detelinare',
      description:
        'Čistimo prostor oko škole i zida pored igrališta. Pripremljene su vreće za odvojeno sakupljanje plastike i stakla, a nakon čišćenja krečimo zid u dogovoru sa školom. Pridružite se na sat ili na celo jutro.',
      date: dateFromNow(16, 9, 30),
      meetingPoint: 'Ispred škole na Detelinari, ulaz sa dvorišne strane',
      latitude: 45.26161,
      longitude: 19.80674,
      status: 'planned',
      reportIds: ['r-grafiti-detelinara', 'r-detelinara-kontejneri'],
      supplies: ['Rukavice', 'Vreće za otpad', 'Kreč i valjci', 'Aparat za pranje pod pritiskom'],
      organizerName: 'Inicijativa Detelinara',
      organizerNote:
        'Dolazak nije potrebno najavljivati. Alat delimo na licu mesta, a deca mogu pomoći uz nadzor.',
      createdAt: hoursAgo(60),
      createdBy: 'demo-admin',
      source: 'demo',
    },
    {
      id: 'a-liman',
      title: 'Uređenje igrališta na Limanu',
      description:
        'Uklanjamo oštećenu ljuljašku, čistimo površinu i postavljamo privremeno upozorenje dok nadležna služba ne zameni deo. Pomoć je potrebna oko demontaže i sakupljanja otpada.',
      date: dateFromNow(23, 11),
      meetingPoint: 'Liman, blok 3, ulaz u igralište sa strane ulice',
      latitude: 45.2415,
      longitude: 19.8375,
      status: 'planned',
      reportIds: ['r-ljuljaske-liman'],
      supplies: ['Alat za odvijanje', 'Rukavice', 'Traka za obeležavanje'],
      organizerName: 'Savet mesne zajednice Liman',
      organizerNote: 'Potrebna je pomoć dvoje ljudi sa alatom. Ostali mogu pomoći u čišćenju okoline.',
      createdAt: hoursAgo(48),
      createdBy: 'demo-admin',
      source: 'demo',
    },
    {
      id: 'a-centar',
      title: 'Prolećno čišćenje centra',
      description:
        'Akcija je završena. Očišćeno je stajalište na Bulevaru Mihajla Pupina, uklonjene su vreće oko pijace u Novom naselju i oprane su javne površine.',
      date: dateFromNow(-18, 9),
      meetingPoint: 'Trg slobode, kod spomenika',
      latitude: 45.2553,
      longitude: 19.8452,
      status: 'completed',
      reportIds: ['r-stajaliste-grafit', 'r-kanta-novonaselje'],
      supplies: ['Rukavice', 'Vreće za otpad', 'Sredstvo za pranje'],
      organizerName: 'Zajednica Kuka i Motika',
      organizerNote: 'Hvala svima koji su učestvovali. Rezultati su vidljivi na lokacijama prijava.',
      createdAt: hoursAgo(600),
      createdBy: 'demo-admin',
      source: 'demo',
    },
  ];
}
