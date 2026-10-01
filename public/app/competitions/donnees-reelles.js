// DBSpeed — VRAIES compétitions de BMX Racing (saison 2026).
// Recherchées le 01/10/2026 sur le site de l'UCI (uci.org) et d'autres sources officielles
// (UEC, FFC, fédérations nationales). Chaque compétition donne ses sources.
//
// Ce qu'on a : le calendrier (dates, villes, pistes) et les classements publiés (podiums,
// et parfois d'autres places ou des temps). Ce qu'on n'a PAS : le détail des manches
// et les temps aux intermédiaires (l'UCI ne les publie pas en données ouvertes).
// Ils arriveront quand les organisateurs importeront leurs fichiers de chronométrage.
//
// Pour ajouter une compétition : copier un bloc de COMPETITIONS et remplir les champs.
// Une place connue s'écrit [place, 'Prénom Nom', 'CODE PAYS', temps en secondes ou null].

const UCI_COUPE_SARRIANS = 'https://www.uci.org/article/uci-bmx-racing-world-cup-seasoned-champions-and-new-talents-mark-season-opener/5W3QLmiOgaLkj0Gf7KbfPG';
const UCI_COUPE_PAPENDAL = 'https://www.uci.org/article/uci-bmx-racing-world-cup-double-victory-for-the-swiss-aeberhard-in-papendal/5bQeNcCGBGR7UNjYGPY49r';
const UCI_CALENDRIER = 'https://www.uci.org/pressrelease/2026-uci-bmx-racing-world-cup-expands-with-confirmation-of-four-chinese-rounds/3WHWdvBAFaR3PliNDcoCt0';
const UEC_PROGRAMME = 'https://www.uec.ch/resources/2026%20Events/bmx%20euro%20cup/2026%20Event%20programmes%20UEC%20BMX%20Racing.pdf';
const FFC_NOTE = 'https://ffc.fr/app/uploads/sites/2/2026/01/Note-aux-clubs-BMX-Racing-2026-05-06.pdf';

const COUPE_DU_MONDE = 'Coupe du monde UCI';
const COUPE_EUROPE = "Coupe d'Europe UEC";
const COUPE_FRANCE = 'Coupe de France';

