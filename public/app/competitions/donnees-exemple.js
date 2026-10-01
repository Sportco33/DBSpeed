// DBSpeed — compétitions D'EXEMPLE.
// Tout est inventé (noms, équipes, temps) pour construire et tester les écrans.
// Plus tard, ces données viendront de Supabase (importées par les organisateurs).
// Les écrans n'utilisent que les fonctions exportées en bas : listerCompetitions() et chargerCompetition(id).
// Pour brancher Supabase, il suffira de réécrire ces deux fonctions.

// ---------------------------------------------------------------------------
// Hasard « reproductible » : la même compétition donne toujours les mêmes temps
// ---------------------------------------------------------------------------
function graine(texte) {
  let h = 1779033703 ^ texte.length;
  for (let i = 0; i < texte.length; i++) {
    h = Math.imul(h ^ texte.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function hasard(texte) {
  let a = graine(texte);
  const r = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.entre = (min, max) => min + r() * (max - min);
  r.entier = (min, max) => Math.floor(r.entre(min, max + 1));
  r.choix = (liste) => liste[Math.floor(r() * liste.length)];
  r.gauss = () => (r() + r() + r() + r() - 2) / 2; // à peu près une cloche entre -1 et 1
  r.melanger = (liste) => {
    const l = [...liste];
    for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
    return l;
  };
  return r;
}

// ---------------------------------------------------------------------------
// Pays, prénoms, noms, équipes (inventés)
// ---------------------------------------------------------------------------
export const PAYS = {
  FRA: { nom: 'France', drapeau: '🇫🇷' }, NED: { nom: 'Pays-Bas', drapeau: '🇳🇱' },
  BEL: { nom: 'Belgique', drapeau: '🇧🇪' }, GBR: { nom: 'Royaume-Uni', drapeau: '🇬🇧' },
  USA: { nom: 'États-Unis', drapeau: '🇺🇸' }, AUS: { nom: 'Australie', drapeau: '🇦🇺' },
  COL: { nom: 'Colombie', drapeau: '🇨🇴' }, JPN: { nom: 'Japon', drapeau: '🇯🇵' },
  SUI: { nom: 'Suisse', drapeau: '🇨🇭' }, ITA: { nom: 'Italie', drapeau: '🇮🇹' },
  GER: { nom: 'Allemagne', drapeau: '🇩🇪' }, ESP: { nom: 'Espagne', drapeau: '🇪🇸' },
  BRA: { nom: 'Brésil', drapeau: '🇧🇷' }, ARG: { nom: 'Argentine', drapeau: '🇦🇷' },
  NZL: { nom: 'Nouvelle-Zélande', drapeau: '🇳🇿' }, CAN: { nom: 'Canada', drapeau: '🇨🇦' },
  DEN: { nom: 'Danemark', drapeau: '🇩🇰' }, LAT: { nom: 'Lettonie', drapeau: '🇱🇻' },
};

const NOMS = {
  FRA: { h: ['Lucas', 'Hugo', 'Enzo', 'Théo', 'Nathan', 'Louis', 'Jules', 'Maël', 'Arthur', 'Romain', 'Kylian', 'Tom', 'Noah', 'Sacha', 'Axel', 'Mathis', 'Léo', 'Ethan'],
         f: ['Chloé', 'Léa', 'Manon', 'Inès', 'Camille', 'Jade', 'Lina', 'Emma', 'Zoé', 'Lou', 'Axelle', 'Margaux', 'Clara', 'Eva'],
         n: ['Martin', 'Bernard', 'Petit', 'Robert', 'Richard', 'Durand', 'Moreau', 'Laurent', 'Lefèvre', 'Roux', 'Fournier', 'Girard', 'Bonnet', 'Lambert', 'Mercier', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Chevalier', 'Perrin', 'Morel', 'Gauthier', 'Masson', 'Marchand', 'Duval', 'Lemoine', 'Picard', 'Renaud', 'Arnaud'] },
  NED: { h: ['Daan', 'Sem', 'Jens', 'Bram', 'Niek', 'Thijs', 'Ruben', 'Joris'], f: ['Fenna', 'Lieke', 'Sanne', 'Merel', 'Femke', 'Iris'],
         n: ['de Vries', 'van Dijk', 'Bakker', 'Jansen', 'Visser', 'Smit', 'Mulder', 'de Boer', 'van Leeuwen', 'Kramer', 'Brouwer'] },
  BEL: { h: ['Wout', 'Arne', 'Senne', 'Lander', 'Jasper', 'Maxime'], f: ['Elise', 'Ruth', 'Laura', 'Noor'],
         n: ['Peeters', 'Maes', 'Claes', 'Wouters', 'Goossens', 'Dubois', 'Lambrecht', 'Vermeulen'] },
  GBR: { h: ['Oliver', 'Harry', 'Jack', 'Kye', 'Charlie', 'Liam', 'Ross'], f: ['Bethany', 'Emily', 'Grace', 'Megan', 'Holly'],
         n: ['Whyte', 'Smith', 'Taylor', 'Evans', 'Walker', 'Hughes', 'Wright', 'Cooper', 'Kendrick'] },
  USA: { h: ['Connor', 'Tyler', 'Cameron', 'Jake', 'Logan', 'Mason', 'Hunter', 'Corben'], f: ['Alise', 'Felicia', 'Payton', 'Riley', 'Brooke', 'Kelsey'],
         n: ['Johnson', 'Miller', 'Davis', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Clark', 'Lewis'] },
  AUS: { h: ['Kai', 'Izaac', 'Bodi', 'Lochie', 'Rico', 'Jaxon'], f: ['Saya', 'Lauren', 'Ruby', 'Teigan', 'Matilda'],
         n: ['Brown', 'Wilson', 'Kennedy', 'Turner', 'Mitchell', 'Reid', 'Bennett', 'Sakakibara'] },
  COL: { h: ['Diego', 'Carlos', 'Andrés', 'Mateo', 'Santiago', 'Juan'], f: ['Mariana', 'Valentina', 'Gabriela', 'Daniela'],
         n: ['Ramírez', 'Arboleda', 'Gómez', 'Hernández', 'Rodríguez', 'Pajón', 'Oquendo', 'Rendón'] },
  JPN: { h: ['Yoshitaku', 'Haruto', 'Ren', 'Sota', 'Kento'], f: ['Sae', 'Miyu', 'Aoi', 'Hina'],
         n: ['Nagasako', 'Tanaka', 'Suzuki', 'Sato', 'Watanabe', 'Kobayashi', 'Yamamoto'] },
  SUI: { h: ['Simon', 'Cédric', 'David', 'Nils'], f: ['Zoé', 'Lena', 'Nadine'], n: ['Marquart', 'Müller', 'Meier', 'Keller', 'Weber'] },
  ITA: { h: ['Marco', 'Giacomo', 'Matteo', 'Pietro'], f: ['Giulia', 'Sara', 'Chiara'], n: ['Rossi', 'Bianchi', 'Ferrari', 'Fantoni', 'Colombo', 'Ricci'] },
  GER: { h: ['Philip', 'Luis', 'Jonas', 'Felix'], f: ['Lea', 'Nadja', 'Hanna'], n: ['Schmidt', 'Fischer', 'Wagner', 'Becker', 'Hoffmann', 'Schulz'] },
  ESP: { h: ['Pablo', 'Álvaro', 'Hugo', 'Javier'], f: ['Lucía', 'Paula', 'Nerea'], n: ['García', 'López', 'Martínez', 'Sánchez', 'Romero'] },
  BRA: { h: ['Renato', 'Gabriel', 'Pedro'], f: ['Priscilla', 'Paola', 'Ana'], n: ['Silva', 'Santos', 'Oliveira', 'Rezende', 'Costa'] },
  ARG: { h: ['Gonzalo', 'Nicolás', 'Facundo'], f: ['Agustina', 'Florencia'], n: ['Molina', 'Romero', 'Fernández', 'Díaz', 'Álvarez'] },
  NZL: { h: ['Rico', 'Cameron', 'Tahi'], f: ['Sarah', 'Ella'], n: ['Walker', 'Bensemann', 'Moore', 'Taylor'] },
  CAN: { h: ['James', 'Tory', 'Ethan'], f: ['Drew', 'Molly'], n: ['Palmer', 'Smith', 'Tremblay', 'Gagnon'] },
  DEN: { h: ['Niklas', 'Mads', 'Simon'], f: ['Malene', 'Ida'], n: ['Laursen', 'Nielsen', 'Hansen', 'Jensen'] },
  LAT: { h: ['Kristens', 'Edžus', 'Helvijs'], f: ['Vineta', 'Ēvele'], n: ['Krīgers', 'Treimanis', 'Bērziņš', 'Ozols'] },
};

const EQUIPES_MONDE = [
  'Gold Line Racing', 'Nitro Gate Factory', 'Crankset Pro Team', 'Orbite BMX Team', 'Vortex Racing', 'Atlas Gate Team',
  'Kinetik Factory', 'Volt Riders', 'Silver Arrow Racing', 'Rampe 8 Racing', 'Apex Line Team', 'Turbo Gate Crew',
  'Blackline BMX', 'Hyperion Racing', 'Momentum Factory', 'First Turn Team', 'Pulse Racing', 'Gravity Lab BMX',
];
const MOTS_CLUB = ['BMX Club', 'BMX Racing', 'Pilotes BMX', 'BMX Team', 'Vélo Club BMX'];

// ---------------------------------------------------------------------------
// Catégories : temps « moyen » d'un bon pilote à l'arrivée (en secondes, piste standard)
// ---------------------------------------------------------------------------
const NIVEAUX = {
  'Elite Hommes': { temps: 33.2, ecart: 1.6, genre: 'h' },
  'Elite Femmes': { temps: 37.0, ecart: 1.8, genre: 'f' },
  'Junior Hommes': { temps: 34.4, ecart: 1.6, genre: 'h' },
  'Junior Femmes': { temps: 38.2, ecart: 1.9, genre: 'f' },
  'Cadets': { temps: 36.6, ecart: 2.0, genre: 'h' },
  'Cadettes': { temps: 40.1, ecart: 2.2, genre: 'f' },
  'Minimes': { temps: 39.2, ecart: 2.4, genre: 'h' },
  'Benjamins': { temps: 42.0, ecart: 2.6, genre: 'h' },
  'Pupilles': { temps: 45.3, ecart: 3.0, genre: 'h' },
  'Cruiser': { temps: 37.8, ecart: 2.3, genre: 'h' },
  'Masters 30+': { temps: 36.9, ecart: 2.4, genre: 'h' },
};

// Part de chaque secteur dans le temps total : départ→Inter 1, Inter 1→Inter 2, Inter 2→Inter 3, Inter 3→arrivée
const PARTS_SECTEURS = [0.172, 0.307, 0.27, 0.251];
export const LIGNES = ['Inter 1', 'Inter 2', 'Inter 3', 'Arrivée'];
export const SECTEURS = ['S1', 'S2', 'S3', 'S4'];
export const NOMS_SECTEURS = ['Départ → Inter 1', 'Inter 1 → Inter 2', 'Inter 2 → Inter 3', 'Inter 3 → Arrivée'];

// ---------------------------------------------------------------------------
// La liste des compétitions d'exemple
// pays : d'où viennent les pilotes (le premier est le plus représenté)
// avancement : pour une course « en cours », nombre de tours finis après les qualifs
// ---------------------------------------------------------------------------
const COMPETITIONS = [
  {
    id: 'mondial-rotterdam-2026', nom: 'Mondial BMX Series – Finale', type: 'Série internationale',
    niveau: 'International', ville: 'Rotterdam', pays: 'NED', piste: 'Sportpark Rotterdam', longueur: 425,
    debut: '2026-07-24', fin: '2026-07-26', organisateur: 'Mondial BMX Series',
    paysPilotes: ['NED', 'FRA', 'USA', 'GBR', 'AUS', 'COL', 'SUI', 'JPN', 'BEL', 'GER', 'LAT', 'BRA', 'ARG', 'NZL', 'CAN', 'DEN', 'ITA', 'ESP'],
    categories: { 'Elite Hommes': 230, 'Elite Femmes': 112, 'Junior Hommes': 61 },
    description: "La grande finale de la série : les meilleurs pilotes du monde sur une piste rapide avec une butte de départ de 8 mètres.",
  },
  {
    id: 'gp-sarrians-2026', nom: 'Grand Prix de Sarrians', type: 'Course nationale',
    niveau: 'National', ville: 'Sarrians', pays: 'FRA', piste: 'Piste des Garrigues', longueur: 390,
    debut: 'aujourdhui', fin: 'aujourdhui', organisateur: 'Sarrians BMX Club (exemple)', // exemple de course « en direct »
    paysPilotes: ['FRA', 'FRA', 'FRA', 'SUI', 'ITA', 'ESP', 'BEL'], avancement: 2,
    categories: { 'Elite Hommes': 58, 'Elite Femmes': 22, 'Cadets': 40, 'Minimes': 31 },
    description: "Une course nationale très suivie, avec une piste technique et un dernier virage qui fait souvent la différence.",
  },
  {
    id: 'coupe-gironde-m4-2026', nom: 'Coupe de Gironde – Manche 4', type: 'Coupe régionale',
    niveau: 'Régional', ville: 'Bordeaux', pays: 'FRA', piste: 'Piste BMX du Lac', longueur: 370,
    debut: '2026-09-20', fin: '2026-09-20', organisateur: 'Comité BMX Gironde (exemple)',
    paysPilotes: ['FRA'],
    categories: { 'Pupilles': 15, 'Benjamins': 21, 'Minimes': 26, 'Cadets': 18, 'Elite Hommes': 34, 'Cruiser': 7 },
    description: "4e manche de la coupe départementale. Ouverte à tous les licenciés, des pupilles aux elite.",
  },
  {
    id: 'euro-cup-zolder-2026', nom: 'Euro BMX Cup – Zolder', type: 'Coupe d\'Europe',
    niveau: 'International', ville: 'Zolder', pays: 'BEL', piste: 'Circuit Zolder BMX', longueur: 410,
    debut: '2026-06-13', fin: '2026-06-14', organisateur: 'Euro BMX Cup',
    paysPilotes: ['BEL', 'NED', 'FRA', 'GBR', 'GER', 'SUI', 'DEN', 'LAT', 'ITA', 'ESP'],
    categories: { 'Elite Hommes': 120, 'Elite Femmes': 48, 'Junior Hommes': 66, 'Junior Femmes': 25 },
    description: "Manche de la coupe d'Europe sur un circuit automobile. Grande ligne droite et rythmiques rapides.",
  },
  {
    id: 'open-papendrecht-2026', nom: 'Open de Papendrecht', type: 'Course internationale',
    niveau: 'International', ville: 'Papendrecht', pays: 'NED', piste: 'BMX Baan Papendrecht', longueur: 380,
    debut: '2026-08-29', fin: '2026-08-29', organisateur: 'Open Papendrecht (exemple)',
    paysPilotes: ['NED', 'NED', 'BEL', 'GER', 'FRA', 'GBR'],
    categories: { 'Elite Hommes': 44, 'Elite Femmes': 17, 'Cruiser': 12 },
    description: "Une course d'un jour très rapide, appréciée pour sa grosse ambiance.",
  },
  {
    id: 'copa-bogota-2026', nom: 'Copa Latina – Bogotá', type: 'Coupe continentale',
    niveau: 'International', ville: 'Bogotá', pays: 'COL', piste: 'Pista BMX El Salitre', longueur: 400,
    debut: '2026-05-16', fin: '2026-05-17', organisateur: 'Copa Latina BMX',
    paysPilotes: ['COL', 'COL', 'ARG', 'BRA', 'USA', 'ESP'],
    categories: { 'Elite Hommes': 70, 'Elite Femmes': 30, 'Junior Hommes': 28 },
    description: "Course en altitude (2 600 m) : l'air plus léger rend les pilotes encore plus rapides sur le plat.",
  },
  {
    id: 'trophee-bretagne-2026', nom: 'Trophée de Bretagne', type: 'Coupe régionale',
    niveau: 'Régional', ville: 'Rennes', pays: 'FRA', piste: 'Piste BMX de la Prévalaye', longueur: 360,
    debut: '2026-09-06', fin: '2026-09-06', organisateur: 'Ligue BMX Bretagne (exemple)',
    paysPilotes: ['FRA'],
    categories: { 'Benjamins': 12, 'Minimes': 19, 'Cadets': 16, 'Cadettes': 8, 'Masters 30+': 11 },
    description: "Le rendez-vous de fin d'été des clubs bretons.",
  },
  {
    id: 'coupe-france-calais-2026', nom: 'Coupe de France – Manche 7', type: 'Coupe de France',
    niveau: 'National', ville: 'Calais', pays: 'FRA', piste: 'BMX Arena Calais', longueur: 400,
    debut: '2026-10-17', fin: '2026-10-18', organisateur: 'Coupe de France BMX (exemple)',
    paysPilotes: ['FRA', 'FRA', 'FRA', 'BEL'],
    categories: { 'Elite Hommes': 96, 'Elite Femmes': 34, 'Junior Hommes': 52, 'Cadets': 64 },
    description: "Avant-dernière manche de la Coupe de France. Les engagés sont connus, les manches arrivent bientôt.",
  },
  {
    id: 'oklahoma-classic-2026', nom: 'Oklahoma BMX Classic', type: 'Course internationale',
    niveau: 'International', ville: 'Tulsa', pays: 'USA', piste: 'Expo Square Arena', longueur: 350,
    debut: '2026-11-27', fin: '2026-11-29', organisateur: 'Oklahoma BMX Classic (exemple)',
    paysPilotes: ['USA', 'USA', 'CAN', 'COL', 'AUS'],
    categories: { 'Elite Hommes': 80, 'Elite Femmes': 36, 'Cruiser': 40 },
    description: "Course en salle, sur une piste en terre construite dans une immense arène.",
  },
  {
    id: 'australian-open-2026', nom: 'Australian BMX Open', type: 'Course internationale',
    niveau: 'International', ville: 'Brisbane', pays: 'AUS', piste: 'Sleeman BMX Park', longueur: 415,
    debut: '2026-11-14', fin: '2026-11-15', organisateur: 'Australian BMX Open (exemple)',
    paysPilotes: ['AUS', 'AUS', 'NZL', 'JPN', 'USA'],
    categories: { 'Elite Hommes': 52, 'Elite Femmes': 26, 'Junior Hommes': 30 },
    description: "Ouverture de la saison australienne, sous le soleil de Brisbane.",
  },
  {
    id: 'tokyo-supercross-2026', nom: 'Tokyo BMX Supercross', type: 'Supercross',
    niveau: 'International', ville: 'Tokyo', pays: 'JPN', piste: 'Ariake Urban Park', longueur: 430,
    debut: '2026-04-25', fin: '2026-04-26', organisateur: 'Tokyo BMX Supercross (exemple)',
    paysPilotes: ['JPN', 'JPN', 'AUS', 'USA', 'FRA', 'NED', 'COL'],
    categories: { 'Elite Hommes': 64, 'Elite Femmes': 32 },
    description: "Piste Supercross avec une butte de départ de 8 mètres et des sauts géants.",
  },
  {
    id: 'trofeo-verona-2026', nom: 'Trofeo BMX di Verona', type: 'Course internationale',
    niveau: 'International', ville: 'Vérone', pays: 'ITA', piste: 'Pista BMX Verona', longueur: 385,
    debut: '2026-10-10', fin: '2026-10-11', organisateur: 'Trofeo Verona (exemple)',
    paysPilotes: ['ITA', 'ITA', 'SUI', 'FRA', 'GER', 'ESP'],
    categories: { 'Elite Hommes': 48, 'Elite Femmes': 20, 'Junior Hommes': 26 },
    description: "Course italienne réputée, avec des virages relevés très rapides.",
  },
];

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------
const AUJOURDHUI = () => new Date().toISOString().slice(0, 10);
// La course d'exemple « en cours » a toujours lieu aujourd'hui
for (const c of COMPETITIONS) {
  if (c.debut === 'aujourdhui') c.debut = AUJOURDHUI();
  if (c.fin === 'aujourdhui') c.fin = AUJOURDHUI();
}

function statut(c) {
  const j = AUJOURDHUI();
  if (j < c.debut) return 'a-venir';
  if (j > c.fin) return 'terminee';
  return 'en-cours';
}

// Nombre de groupes de qualifs : une puissance de 2, avec 8 pilotes maximum par groupe
function nbGroupes(n) {
  if (n <= 8) return 1;
  let g = 2;
  while (n / g > 8) g *= 2;
  return g;
}
// Nom d'un tour selon son nombre de manches
function nomTour(nbManches) {
  return { 1: 'Finale', 2: '1/2', 4: '1/4', 8: '1/8', 16: '1/16', 32: '1/32' }[nbManches];
}
const r3 = (x) => Math.round(x * 1000) / 1000;

// ---------------------------------------------------------------------------
// Fabrication d'une compétition complète
// ---------------------------------------------------------------------------
function fabriquer(base) {
  const r = hasard(base.id);
  const etat = statut(base);
  const facteurPiste = base.longueur / 400;
  const pilotes = [];
  const equipes = [];
  const manches = [];
  const categories = [];
  const plaquesPrises = new Set();

  // --- Équipes : une liste par pays (clubs pour les courses régionales)
  const equipesParPays = {};
  function equipePour(pays) {
    if (!equipesParPays[pays]) equipesParPays[pays] = [];
    const liste = equipesParPays[pays];
    // on réutilise une équipe existante la plupart du temps
    if (liste.length && r() < 0.78) return r.choix(liste);
    let nom;
    const francophone = ['FRA', 'BEL', 'SUI'].includes(pays);
    if (francophone && (base.niveau === 'Régional' || (pays === base.pays && r() < 0.5))) {
      const ville = r.choix(['du Lac', 'des Pins', 'de la Vallée', 'du Moulin', 'des Dunes', 'de l\'Estuaire', 'du Plateau', 'des Coteaux', 'de la Forêt', 'du Port']);
      nom = `${r.choix(MOTS_CLUB)} ${ville}`;
    } else {
      nom = r.choix(EQUIPES_MONDE);
    }
    let e = equipes.find((x) => x.nom === nom && x.pays === pays);
    if (!e) {
      e = { id: `e${equipes.length + 1}`, nom, pays, pilotes: [] };
      equipes.push(e);
      liste.push(e);
    }
    return e;
  }

  // --- Pilotes engagés
  for (const [cat, nombre] of Object.entries(base.categories)) {
    const niv = NIVEAUX[cat];
    const ids = [];
    for (let i = 0; i < nombre; i++) {
      const pays = i < nombre * 0.35 ? base.paysPilotes[0] : r.choix(base.paysPilotes);
      const pool = NOMS[pays] || NOMS.FRA;
      const prenom = r.choix(niv.genre === 'f' ? pool.f : pool.h);
      const nom = r.choix(pool.n);
      let plaque;
      do { plaque = r.entier(1, base.niveau === 'Régional' ? 299 : 999); } while (plaquesPrises.has(plaque));
      plaquesPrises.add(plaque);
      const equipe = equipePour(pays);
      // niveau du pilote : plus il est petit, plus il est rapide
      const talent = niv.temps * facteurPiste + Math.abs(r.gauss()) * niv.ecart * 1.6 + r() * niv.ecart * 0.4;
      // points forts : chaque pilote est un peu meilleur ou moins bon sur chaque secteur
      const forme = PARTS_SECTEURS.map(() => 1 + r.gauss() * 0.018);
      const p = {
        id: `p${pilotes.length + 1}`, plaque: String(plaque), prenom, nom, pays,
        equipe: equipe.id, categorie: cat, _talent: talent, _forme: forme,
      };
      pilotes.push(p);
      equipe.pilotes.push(p.id);
      ids.push(p.id);
    }
    categories.push({ nom: cat, pilotes: ids });
  }

  const parId = Object.fromEntries(pilotes.map((p) => [p.id, p]));

  // --- Rang UCI (classement mondial) et rang FFC (classement national français), inventés comme
  // le reste : les pilotes les plus rapides ont les meilleurs rangs, avec des trous (les autres
  // pilotes du classement ne sont pas venus). Hasard à part : les temps restent les mêmes.
  const rg = hasard(`${base.id}|rangs`);
  const inter = base.niveau === 'International';
  const national = base.niveau === 'National';
  for (const k of categories) {
    const tries = k.pilotes.map((id) => parId[id])
      .map((p) => ({ p, cle: p._talent * (1 + rg.gauss() * 0.006) }))
      .sort((a, b) => a.cle - b.cle).map((x) => x.p);
    // UCI : seulement les Elite et les Junior ; peu de pilotes classés dans les petites courses
    if (/Elite|Junior/.test(k.nom)) {
      let n = inter ? rg.entier(1, 2) : national ? rg.entier(12, 35) : rg.entier(90, 220);
      const pas = inter ? 1.8 : national ? 7 : 18;
      const part = inter ? 1 : national ? 0.55 : 0.2;
      for (const p of tries) {
        if (rg() < part) { p.rangUCI = n; n += 1 + Math.floor(rg() * pas); }
      }
    }
    // FFC : les pilotes français (licenciés à la Fédération française de cyclisme)
    let f = inter || national ? rg.entier(1, 2) : rg.entier(8, 40);
    const pasF = inter ? 1.5 : national ? 2.5 : 9;
    for (const p of tries) {
      if (p.pays === 'FRA') { p.rangFFC = f; f += 1 + Math.floor(rg() * pasF); }
    }
  }

  // --- Faire rouler une manche : renvoie les résultats classés
  function rouler(idsPilotes, cle) {
    const rr = hasard(`${base.id}|${cle}`);
    const couloirs = rr.melanger([1, 2, 3, 4, 5, 6, 7, 8]);
    const res = idsPilotes.map((id, i) => {
      const p = parId[id];
      let cumul = 0;
      let chute = -1;
      if (rr() < 0.022) chute = rr.entier(0, 3); // chute dans ce secteur : plus de temps ensuite
      const passages = PARTS_SECTEURS.map((part, s) => {
        if (chute !== -1 && s >= chute) return null;
        const secteur = p._talent * part * p._forme[s] * (1 + rr.gauss() * 0.012);
        cumul += secteur;
        return r3(cumul);
      });
      return { pilote: id, couloir: couloirs[i], passages };
    });
    // classement : d'abord ceux qui finissent (au temps), puis ceux qui ont chuté (le plus loin d'abord)
    const lignesPassees = (x) => x.passages.filter((t) => t != null).length;
    res.sort((a, b) => {
      const la = lignesPassees(a); const lb = lignesPassees(b);
      if (la !== lb) return lb - la;
      if (la === 0) return 0;
      return a.passages[la - 1] - b.passages[la - 1];
    });
    res.forEach((x, i) => {
      x.place = i + 1;
      x.abandon = x.passages[3] == null;
      x.points = x.place;
    });
    return res;
  }

  // --- Horaires : on fait avancer une « horloge » par jour
  const jours = [];
  for (let d = new Date(base.debut); d <= new Date(base.fin); d.setDate(d.getDate() + 1)) jours.push(d.toISOString().slice(0, 10));
  let horloge = { jour: 0, minutes: 10 * 60 }; // première manche à 10h00
  function prochaineHeure() {
    const h = { date: jours[Math.min(horloge.jour, jours.length - 1)], heure: `${String(Math.floor(horloge.minutes / 60)).padStart(2, '0')}h${String(horloge.minutes % 60).padStart(2, '0')}` };
    horloge.minutes += 2;
    return h;
  }
  const programme = [];

  // --- Pour chaque catégorie : qualifs, puis tableau final
  const plan = []; // [{cat, tours:[...] }]
  for (const cat of categories) {
    const n = cat.pilotes.length;
    const g = nbGroupes(n);
    const ordre = r.melanger(cat.pilotes);
    const groupes = Array.from({ length: g }, () => []);
    ordre.forEach((id, i) => groupes[i % g].push(id));
    cat.groupes = groupes;
    cat.nbGroupes = g;
    const tours = [];
    if (g > 1) {
      let m = g / 2;
      while (m >= 1) { tours.push(nomTour(m)); m /= 2; }
    }
    cat.tours = tours; // ex. ['1/8', '1/4', '1/2', 'Finale']
    plan.push(cat);
  }

  // Qualifs (3 manches par groupe), toutes catégories, tour par tour
  const qualifsFaites = etat !== 'a-venir';
  for (let q = 1; q <= 3; q++) {
    const debutQ = prochaineHeure();
    for (const cat of plan) {
      cat.groupes.forEach((groupe, gi) => {
        const h = prochaineHeure();
        const m = {
          id: `m${manches.length + 1}`, categorie: cat.nom, phase: `Qualif ${q}`, tour: 'qualif', numero: gi + 1,
          groupe: gi + 1, date: h.date, heure: h.heure, pilotes: groupe,
          resultats: qualifsFaites ? rouler(groupe, `${cat.nom}|Q${q}|${gi}`) : null,
        };
        manches.push(m);
      });
    }
    programme.push({ date: debutQ.date, heure: debutQ.heure, quoi: `Qualifs – tour ${q}`, detail: plan.map((c) => c.nom).join(', ') });
    horloge.minutes += 15;
  }

  // Classement des qualifs par catégorie
  for (const cat of plan) {
    const totaux = Object.fromEntries(cat.pilotes.map((id) => [id, { pilote: id, points: 0, places: [], temps: 0 }]));
    if (qualifsFaites) {
      for (const m of manches.filter((x) => x.categorie === cat.nom && x.tour === 'qualif')) {
        for (const res of m.resultats) {
          const t = totaux[res.pilote];
          t.points += res.points;
          t.places.push(res.place);
          t.temps += res.passages[3] ?? 99;
          t.groupe = m.groupe;
        }
      }
    }
    // rang dans le groupe, puis rang général des qualifs
    const liste = Object.values(totaux);
    const tri = (a, b) => a.points - b.points || (a.places[2] ?? 9) - (b.places[2] ?? 9) || a.temps - b.temps;
    cat.groupes.forEach((groupe, gi) => {
      liste.filter((t) => groupe.includes(t.pilote)).sort(tri).forEach((t, i) => { t.rangGroupe = i + 1; t.groupe = gi + 1; });
    });
    liste.sort(tri).forEach((t, i) => { t.rang = i + 1; t.qualifie = cat.nbGroupes > 1 && t.rangGroupe <= 4; });
    cat.qualifs = qualifsFaites ? liste : null;
  }

  // Tableau final, tour par tour (toutes catégories en même temps pour l'horaire)
  // Si la course est « en cours », on s'arrête après « avancement » tours.
  const maxTours = Math.max(0, ...plan.map((c) => c.tours.length));
  const toursFaitsMax = etat === 'terminee' ? 99 : etat === 'en-cours' ? (base.avancement ?? 1) : 0;
  for (const cat of plan) cat.participants = {};
  horloge.minutes = Math.max(horloge.minutes, 13 * 60 + 30);
  if (jours.length > 1) { horloge.jour = jours.length - 1; horloge.minutes = 10 * 60; }
  for (let t = 0; t < maxTours; t++) {
    let premiereHeure = null;
    const catsDuTour = [];
    for (const cat of plan) {
      // chaque catégorie commence son tableau en décalé pour finir ensemble en finale
      const decalage = maxTours - cat.tours.length;
      const indexTour = t - decalage;
      if (indexTour < 0) continue;
      const tour = cat.tours[indexTour];
      const nbM = cat.tours.length - indexTour === 1 ? 1 : 2 ** (cat.tours.length - indexTour - 1);
      const fait = t < toursFaitsMax; // tour « global » : toutes les catégories avancent ensemble
      // Qui roule dans ce tour ?
      let heats = null;
      if (indexTour === 0) {
        if (cat.qualifs) {
          // les qualifiés, du meilleur au moins bon, répartis en « serpentin »
          const q = cat.qualifs.filter((x) => x.qualifie).map((x) => x.pilote);
          heats = Array.from({ length: nbM }, () => []);
          q.forEach((id, i) => {
            const ligne = Math.floor(i / nbM);
            const col = ligne % 2 === 0 ? i % nbM : nbM - 1 - (i % nbM);
            heats[col].push(id);
          });
        }
      } else {
        const precedent = manches.filter((x) => x.categorie === cat.nom && x.phase === cat.tours[indexTour - 1]);
        if (precedent.every((x) => x.resultats)) {
          heats = Array.from({ length: nbM }, (_, k) => [
            ...precedent[2 * k].resultats.slice(0, 4).map((x) => x.pilote),
            ...precedent[2 * k + 1].resultats.slice(0, 4).map((x) => x.pilote),
          ]);
        }
      }
      for (let k = 0; k < nbM; k++) {
        const h = prochaineHeure();
        if (!premiereHeure) premiereHeure = h;
        const ids = heats ? heats[k] : null;
        manches.push({
          id: `m${manches.length + 1}`, categorie: cat.nom, phase: tour, tour, numero: k + 1,
          date: h.date, heure: h.heure, pilotes: ids,
          resultats: fait && ids ? rouler(ids, `${cat.nom}|${tour}|${k}`) : null,
        });
      }
      catsDuTour.push(`${cat.nom} (${tour})`);
    }
    if (premiereHeure) {
      const noms = [...new Set(catsDuTour.map((x) => x.match(/\((.*)\)/)[1]))];
      programme.push({ date: premiereHeure.date, heure: premiereHeure.heure, quoi: noms.length === 1 && noms[0] === 'Finale' ? 'Finales' : `Tableau final – ${noms.join(' / ')}`, detail: catsDuTour.join(', ') });
    }
    horloge.minutes += 20;
  }
  const finH = prochaineHeure();
  programme.push({ date: finH.date, heure: finH.heure, quoi: 'Podiums', detail: 'Remise des récompenses' });
  programme.unshift(
    { date: jours[0], heure: '08h00', quoi: 'Ouverture et contrôle des licences', detail: '' },
    { date: jours[0], heure: '08h45', quoi: 'Essais libres', detail: 'Par catégorie, 30 minutes chacune' },
  );

  // --- Classement final de chaque catégorie
  for (const cat of plan) {
    const final = [];
    const deja = new Set();
    const ajouter = (id, phase, extra = {}) => { if (!deja.has(id)) { deja.add(id); final.push({ pilote: id, phaseAtteinte: phase, ...extra }); } };
    const termine = cat.qualifs && (cat.nbGroupes === 1
      || manches.some((m) => m.categorie === cat.nom && m.phase === 'Finale' && m.resultats));
    if (cat.qualifs && cat.nbGroupes === 1) {
      // 8 pilotes ou moins : classement aux points des qualifs
      cat.qualifs.forEach((q) => ajouter(q.pilote, 'Qualifs', { points: q.points }));
    } else if (cat.qualifs) {
      // de la finale vers les premiers tours : ceux qui sont allés le plus loin d'abord,
      // puis, dans un même tour, par place dans la manche (les 5e, puis les 6e…) et au temps
      for (let i = cat.tours.length - 1; i >= 0; i--) {
        const ms = manches.filter((m) => m.categorie === cat.nom && m.phase === cat.tours[i] && m.resultats);
        ms.flatMap((m) => m.resultats)
          .sort((a, b) => a.place - b.place || (a.passages[3] ?? 99) - (b.passages[3] ?? 99))
          .forEach((x) => ajouter(x.pilote, cat.tours[i], { placeManche: x.place }));
      }
      cat.qualifs.forEach((q) => ajouter(q.pilote, 'Qualifs', { points: q.points }));
    }
    final.forEach((x, i) => { x.place = i + 1; });
    cat.classement = cat.qualifs ? final : null;
    cat.termine = Boolean(termine);
  }

  // on n'expose pas les valeurs internes de « talent »
  for (const p of pilotes) { delete p._talent; delete p._forme; }

  return {
    ...resume(base),
    piste: base.piste, longueur: base.longueur, organisateur: base.organisateur, description: base.description,
    lignes: LIGNES, secteurs: SECTEURS, nomsSecteurs: NOMS_SECTEURS,
    jours, programme,
    categories: plan.map((c) => ({
      nom: c.nom, pilotes: c.pilotes, nbGroupes: c.nbGroupes, tours: c.tours,
      qualifs: c.qualifs, classement: c.classement, termine: c.termine,
    })),
    pilotes, equipes, manches,
  };
}

function resume(c) {
  const nbPilotes = Object.values(c.categories).reduce((a, b) => a + b, 0);
  return {
    id: c.id, nom: c.nom, type: c.type, niveau: c.niveau, ville: c.ville, pays: c.pays,
    nomPays: PAYS[c.pays].nom, drapeau: PAYS[c.pays].drapeau,
    debut: c.debut, fin: c.fin, statut: statut(c), nbPilotes,
    categoriesNoms: Object.keys(c.categories), exemple: true,
  };
}

// ---------------------------------------------------------------------------
// Ce que les écrans utilisent
// ---------------------------------------------------------------------------
const cache = new Map();

export async function listerCompetitions() {
  return COMPETITIONS.map(resume);
}

export async function chargerCompetition(id) {
  if (!cache.has(id)) {
    const base = COMPETITIONS.find((c) => c.id === id);
    if (!base) return null;
    cache.set(id, fabriquer(base));
  }
  return cache.get(id);
}