export const COMPETITIONS_REELLES = [
  // ------------------------------------------------------------------ Coupe du monde UCI
  {
    id: 'uci-cdm-2026-sarrians', nom: 'Coupe du monde UCI – Manches 1 et 2', type: COUPE_DU_MONDE, niveau: 'International',
    ville: 'Sarrians', pays: 'FRA', piste: 'Piste BMX de Sarrians (butte de départ de 8 m)', debut: '2026-06-06', fin: '2026-06-07',
    organisateur: 'UCI (Union Cycliste Internationale)',
    description: "Ouverture de la Coupe du monde 2026 dans le Vaucluse. Première victoire en Coupe du monde pour le Néerlandais Jaymio Brink le samedi, puis doublé pour la Colombie avec Diego Arboleda le dimanche.",
    resultats: {
      'Elite Hommes · Manche 1': [[1, 'Jaymio Brink', 'NED'], [2, 'Diego Arboleda Ospina', 'COL'], [3, 'Sylvain André', 'FRA']],
      'Elite Femmes · Manche 1': [[1, 'Molly Simpson', 'CAN'], [2, 'Malene Kejlstrup', 'DEN'], [3, 'Saya Sakakibara', 'AUS'], [6, 'Sienna Pal', 'AUS']],
      'U23 Hommes · Manche 1': [[1, 'Léo Le Bougeant', 'FRA'], [2, 'Joshua Jolly', 'AUS'], [3, 'Clément Rocherieux', 'FRA']],
      'U23 Femmes · Manche 1': [[1, 'Freia Challis', 'GBR'], [2, 'Isabella Schramm', 'AUS'], [3, 'Robyn Gommers', 'BEL'], [8, 'Sabina Košárková', 'CZE']],
      'Elite Hommes · Manche 2': [[1, 'Diego Arboleda Ospina', 'COL'], [2, 'Eddy Clerté', 'FRA'], [3, 'Cameron Wood', 'USA']],
      'Elite Femmes · Manche 2': [[1, 'Saya Sakakibara', 'AUS'], [2, 'Molly Simpson', 'CAN'], [3, 'Michelle Wissing', 'NED'], [9, 'Sienna Pal', 'AUS']],
      'U23 Hommes · Manche 2': [[1, 'Clément Rocherieux', 'FRA'], [2, 'Léo Le Bougeant', 'FRA'], [3, 'Mathis Jacquet', 'FRA']],
      'U23 Femmes · Manche 2': [[1, 'Renske Van Santvoort', 'NED'], [2, 'Laura Mougey', 'FRA'], [3, 'Freia Challis', 'GBR']],
    },
    sources: [
      { nom: 'UCI – podiums des manches 1 et 2', url: UCI_COUPE_SARRIANS },
      { nom: 'AusCycling – Sakakibara à Sarrians', url: 'https://australiancyclingteam.com/news/saya-sakakibara-scores-first-world-cup-win-of-2026-in-sarrians' },
      { nom: 'Czech BMX – manches 1 et 2', url: 'https://czechbmx.cz/news/report-1-a-2-kolo-uci-bmx-racing-world-cup-sarrians-francie/' },
    ],
  },
  {
    id: 'uci-cdm-2026-papendal', nom: 'Coupe du monde UCI – Manches 3 et 4', type: COUPE_DU_MONDE, niveau: 'International',
    ville: 'Papendal (Arnhem)', pays: 'NED', piste: 'Piste de Papendal (butte de départ de 9 m)', debut: '2026-06-13', fin: '2026-06-14',
    organisateur: 'UCI (Union Cycliste Internationale)',
    description: "Doublé du Suisse Loris Aeberhard chez les hommes. Chez les femmes, 29e victoire en Coupe du monde pour Laura Smulders le samedi, puis victoire de Bethany Shriever le dimanche. Piste rapide malgré la pluie.",
    resultats: {
      'Elite Hommes · Manche 3': [[1, 'Loris Aeberhard', 'SUI'], [2, 'Jaymio Brink', 'NED'], [3, 'Cameron Wood', 'USA'], [4, 'Tim Goossens', 'NED']],
      'Elite Femmes · Manche 3': [[1, 'Laura Smulders', 'NED', 34.247], [2, 'Molly Simpson', 'CAN', 34.515], [3, 'Bethany Shriever', 'GBR', 34.741]],
      'U23 Hommes · Manche 3': [[1, 'Mathis Jacquet', 'FRA'], [2, 'Jesse De Veer', 'NED'], [3, 'Clément Rocherieux', 'FRA']],
      'U23 Femmes · Manche 3': [[1, 'Sabina Košárková', 'CZE'], [2, 'Alexis Alden', 'USA'], [3, 'Lissi van Schijndel', 'NED'], [4, 'Aiko Gommers', 'BEL']],
      'Elite Hommes · Manche 4': [[1, 'Loris Aeberhard', 'SUI', 34.132], [2, 'Jaymio Brink', 'NED'], [3, 'Eddy Clerté', 'FRA']],
      'Elite Femmes · Manche 4': [[1, 'Bethany Shriever', 'GBR', 33.839], [2, 'Saya Sakakibara', 'AUS', 34.388], [3, 'Molly Simpson', 'CAN', 34.551], [4, 'Nadine Aeberhard', 'SUI'], [5, 'Lauren Reynolds', 'AUS'], [8, 'Teya Rufus', 'AUS']],
      'U23 Hommes · Manche 4': [[1, 'Joshua Jolly', 'AUS', 34.016], [2, 'Mark Lüthi', 'SUI'], [3, 'Seal Nünlist', 'SUI'], [8, 'Victor Beirinckx', 'BEL']],
      'U23 Femmes · Manche 4': [[1, 'Renske Van Santvoort', 'NED'], [2, 'Lilly Greenough', 'NZL'], [3, 'Sabina Košárková', 'CZE'], [6, 'Mia Webster', 'AUS']],
    },
    sources: [
      { nom: 'UCI – double victoire d’Aeberhard à Papendal', url: UCI_COUPE_PAPENDAL },
      { nom: 'Olympic.ca – temps des femmes (manche 3)', url: 'https://olympic.ca/2026/06/13/molly-simpson-rides-to-third-straight-bmx-racing-world-cup-podium' },
      { nom: 'AusCycling – Jolly gagne à Papendal', url: 'https://australiancyclingteam.com/news/josh-jolly-wins-in-papendal-saya-sakakibara-collects-second' },
    ],
  },
  {
    id: 'uci-cdm-2026-pekin', nom: 'Coupe du monde UCI – Manches 5 et 6', type: COUPE_DU_MONDE, niveau: 'International',
    ville: 'Mentougou (Pékin)', pays: 'CHN', piste: null, debut: '2026-10-03', fin: '2026-10-04',
    organisateur: 'UCI (Union Cycliste Internationale)',
    description: "Première des deux étapes chinoises de la Coupe du monde, dans le district de Mentougou, à l'ouest de Pékin.",
    resultats: {},
    sources: [{ nom: 'UCI – calendrier 2026 de la Coupe du monde', url: UCI_CALENDRIER }],
  },
  {
    id: 'uci-cdm-2026-chongli', nom: 'Coupe du monde UCI – Manches 7 et 8', type: COUPE_DU_MONDE, niveau: 'International',
    ville: 'Chongli (Zhangjiakou)', pays: 'CHN', piste: null, debut: '2026-10-10', fin: '2026-10-11',
    organisateur: 'UCI (Union Cycliste Internationale)',
    description: "Deuxième étape chinoise, à environ 200 km de Pékin, dans la province du Hebei.",
    resultats: {},
    sources: [{ nom: 'UCI – calendrier 2026 de la Coupe du monde', url: UCI_CALENDRIER }],
  },
  {
    id: 'uci-cdm-2026-sarasota', nom: 'Coupe du monde UCI – Manches 9 et 10 (finale)', type: COUPE_DU_MONDE, niveau: 'International',
    ville: 'Sarasota (Floride)', pays: 'USA', piste: null, debut: '2026-10-31', fin: '2026-11-01',
    organisateur: 'UCI (Union Cycliste Internationale)',
    description: "Dernière étape de la saison : c'est ici que se joue le classement général de la Coupe du monde 2026.",
    resultats: {},
    sources: [{ nom: 'UCI – calendrier 2026 de la Coupe du monde', url: UCI_CALENDRIER }],
  },

  // ------------------------------------------------------------------ Championnats du monde
  {
    id: 'uci-mondiaux-2026-brisbane', nom: 'Championnats du monde UCI de BMX Racing', type: 'Championnat du monde', niveau: 'International',
    ville: 'Brisbane', pays: 'AUS', piste: 'Sleeman Sports Complex (piste de 400 m)', debut: '2026-07-18', fin: '2026-07-19',
    organisateur: 'UCI (Union Cycliste Internationale)',
    description: "Le dimanche des finales a été annulé à cause d'un vent trop fort. Les titres ont été donnés avec la règle de l'UCI (article 6.1.038 bis) : le classement du dernier tour terminé le samedi compte comme résultat final. Les courses Challenge et Masters (amateurs) ont suivi du 22 au 25 juillet.",
    resultats: {
      'Elite Hommes': [[1, 'Jesse Asmus', 'AUS'], [2, 'Ross Cullen', 'GBR'], [3, 'Mathis Ragot Richard', 'FRA'], [10, 'Cameron Wood', 'USA'], [13, 'Kamren Larsen', 'USA']],
      'Elite Femmes': [[1, 'Bethany Shriever', 'GBR'], [2, 'Saya Sakakibara', 'AUS'], [3, 'Laura Smulders', 'NED'], [8, 'Daleny Vaughn', 'USA'], [20, 'Payton Ridenour', 'USA']],
      'U23 Hommes': [[1, 'Joshua Jolly', 'AUS'], [2, 'Jesse De Veer', 'NED'], [3, 'Clément Rocherieux', 'FRA']],
      'U23 Femmes': [[1, 'Renske Van Santvoort', 'NED'], [2, 'Veronika Sturiška', 'LAT'], [3, 'Alexis Alden', 'USA']],
      'Junior Hommes': [[1, 'Lucas Zhou', 'CAN'], [2, 'Cameron Gatt', 'AUS'], [3, 'Tommy Bruney', 'USA'], [5, 'Evan Esposito', 'USA'], [7, 'Cutter Godaire', 'USA']],
      'Junior Femmes': [[1, 'Freia Challis', 'GBR'], [2, 'Elsa Rendall Todd', 'GBR'], [3, 'Isla Basa', 'AUS'], [5, 'Derin Merten', 'USA']],
    },
    sources: [
      { nom: 'UCI – titres décidés après l’annulation des finales', url: 'https://www.uci.org/article/2026-uci-bmx-racing-world-championships-titles-decided-after-extreme-weather-forces-cancellation-of-finals/7mshNMaLP8kyCY8NRDcj92' },
      { nom: 'UCI – finales annulées à cause du vent', url: 'https://www.uci.org/article/2026-uci-bmx-racing-world-championships-finals-cancelled-due-to-strong-winds/6cUOx2qstM51CR8A9arYwk' },
      { nom: 'UCI – présentation (lieu, piste de 400 m)', url: 'https://www.uci.org/article/the-uci-bmx-racing-world-championships-are-almost-upon-us/2j07FFFFT4RgQy9WnkEQcM' },
      { nom: 'USA Cycling – places des Américains', url: 'https://usacycling.org/article/alexis-alden-and-tommy-bruney-earn-bronze-medals-at-the-2026-uci-bmx-racing-world-championships' },
    ],
  },

  // ------------------------------------------------------------------ Championnats continentaux
  {
    id: 'uec-europe-2026-sarrians', nom: "Championnats d'Europe UEC de BMX Racing", type: "Championnat d'Europe", niveau: 'International',
    ville: 'Sarrians', pays: 'FRA', piste: 'Piste BMX de Sarrians', debut: '2026-06-23', fin: '2026-06-28',
    organisateur: 'UEC (Union Européenne de Cyclisme)',
    description: "Triplé français chez les hommes Elite avec Mathis Ragot Richard champion d'Europe. Laura Smulders gagne chez les femmes. Les titres Elite ont été courus le 28 juin.",
    resultats: {
      'Elite Hommes': [[1, 'Mathis Ragot Richard', 'FRA'], [2, 'Jérémy Rencurel', 'FRA'], [3, 'Léo Garoyan', 'FRA']],
      'Elite Femmes': [[1, 'Laura Smulders', 'NED'], [2, 'Zoé Claessens', 'SUI'], [3, 'Axelle Etienne', 'FRA']],
      'U23 Hommes': [[1, 'Mark Lüthi', 'SUI'], [2, 'Alexandre Emmel', 'SUI'], [3, 'Léo Le Bougeant', 'FRA']],
      'U23 Femmes': [[1, 'Renske Van Santvoort', 'NED'], [2, 'Veronika Monika Sturiska', 'LAT'], [3, 'Laura Mougey', 'FRA']],
      'Junior Hommes': [[1, 'Marco Del Tongo', 'ITA'], [2, 'Alex Chiandetti', 'ITA'], [3, 'David Ferreira', 'SUI']],
      'Junior Femmes': [[1, 'Elsa Rendall Todd', 'GBR'], [2, 'Léonie Burgel', 'FRA'], [3, 'Camille Brouchier', 'FRA']],
    },
    sources: [
      { nom: 'UEC – Sarrians sacre Ragot Richard et Smulders', url: 'https://www.uec.ch/en/actu/381/eurobmx26-sarrians-crowns-ragot-richard-and-smulders' },
      { nom: 'UEC – programme officiel', url: 'https://www.uec.ch/resources/2026%20Events/bmx%20sarrians/2026%20Programme%20BMX%20EuroChamps%20Sarrians%20v6%2025062026.pdf' },
    ],
  },
  {
    id: 'copaci-panam-2026-bogota', nom: 'Championnats panaméricains de BMX', type: 'Championnat continental', niveau: 'International',
    ville: 'Bogotá', pays: 'COL', piste: 'Pista Carlos Ramírez, Parque El Salitre', debut: '2026-04-30', fin: '2026-05-03',
    organisateur: 'COPACI (Confédération panaméricaine de cyclisme)',
    description: "16 pays engagés. La Colombie, à domicile, remporte les deux podiums Elite en entier.",
    resultats: {
      'Elite Hommes': [[1, 'Diego Arboleda', 'COL'], [2, 'Carlos Ramírez', 'COL'], [3, 'Mateo Carmona', 'COL']],
      'Elite Femmes': [[1, 'Valentina Muñoz', 'COL'], [2, 'Gabriela Bolle', 'COL'], [3, 'Sharid Fayad', 'COL']],
    },
    sources: [
      { nom: 'El Espectador – résultats', url: 'https://www.elespectador.com/deportes/ciclismo/colombia-arrasa-en-el-panamericano-de-bmx-2026-seis-oros-y-dominio-absoluto-en-bogota/' },
      { nom: 'COPACI – lieu et dates', url: 'https://www.copaci.org/en/bogota-ready-to-host-the-2026-pan-american-bmx-championships-with-16-countries-participating/' },
    ],
  },
  {
    id: 'oceanie-2026-brisbane', nom: "Championnats d'Océanie de BMX Racing", type: 'Championnat continental', niveau: 'International',
    ville: 'Brisbane', pays: 'AUS', piste: 'Sleeman BMX', debut: '2026-02-21', fin: '2026-02-22',
    organisateur: 'Oceania Cycling',
    description: "Jesse Asmus gagne chez les hommes, la Néo-Zélandaise Leila Walker garde son titre chez les femmes.",
    resultats: {
      'Elite Hommes': [[1, 'Jesse Asmus', 'AUS'], [2, 'Izaac Kennedy', 'AUS'], [3, 'Oliver Moran', 'AUS']],
      'Elite Femmes': [[1, 'Leila Walker', 'NZL'], [2, 'Megan Williams', 'NZL'], [3, 'Sienna Pal', 'AUS']],
    },
    sources: [
      { nom: 'Oceania Cycling – Asmus et Walker titrés', url: 'https://oceaniacycling.org/jesse-asmus-and-leila-walker-claim-2026-oceania-bmx-titles/' },
      { nom: 'Cycling New Zealand', url: 'https://www.cyclingnewzealand.nz/blog/post/160758/walker-edges-fellow-kiwi-to-defend-oceania-bmx-racing-title-in-brisbane' },
    ],
  },
  {
    id: 'asie-2026-nilai', nom: "Championnats d'Asie de BMX Racing", type: 'Championnat continental', niveau: 'International',
    ville: 'Nilai', pays: 'MAS', piste: null, debut: '2026-08-06', fin: '2026-08-08',
    organisateur: 'Asian Cycling Confederation',
    description: "Championnats continentaux d'Asie, en Malaisie.",
    resultats: {},
    sources: [{ nom: 'RRI – Asian BMX Racing 2026', url: 'https://rri.co.id/en/sport/2637373/indonesia-earns-gold-and-bronze-at-asian-bmx-racing-2026' }],
  },

  // ------------------------------------------------------------------ Coupe d'Europe UEC
  ...[
    ['verone', 'Manches 1 et 2', 'Vérone', 'ITA', null, '2026-03-12', '2026-03-15'],
    ['tiel', 'Manches 3 et 4', 'Tiel', 'NED', null, '2026-04-03', '2026-04-06'],
    ['benatky', 'Manches 5 et 6', 'Benátky nad Jizerou', 'CZE', null, '2026-04-24', '2026-04-26'],
    ['la-chapelle', 'Manches 7 et 8', 'La Chapelle-Saint-Mesmin', 'FRA', null, '2026-05-14', '2026-05-17'],
    ['sviland', 'Manches 9 et 10', 'Sviland', 'NOR', null, '2026-09-04', '2026-09-06'],
    ['zolder', 'Manches 11 et 12', 'Heusden-Zolder', 'BEL', 'Lotto BMX-track (circuit de Zolder)', '2026-09-25', '2026-09-27'],
  ].map(([cle, manches, ville, pays, piste, debut, fin]) => ({
    id: `uec-coupe-2026-${cle}`, nom: `${COUPE_EUROPE} – ${manches}`, type: COUPE_EUROPE, niveau: 'International',
    ville, pays, piste, debut, fin, organisateur: 'UEC (Union Européenne de Cyclisme)',
    description: "Une étape de la Coupe d'Europe de BMX Racing : 6 week-ends et 12 manches dans la saison 2026.",
    resultats: {},
    sources: [{ nom: 'UEC – programme 2026 de la Coupe d’Europe', url: UEC_PROGRAMME }],
  })),

  // ------------------------------------------------------------------ France
  {
    id: 'ffc-france-2026-besancon', nom: 'Championnats de France de BMX Racing', type: 'Championnat de France', niveau: 'National',
    ville: 'Besançon', pays: 'FRA', piste: 'Piste du Rosemont (complexe sportif du Rosemont)', debut: '2026-07-03', fin: '2026-07-05',
    organisateur: 'FFC (Fédération Française de Cyclisme)',
    description: "Plus de 1 200 pilotes attendus pour les championnats de France et le Challenge national. Romain Mayet et Axelle Étienne sont champions de France Elite.",
    resultats: {
      'Elite Hommes': [[1, 'Romain Mayet', 'FRA']],
      'Elite Femmes': [[1, 'Axelle Étienne', 'FRA']],
    },
    sources: [
      { nom: 'info.fr – Étienne et Mayet sacrés', url: 'https://info.fr/bmx-championnats-france-2026-besancon-etienne-mayet/' },
      { nom: 'macommune.info – piste du Rosemont', url: 'https://www.macommune.info/plus-de-1-200-pilotes-attendus-au-rosemont-pour-les-championnats-de-france-de-bmx/' },
    ],
  },
  ...[
    ['machecoul', 'Machecoul', '2026-03-28', '2026-03-29'],
    ['vesoul', 'Vesoul', '2026-04-18', '2026-04-19'],
    ['la-chapelle', 'La Chapelle-Saint-Mesmin', '2026-05-09', '2026-05-10'],
    ['troyes', 'Troyes', '2026-09-19', '2026-09-20'],
  ].map(([cle, ville, debut, fin], i) => ({
    id: `ffc-coupe-2026-${cle}`, nom: `${COUPE_FRANCE} – Manches ${2 * i + 1} et ${2 * i + 2}`, type: COUPE_FRANCE, niveau: 'National',
    ville, pays: 'FRA', piste: null, debut, fin, organisateur: 'FFC (Fédération Française de Cyclisme)',
    description: 'Une étape de la Coupe de France de BMX Racing : 8 manches sur 4 week-ends en 2026.',
    resultats: {},
    sources: [{ nom: 'FFC – note aux clubs BMX Racing 2026', url: FFC_NOTE }],
  })),
  {
    id: 'ffc-trophee-2026-chabeuil', nom: 'Trophée de France de BMX (jeunes)', type: 'Trophée de France', niveau: 'National',
    ville: 'Chabeuil', pays: 'FRA', piste: null, debut: '2026-06-20', fin: '2026-06-21',
    organisateur: 'FFC (Fédération Française de Cyclisme)',
    description: 'Le grand rendez-vous national des jeunes pilotes.',
    resultats: {},
    sources: [{ nom: 'FFC – note aux clubs BMX Racing 2026', url: FFC_NOTE }],
  },

  // ------------------------------------------------------------------ Slovaquie
  ...[
    ['kosice', 'Manches 1 et 2', 'Košice', 'SVK', 'BMX dráha Furča', '2026-05-30', '2026-05-31', ''],
    ['liptovsky-mikulas', 'Manches 3 et 4', 'Liptovský Mikuláš', 'SVK', 'BMX dráha BMX TEAM LIPTOV', '2026-06-06', '2026-06-07', ''],
    ['bratislava', 'Manche 5 et championnats de Slovaquie', 'Bratislava-Rača', 'SVK', 'BMX dráha BMX klub Rača', '2026-07-04', '2026-07-05', ' 110 pilotes de 18 clubs.'],
    ['brno', 'Manches 6 et 7', 'Brno', 'CZE', null, '2026-09-12', '2026-09-13', ' Une étape courue en Tchéquie.'],
    ['dunajska-luzna', 'Manches 8 et 9', 'Dunajská Lužná', 'SVK', 'BMX dráha Dunajská Lužná (Bike centrum HENKY Riders)', '2026-10-03', '2026-10-04', ''],
  ].map(([cle, manches, ville, pays, piste, debut, fin, plus]) => ({
    id: `svk-pohar-2026-${cle}`, nom: `Coupe de Slovaquie – ${manches}`, type: 'Coupe de Slovaquie (Slovenský pohár)', niveau: 'National',
    ville, pays, piste, debut, fin, organisateur: 'Slovenský zväz cyklistiky (fédération slovaque)',
    description: `Une étape de la Coupe de Slovaquie de BMX Racing 2026.${plus}`,
    resultats: {},
    sources: [{ nom: 'BMX Klub Košický šarkaň – saison 2026', url: 'https://www.kosickysarkan.sk/sezona' }, { nom: 'BMX klub Rača', url: 'https://bmx-raca.sk/new/' }],
  })),

  // ------------------------------------------------------------------ Autres pays
  {
    id: 'usa-elite-2026-rock-hill', nom: 'Championnats des États-Unis Elite', type: 'Championnat national', niveau: 'National',
    ville: 'Rock Hill (Caroline du Sud)', pays: 'USA', piste: null, debut: '2026-03-27', fin: '2026-03-27',
    organisateur: 'USA Cycling',
    description: 'Kamren Larsen et Payton Ridenour remportent les titres nationaux Elite.',
    resultats: {
      'Elite Hommes': [[1, 'Kamren Larsen', 'USA']],
      'Elite Femmes': [[1, 'Payton Ridenour', 'USA']],
    },
    sources: [{ nom: 'USA Cycling – Larsen et Ridenour champions', url: 'https://usacycling.org/article/team-usa-recap-bmx-race-freestyle-nationals-titles-for-larsen-ridenour-dowell-and-roberts-faulkner-wins-pan-am-time-trial-gold-18-medals-at-uci-para-road-world-cup' }],
  },
];

// Pays qui ne sont pas dans la liste des données d'exemple
export const PAYS_EN_PLUS = {
  CZE: { nom: 'Tchéquie', drapeau: '🇨🇿' },
  NOR: { nom: 'Norvège', drapeau: '🇳🇴' },
  MAS: { nom: 'Malaisie', drapeau: '🇲🇾' },
  CHN: { nom: 'Chine', drapeau: '🇨🇳' },
  SVK: { nom: 'Slovaquie', drapeau: '🇸🇰' },
};
