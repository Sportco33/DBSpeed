// DBSpeed — VRAIS pilotes Elite de BMX Racing (hommes et femmes), saison 2026.
// Recherchés le 01/10/2026 (UCI, UEC, fédérations, Comités olympiques, Wikipedia, presse).
// Chaque pilote donne ses sources. On n'écrit que ce qu'une source dit : sinon null.
//
// Ce qu'on n'a PAS : le classement mondial UCI (site dataride.uci.ch fermé aux robots).
// Il faudra le recopier à la main depuis https://dataride.uci.ch (BMX Racing → Ranking).
//
// plaque = numéro porté aux Mondiaux 2026 (feuilles de temps Tissot) ; « P… » = plaque permanente.
// Champs : naissance = 'AAAA-MM-JJ' ou null ; age2026 = âge donné par une source quand la date
// est inconnue ; palmares = grands titres de carrière ; saison2026 = résultats de 2026.

export const MISE_A_JOUR_PILOTES = '2026-10-01';

// Coupe du monde 2026 après 4 manches sur 10 (prochaines : Pékin 3-4 oct., Chongli 10-11 oct.,
// Sarasota 31 oct.-1er nov.). Seul chiffre publié : le leader Hommes.
export const COUPE_DU_MONDE_2026 = {
  manchesCourues: 4,
  leaderHommes: { nom: 'Jaymio Brink', pays: 'NED', points: 1407 },
  leaderFemmes: null,
  source: 'https://www.lalibre.be/dernieres-depeches/2026/06/14/coupe-du-monde-de-bmx-les-belges-ne-vont-pas-au-dela-des-huitiemes-de-finale-a-papendal-5GADJ2DRJJBUPMI4BAWZZ7DF5U/',
};

// Coupe du monde 2025, classement final (dernier classement complet publié)
export const COUPE_DU_MONDE_2025 = {
  hommes: [[1, 'Arthur Pilard', 'FRA', 2358]],
  femmes: [[1, 'Saya Sakakibara', 'AUS', 2563], [2, 'Laura Smulders', 'NED', 2026], [3, 'Molly Simpson', 'CAN', 1881], [4, 'Zoé Claessens', 'SUI', 1859], [5, 'Bethany Shriever', 'GBR', 1777]],
  source: 'https://www.uci.org/article/2025-uci-bmx-racing-world-cup-sakakibara-and-pilard-claim-overall-titles-in/5iTonAkRQhfB4dshttJ1bV',
};

const UCI_MONDIAUX_2026 = 'https://www.uci.org/article/2026-uci-bmx-racing-world-championships-titles-decided-after-extreme-weather-forces-cancellation-of-finals/7mshNMaLP8kyCY8NRDcj92';
const UCI_SARRIANS = 'https://www.uci.org/article/uci-bmx-racing-world-cup-seasoned-champions-and-new-talents-mark-season-opener/5W3QLmiOgaLkj0Gf7KbfPG';
const UCI_PAPENDAL = 'https://www.uci.org/article/uci-bmx-racing-world-cup-double-victory-for-the-swiss-aeberhard-in-papendal/5bQeNcCGBGR7UNjYGPY49r';
const UEC_EUROPE_2026 = 'https://www.uec.ch/en/actu/381/eurobmx26-sarrians-crowns-ragot-richard-and-smulders';
const wiki = (page) => `https://en.wikipedia.org/wiki/${page}`;

export const PILOTES_ELITE_HOMMES = [
  {
    id: 'asmus-jesse', prenom: 'Jesse', nom: 'Asmus', pays: 'AUS', plaque: '223', naissance: null, age2026: 23,
    ville: 'Gold Coast', club: 'Nerang BMX', equipe: null,
    palmares: ["Champion d'Océanie U23 2023", '4e des Mondiaux U23 2025'],
    saison2026: ['Champion du monde Elite (Brisbane, 33.386)', "Champion d'Océanie Elite", "Champion d'Australie Elite"],
    sources: [UCI_MONDIAUX_2026, 'https://oceaniacycling.org/jesse-asmus-and-leila-walker-claim-2026-oceania-bmx-titles/', 'https://auscycling.org.au/people/jesse-asmus'],
  },
  {
    id: 'cullen-ross', prenom: 'Ross', nom: 'Cullen', pays: 'GBR', plaque: 'P22', naissance: '2001-03-28', age2026: null,
    ville: 'Preston', club: 'Preston Pirates BMX', equipe: null,
    palmares: ["Champion d'Europe junior 2019", 'Victoire en Coupe du monde (Papendal 2025)'],
    saison2026: ['Vice-champion du monde Elite (33.695)'],
    sources: [UCI_MONDIAUX_2026, 'https://cloud.britishcycling.org.uk/gbcyclingteam/bio/Ross_Cullen', wiki('Ross_Cullen_(cyclist)')],
  },
  {
    id: 'ragot-richard-mathis', prenom: 'Mathis', nom: 'Ragot Richard', pays: 'FRA', plaque: 'P5', naissance: '1998-05-03', age2026: null,
    ville: 'Besançon', club: 'BMX Besançon', equipe: null,
    palmares: ["Champion d'Europe Elite 2025", "Vice-champion d'Europe 2024", 'Champion du monde junior contre-la-montre 2016'],
    saison2026: ['Vainqueur Coupe de France manche 8 (Troyes)', "Champion d'Europe Elite (Sarrians)", 'Bronze aux Mondiaux (33.796)'],
    sources: [UCI_MONDIAUX_2026, UEC_EUROPE_2026, wiki('Mathis_Ragot_Richard'), 'https://velo.ffc.fr/app/uploads/sites/3/2026/09/Selection-France-BMX-Race-MENTOUGOU-Chine.pdf', 'https://erabmx.com/news/race-report-coupe-de-france-troyes/'],
  },
  {
    id: 'brink-jaymio', prenom: 'Jaymio', nom: 'Brink', pays: 'NED', plaque: 'P31', naissance: '2004-05-09', age2026: null,
    ville: 'Arnhem', club: null, equipe: null,
    palmares: ['Jeux olympiques Paris 2024', 'Vice-champion du monde junior 2022'],
    saison2026: ['1re victoire en Coupe du monde (Sarrians, manche 1)', '2e aux manches 3 et 4 (Papendal)', 'Leader de la Coupe du monde après 4 manches'],
    sources: [UCI_SARRIANS, UCI_PAPENDAL, wiki('Jaymio_Brink')],
  },
  {
    id: 'arboleda-diego', prenom: 'Diego', nom: 'Arboleda Ospina', pays: 'COL', plaque: 'P741', naissance: '1996-08-16', age2026: null,
    ville: 'Girardota (Antioquia)', club: null, equipe: null,
    palmares: ['Champion panaméricain 2021, 2022, 2024, 2025', '3e de la Coupe du monde 2023', 'Premier Colombien n°1 mondial (2022)'],
    saison2026: ['Champion panaméricain', 'Vainqueur Coupe du monde manche 2 (Sarrians, 31.310)', '2e manche 1'],
    sources: [UCI_SARRIANS, wiki('Diego_Arboleda'), 'https://www.vanguardia.com/deportes/2026/06/07/colombia-celebra-en-francia-diego-arboleda-conquisto-la-copa-mundo-de-bmx/'],
  },
  {
    id: 'aeberhard-loris', prenom: 'Loris', nom: 'Aeberhard', pays: 'SUI', plaque: 'P99', naissance: null, age2026: 27,
    ville: 'Rapperswil (Berne)', club: null, equipe: null,
    palmares: [],
    saison2026: ['Vainqueur Coupe du monde manches 3 et 4 (Papendal)', "8e des championnats d'Europe"],
    sources: [UCI_PAPENDAL, 'https://www.bluewin.ch/en/sport/loris-aeberhard-strikes-again-li.3278673'],
  },
  {
    id: 'clerte-eddy', prenom: 'Eddy', nom: 'Clerté', pays: 'FRA', plaque: 'P3', naissance: null, age2026: null,
    ville: 'Gujan-Mestras', club: 'Stade Bordelais BMX', equipe: 'SUNN',
    palmares: ['Bronze aux Mondiaux Elite 2025', 'Champion du monde de pump track'],
    saison2026: ['2e Coupe du monde manche 2', '3e manche 4'],
    sources: [UCI_SARRIANS, UCI_PAPENDAL, wiki('2025_UCI_BMX_World_Championships'), 'https://velo.ffc.fr/app/uploads/sites/3/2026/09/Selection-France-BMX-Race-MENTOUGOU-Chine.pdf'],
  },
  {
    id: 'wood-cameron', prenom: 'Cameron', nom: 'Wood', pays: 'USA', plaque: 'P12', naissance: '2001-11-16', age2026: null,
    ville: 'Bozeman (Montana)', club: null, equipe: 'Mongoose / USA BMX Foundation',
    palmares: ['5e aux JO Paris 2024', 'Argent aux Jeux panaméricains 2023', '2e Coupe du monde 2022, 3e en 2025', 'Champion des États-Unis Elite 2025'],
    saison2026: ['3e Coupe du monde manches 2 et 3', 'Quart de finale aux Mondiaux'],
    sources: ['https://usacycling.org/athlete/cameron-wood', wiki('Cameron_Wood_(cyclist)'), UCI_PAPENDAL],
  },
  {
    id: 'andre-sylvain', prenom: 'Sylvain', nom: 'André', pays: 'FRA', plaque: null, naissance: '1992-10-14', age2026: null,
    ville: 'Cavaillon', club: 'BMX Club Cavaillon', equipe: null,
    palmares: ['Argent olympique Paris 2024', 'Champion du monde 2018', 'Coupe du monde 2017 et 2022'],
    saison2026: ['3e Coupe du monde manche 1', 'Blessé, absent des Mondiaux'],
    sources: [UCI_SARRIANS, wiki('Sylvain_Andr%C3%A9'), 'https://velo.ffc.fr/app/uploads/sites/3/2026/09/Selection-France-BMX-Race-MENTOUGOU-Chine.pdf'],
  },
  {
    id: 'daudet-joris', prenom: 'Joris', nom: 'Daudet', pays: 'FRA', plaque: null, naissance: '1991-02-12', age2026: null,
    ville: 'Saintes', club: 'Stade Bordelais BMX', equipe: null,
    palmares: ['Champion olympique Paris 2024', 'Champion du monde 2011, 2015, 2016, 2024', "Champion d'Europe 2011 et 2017"],
    saison2026: ['Éliminé en 1/8 aux Mondiaux (blessé avant)'],
    sources: [wiki('Joris_Daudet'), 'https://velo.ffc.fr/app/uploads/sites/3/2026/09/Selection-France-BMX-Race-MENTOUGOU-Chine.pdf'],
  },
  {
    id: 'pilard-arthur', prenom: 'Arthur', nom: 'Pilard', pays: 'FRA', plaque: null, naissance: '1996-01-22', age2026: null,
    ville: 'Vannes', club: 'Saint-Brieuc BMX', equipe: null,
    palmares: ['Champion du monde 2025', 'Coupe du monde 2025 (2 358 pts)', "Champion d'Europe 2021 et 2024"],
    saison2026: ['Vainqueur Coupe de France manche 2 (Machecoul)', '2e du classement final de la Coupe de France', 'Blessé, absent des Mondiaux'],
    sources: [wiki('Arthur_Pilard'), COUPE_DU_MONDE_2025.source, 'https://velo.ffc.fr/app/uploads/sites/3/2026/09/Selection-France-BMX-Race-MENTOUGOU-Chine.pdf', 'https://erabmx.com/news/race-report-coupe-de-france-troyes/'],
  },
  {
    id: 'mahieu-romain', prenom: 'Romain', nom: 'Mahieu', pays: 'FRA', plaque: 'P100', naissance: '1995-02-17', age2026: null,
    ville: 'Lille', club: 'BMX Club Sarrians', equipe: null,
    palmares: ['Bronze olympique Paris 2024', 'Champion du monde 2023', 'Coupe du monde 2023'],
    saison2026: ['Équipe de France aux Mondiaux'],
    sources: [wiki('Romain_Mahieu'), 'https://velo.ffc.fr/app/uploads/sites/3/2026/09/Selection-France-BMX-Race-MENTOUGOU-Chine.pdf'],
  },
  {
    id: 'kennedy-izaac', prenom: 'Izaac', nom: 'Kennedy', pays: 'AUS', plaque: null, naissance: '2000-10-24', age2026: null,
    ville: 'Gold Coast', club: 'Nerang BMX', equipe: null,
    palmares: ['Vice-champion du monde 2025', 'Coupe du monde 2024', '8e aux JO Paris 2024'],
    saison2026: ["2e des championnats d'Océanie", "Forfait aux Mondiaux (chute à l'entraînement)"],
    sources: [wiki('Izaac_Kennedy'), 'https://www.olympics.com.au/olympians/izaac-kennedy-0'],
  },
  {
    id: 'larsen-kamren', prenom: 'Kamren', nom: 'Larsen', pays: 'USA', plaque: 'P15', naissance: '1999-10-28', age2026: null,
    ville: 'Bakersfield', club: null, equipe: 'Factory SSquared / Answer',
    palmares: ['Champion des Jeux panaméricains 2023', 'JO Paris 2024'],
    saison2026: ['Champion des États-Unis Elite', '1/8 de finale aux Mondiaux'],
    sources: [wiki('Kamren_Larsen'), 'https://usacycling.org/article/twelve-riders-advance-after-opening-rounds-at-the-2026-uci-bmx-racing-world-championships'],
  },
  {
    id: 'mayet-romain', prenom: 'Romain', nom: 'Mayet', pays: 'FRA', plaque: '219', naissance: null, age2026: 33,
    ville: null, club: 'Lempdes BMX Auvergne', equipe: 'SPAD BMX (sa marque)',
    palmares: ['Vice-champion de France 2023'],
    saison2026: ['Champion de France Elite (Besançon)'],
    sources: ['https://www.fatbmx.com/bmx-racing/item/50688-bike-check-mayet-romain-from-france', 'https://info.fr/bmx-championnats-france-2026-besancon-etienne-mayet/', 'https://velo.ffc.fr/app/uploads/sites/3/2026/09/Selection-France-BMX-Race-MENTOUGOU-Chine.pdf'],
  },
  {
    id: 'rencurel-jeremy', prenom: 'Jérémy', nom: 'Rencurel', pays: 'FRA', plaque: null, naissance: '1995-04-13', age2026: null,
    ville: 'Beaumont-sur-Oise', club: null, equipe: null,
    palmares: ['JO Rio 2016', "Vice-champion d'Europe 2023", '5e des Mondiaux 2023'],
    saison2026: ['3e Coupe de France manche 8 (Troyes)', "Vice-champion d'Europe"],
    sources: [UEC_EUROPE_2026, wiki('J%C3%A9r%C3%A9my_Rencurel'), 'https://erabmx.com/news/race-report-coupe-de-france-troyes/'],
  },
  {
    id: 'garoyan-leo', prenom: 'Léo', nom: 'Garoyan', pays: 'FRA', plaque: '218', naissance: null, age2026: null,
    ville: null, club: 'BMX Club Sarrians', equipe: null,
    palmares: ['Champion du monde U23 2022', 'Champion du monde junior 2018'],
    saison2026: ["3e des championnats d'Europe"],
    sources: [UEC_EUROPE_2026, 'https://fr.wikipedia.org/wiki/L%C3%A9o_Garoyan', 'https://velo.ffc.fr/app/uploads/sites/3/2026/09/Selection-France-BMX-Race-MENTOUGOU-Chine.pdf'],
  },
  {
    id: 'carmona-mateo', prenom: 'Mateo', nom: 'Carmona', pays: 'COL', plaque: 'P70', naissance: '2001-12-23', age2026: null,
    ville: 'Antioquia', club: null, equipe: null,
    palmares: ['Demi-finale aux JO Paris 2024'],
    saison2026: ['Bronze aux championnats panaméricains'],
    sources: [wiki('Mateo_Carmona')],
  },
  {
    id: 'ramirez-carlos', prenom: 'Carlos', nom: 'Ramírez', pays: 'COL', plaque: null, naissance: '1994-03-12', age2026: null,
    ville: 'Medellín', club: null, equipe: null,
    palmares: ['Bronze olympique 2016 et 2020', 'Champion du monde junior 2012'],
    saison2026: ['Argent aux championnats panaméricains'],
    sources: [wiki('Carlos_Ram%C3%ADrez_(BMX_rider)')],
  },
  {
    id: 'goossens-tim', prenom: 'Tim', nom: 'Goossens', pays: 'NED', plaque: '216', naissance: null, age2026: null,
    ville: null, club: null, equipe: null,
    palmares: [],
    saison2026: ['4e Coupe du monde manche 3 (à 0,003 s du podium)'],
    sources: [UCI_PAPENDAL],
  },
];

export const PILOTES_ELITE_FEMMES = [
  {
    id: 'shriever-bethany', prenom: 'Bethany', nom: 'Shriever', pays: 'GBR', plaque: 'P911', naissance: '1999-04-19', age2026: null,
    ville: 'Braintree (Essex)', club: null, equipe: null,
    palmares: ['Championne olympique Tokyo 2020', 'Championne du monde 2021, 2023, 2025, 2026 (record : 4 titres)', "Championne d'Europe 2022 et 2025"],
    saison2026: ['Championne du monde (meilleur temps des qualifs)', 'Vainqueure Coupe du monde manche 4 (33.839)', '3e manche 3'],
    sources: [UCI_MONDIAUX_2026, UCI_PAPENDAL, wiki('Bethany_Shriever'), 'https://www.teamgb.com/article/bethany-shriever-makes-history-with-historic-fourth-world-title/2QfLZ9UIplILpMgqSnusY4'],
  },
  {
    id: 'sakakibara-saya', prenom: 'Saya', nom: 'Sakakibara', pays: 'AUS', plaque: 'P77', naissance: '1999-08-23', age2026: null,
    ville: 'Gold Coast', club: 'Southlake Illawarra BMX', equipe: null,
    palmares: ['Championne olympique Paris 2024', 'Coupe du monde 2023, 2024, 2025', 'Vice-championne du monde 2025'],
    saison2026: ['Vice-championne du monde', "Championne d'Australie (36.143)", 'Coupe du monde : 3e, 1re, 2e'],
    sources: [UCI_MONDIAUX_2026, wiki('Saya_Sakakibara'), 'https://www.nswis.com.au/nswis-news/saya-sakakibara-scores-first-world-cup-win-of-2026-in-sarrians/'],
  },
  {
    id: 'smulders-laura', prenom: 'Laura', nom: 'Smulders', pays: 'NED', plaque: 'P110', naissance: '1993-12-09', age2026: null,
    ville: 'Nimègue', club: 'FCV Wycross (Wijchen)', equipe: null,
    palmares: ['Bronze olympique Londres 2012', 'Championne du monde 2018', 'Coupe du monde 2016, 2017, 2018, 2019, 2022', "Championne d'Europe 2014, 2017, 2018, 2019"],
    saison2026: ["Championne d'Europe", 'Bronze aux Mondiaux', 'Vainqueure Coupe du monde manche 3 (34.247)'],
    sources: [UCI_MONDIAUX_2026, UEC_EUROPE_2026, UCI_PAPENDAL, wiki('Laura_Smulders'), 'https://www.olympedia.org/athletes/121888'],
  },
  {
    id: 'simpson-molly', prenom: 'Molly', nom: 'Simpson', pays: 'CAN', plaque: 'P44', naissance: '2002-12-11', age2026: null,
    ville: 'Red Deer (Alberta)', club: null, equipe: null,
    palmares: ['JO Paris 2024', 'Argent aux Jeux panaméricains 2023', '3e Coupe du monde 2025'],
    saison2026: ['Sur le podium des 4 manches de Coupe du monde : 1re, 2e, 2e, 3e'],
    sources: [UCI_SARRIANS, UCI_PAPENDAL, wiki('Molly_Simpson'), 'https://olympic.ca/2026/06/13/molly-simpson-rides-to-third-straight-bmx-racing-world-cup-podium'],
  },
  {
    id: 'claessens-zoe', prenom: 'Zoé', nom: 'Claessens', pays: 'SUI', plaque: 'P65', naissance: '2001-04-28', age2026: null,
    ville: 'Echichens (Vaud)', club: null, equipe: null,
    palmares: ['Bronze olympique Paris 2024', 'Vice-championne du monde 2022 et 2024', "Championne d'Europe 2021, 2023, 2024"],
    saison2026: ["Vice-championne d'Europe", '4e aux Mondiaux'],
    sources: [UEC_EUROPE_2026, wiki('Zo%C3%A9_Claessens'), 'https://www.bluewin.ch/en/sport/claessens-finishes-fourth-in-brisbane-li.3534130'],
  },
  {
    id: 'kejlstrup-malene', prenom: 'Malene', nom: 'Kejlstrup', pays: 'DEN', plaque: 'P75', naissance: '2002-06-06', age2026: null,
    ville: 'Randers', club: null, equipe: null,
    palmares: ['Championne du monde U23 2022', "Vice-championne d'Europe Elite 2023", 'JO Paris 2024'],
    saison2026: ['2e Coupe du monde manche 1'],
    sources: [UCI_SARRIANS, wiki('Malene_Kejlstrup')],
  },
  {
    id: 'wissing-michelle', prenom: 'Michelle', nom: 'Wissing', pays: 'NED', plaque: 'P27', naissance: null, age2026: null,
    ville: null, club: null, equipe: null,
    palmares: ['Coupe du monde U23 2025'],
    saison2026: ['3e Coupe du monde manche 2 (1er podium Elite)'],
    sources: [UCI_SARRIANS],
  },
  {
    id: 'etienne-axelle', prenom: 'Axelle', nom: 'Étienne', pays: 'FRA', plaque: 'P8', naissance: '1998-03-26', age2026: null,
    ville: 'Vaujours', club: 'Lempdes BMX Auvergne', equipe: null,
    palmares: ['Finale aux JO Tokyo 2020', 'Bronze aux Mondiaux 2019', 'Double championne du monde junior 2015'],
    saison2026: ['2e Coupe de France manche 2 (Machecoul)', "Bronze aux championnats d'Europe", 'Championne de France Elite'],
    sources: [UEC_EUROPE_2026, wiki('Axelle_%C3%89tienne'), 'https://info.fr/bmx-championnats-france-2026-besancon-etienne-mayet/', 'https://velo.ffc.fr/app/uploads/sites/3/2026/09/Selection-France-BMX-Race-MENTOUGOU-Chine.pdf'],
  },
  {
    id: 'aeberhard-nadine', prenom: 'Nadine', nom: 'Aeberhard', pays: 'SUI', plaque: 'P94', naissance: '2002-05-28', age2026: null,
    ville: 'Canton de Berne', club: null, equipe: null,
    palmares: ["Bronze aux championnats d'Europe 2024", 'Vice-championne du monde U23 2022', 'JO Paris 2024'],
    saison2026: ['7e aux Mondiaux', "7e des championnats d'Europe", '4e Coupe du monde manche 4'],
    sources: [wiki('Nadine_Aeberhard'), 'https://www.bluewin.ch/en/sport/claessens-finishes-fourth-in-brisbane-li.3534130'],
  },
  {
    id: 'reynolds-lauren', prenom: 'Lauren', nom: 'Reynolds', pays: 'AUS', plaque: 'P21', naissance: '1991-06-25', age2026: null,
    ville: 'Bunbury', club: 'Bunbury BMX', equipe: null,
    palmares: ['Vice-championne du monde 2013', '5e aux JO Tokyo 2020'],
    saison2026: ['5e Coupe du monde manche 4', 'Journée des finales aux Mondiaux'],
    sources: [wiki('Lauren_Reynolds'), UCI_PAPENDAL],
  },
  {
    id: 'rufus-teya', prenom: 'Teya', nom: 'Rufus', pays: 'AUS', plaque: 'P5', naissance: null, age2026: null,
    ville: 'Queensland', club: 'Maryborough BMX', equipe: null,
    palmares: ['Championne du monde junior 2024', '5e des Mondiaux Elite 2025'],
    saison2026: ['8e Coupe du monde manche 4', 'Journée des finales aux Mondiaux'],
    sources: ['https://auscycling.org.au/athletes/teya-rufus', UCI_PAPENDAL],
  },
  {
    id: 'pal-sienna', prenom: 'Sienna', nom: 'Pal', pays: 'AUS', plaque: 'P66', naissance: null, age2026: null,
    ville: 'Nouvelle-Galles du Sud', club: 'Terrigal BMX', equipe: null,
    palmares: ["Championne d'Australie Elite 2024", 'Vice-championne du monde junior 2023'],
    saison2026: ["Vice-championne d'Australie", "3e des championnats d'Océanie"],
    sources: ['https://auscycling.org.au/athletes/sienna-pal', 'https://oceaniacycling.org/jesse-asmus-and-leila-walker-claim-2026-oceania-bmx-titles/'],
  },
  {
    id: 'walker-leila', prenom: 'Leila', nom: 'Walker', pays: 'NZL', plaque: 'P150', naissance: '2005-03-29', age2026: null,
    ville: 'Cambridge', club: 'Cambridge BMX', equipe: null,
    palmares: ["Championne d'Océanie 2025", '7e des Mondiaux 2024', 'JO Paris 2024'],
    saison2026: ["Championne d'Océanie"],
    sources: [wiki('Leila_Walker'), 'https://oceaniacycling.org/jesse-asmus-and-leila-walker-claim-2026-oceania-bmx-titles/'],
  },
  {
    id: 'ridenour-payton', prenom: 'Payton', nom: 'Ridenour', pays: 'USA', plaque: null, naissance: '2002-05-29', age2026: null,
    ville: null, club: null, equipe: 'Chase / BRGStore.com / Tioga',
    palmares: ['JO Tokyo 2020', '7 titres nationaux'],
    saison2026: ['Championne des États-Unis Elite'],
    sources: [wiki('Payton_Ridenour'), 'https://usacycling.org/article/kamren-larsen-and-payton-ridenour-win-2026-elite-bmx-national-championships'],
  },
  {
    id: 'vaughn-daleny', prenom: 'Daleny', nom: 'Vaughn', pays: 'USA', plaque: 'P31', naissance: '2001-03-27', age2026: null,
    ville: 'Tucson (Arizona)', club: null, equipe: 'Biolab Sciences / DK Bicycles',
    palmares: ['Bronze aux Mondiaux 2024', 'JO Paris 2024'],
    saison2026: ['Mondiaux (équipe des États-Unis)'],
    sources: [wiki('Daleny_Vaughn'), 'https://usacycling.org/article/usa-cycling-announces-team-for-2026-uci-bmx-racing-world-championships'],
  },
  {
    id: 'munoz-valentina', prenom: 'Valentina', nom: 'Muñoz', pays: 'COL', plaque: '206', naissance: null, age2026: null,
    ville: 'Antioquia', club: null, equipe: null,
    palmares: ['Championne de Colombie Elite 2023'],
    saison2026: ["Or aux Jeux d'Amérique centrale et des Caraïbes (40.859)", 'Mondiaux (équipe de Colombie)'],
    sources: ['https://www.elespectador.com/deportes/mas-deportes/colombia-no-baja-el-ritmo-en-los-centroamericanos-arraso-en-el-bmx-y-brillo-en-el-patinaje-asi-va-el-medallero-de-los-centroamericanos/'],
  },
  {
    id: 'bolle-gabriela', prenom: 'Gabriela', nom: 'Bolle', pays: 'COL', plaque: null, naissance: '2000-12-14', age2026: null,
    ville: 'Florencia', club: null, equipe: null,
    palmares: ['Bronze aux Jeux panaméricains 2023', 'JO Paris 2024'],
    saison2026: ['Argent aux championnats panaméricains'],
    sources: [wiki('Gabriela_Bolle')],
  },
  {
    id: 'veenstra-manon', prenom: 'Manon', nom: 'Veenstra', pays: 'NED', plaque: null, naissance: '1998-07-06', age2026: null,
    ville: 'Zwolle', club: null, equipe: null,
    palmares: ['Argent olympique Paris 2024'],
    saison2026: [],
    sources: [wiki('Manon_Veenstra')],
  },
];

// Mondiaux 2026 (Brisbane) : finales annulées (vent). Classement de la dernière manche courue :
// d'abord la place dans la série, puis le temps. CALCULÉ par DBSpeed depuis les feuilles Tissot ;
// il redonne toutes les places publiées (podiums, Claessens 4e, N. Aeberhard 7e, places des pilotes USA).
// [place, 'Nom', 'PAYS', 'plaque', temps]
export const MONDIAUX_2026 = {
  calcule: true,
  hommes: [
    [1, 'Jesse Asmus', 'AUS', '223', 33.386], [2, 'Ross Cullen', 'GBR', 'P22', 33.695], [3, 'Mathis Ragot Richard', 'FRA', 'P5', 33.796],
    [4, 'Eddy Clerté', 'FRA', 'P3', 34.097], [5, 'Bearman', 'NZL', 'P44', 34.107], [6, 'Romain Mahieu', 'FRA', 'P100', 34.275],
    [7, 'Mateo Carmona', 'COL', 'P70', 34.068], [8, 'Léo Garoyan', 'FRA', '218', 34.242], [9, 'Diego Arboleda Ospina', 'COL', 'P741', 34.285],
    [10, 'Cameron Wood', 'USA', 'P12', 34.312], [11, 'Nakai', 'JPN', '224', 34.348], [12, 'Whyte', 'GBR', 'P87', 34.734],
    [13, 'Kamren Larsen', 'USA', 'P15', 34.423], [14, 'Loris Aeberhard', 'SUI', 'P99', 34.427], [15, 'Villegas', 'ARG', 'P194', 34.576],
    [16, 'Jaymio Brink', 'NED', 'P31', 34.67],
  ],
  femmes: [
    [1, 'Bethany Shriever', 'GBR', 'P911', 36.585], [2, 'Saya Sakakibara', 'AUS', 'P77', 36.908], [3, 'Laura Smulders', 'NED', 'P110', 37.03],
    [4, 'Zoé Claessens', 'SUI', 'P65', 37.275], [5, 'Molly Simpson', 'CAN', 'P44', 37.593], [6, 'Lauren Reynolds', 'AUS', 'P21', 37.285],
    [7, 'Nadine Aeberhard', 'SUI', 'P94', 37.848], [8, 'Daleny Vaughn', 'USA', 'P31', 37.93], [9, 'Axelle Étienne', 'FRA', 'P8', 38.292],
    [10, 'Sienna Pal', 'AUS', 'P66', 38.306], [11, 'Merel Smulders', 'NED', 'P22', 37.672], [12, 'Leila Walker', 'NZL', 'P150', 37.95],
    [13, 'Michelle Wissing', 'NED', 'P27', 37.966], [14, 'Malene Kejlstrup', 'DEN', 'P75', 38.455], [15, 'Bella May', 'AUS', '204', 38.729],
    [16, 'Teya Rufus', 'AUS', 'P5', 37.973],
  ],
  sources: ['https://prod.server.tissottiming.com/file/0003190400010303FFFFFFFFFFFFFF03', 'https://prod.server.tissottiming.com/file/0003190400020301FFFFFFFFFFFFFF03', 'https://usacycling.org/article/alexis-alden-and-tommy-bruney-earn-bronze-medals-at-the-2026-uci-bmx-racing-world-championships'],
};

// Pilotes Elite licenciés en France (FFC) en plus des Français déjà dans les listes du dessus.
// Seulement des résultats publics de pilotes Elite (adultes). Pas d'année de naissance : certains
// sortent juste de la catégorie Junior.
const FFC_SEL = 'https://velo.ffc.fr/app/uploads/sites/3/2026/09/Selection-France-BMX-Race-MENTOUGOU-Chine.pdf';
const ERA_TROYES = 'https://erabmx.com/news/race-report-coupe-de-france-troyes/';
const FFC_MACHECOUL = 'https://velo.ffc.fr/coupe-france-bmx-race-2026-machecoul-lance-saison-bmx/';
const MONDIAUX_2025 = 'https://en.wikipedia.org/wiki/2025_UCI_BMX_World_Championships';
export const PILOTES_ELITE_FRANCE = [
  { id: 'oliviera-evan', prenom: 'Evan', nom: 'Oliviera', pays: 'FRA', genre: 'H', club: 'UC Nantes Atlantique',
    palmares: ['Champion du monde Junior 2025'],
    saison2026: ['Vainqueur du classement final de la Coupe de France Elite (1re saison en Elite)', 'Vainqueur manche 1 (Machecoul)', '2e manche 7 (Troyes)', 'Sélectionné en Coupe du monde en Chine'],
    sources: [ERA_TROYES, FFC_MACHECOUL, FFC_SEL, MONDIAUX_2025] },
  { id: 'pieczanowsky-alexis', prenom: 'Alexis', nom: 'Pieczanowsky', pays: 'FRA', genre: 'H', club: 'UC Nantes Atlantique',
    palmares: ['Champion du monde U23 2025'],
    saison2026: ['2e Coupe de France manche 1 (Machecoul)', 'Sélectionné en Coupe du monde en Chine'],
    sources: [FFC_MACHECOUL, FFC_SEL, MONDIAUX_2025] },
  { id: 'rocherieux-clement', prenom: 'Clément', nom: 'Rocherieux', pays: 'FRA', genre: 'H', club: 'BMX Club Joué-lès-Tours',
    palmares: ['Vice-champion du monde Junior 2025'],
    saison2026: ['3e du classement final de la Coupe de France Elite', '1re victoire Elite : Coupe de France manche 5 (La Chapelle-Saint-Mesmin)', 'Bronze aux Mondiaux U23', 'Vainqueur en Coupe du monde U23 (Sarrians)'],
    sources: [ERA_TROYES, 'https://www.cdffc37.fr/actualite-1742-un-podium-sur-la-cinquiy-me-manche-de-la-coupe-de-france-de-bmx.html?version=computer', UCI_MONDIAUX_2026, UCI_SARRIANS] },
  { id: 'jacquet-mathis', prenom: 'Mathis', nom: 'Jacquet', pays: 'FRA', genre: 'H', club: 'BMX Besançon',
    palmares: [],
    saison2026: ['Champion de France U23', 'Vainqueur Coupe de France manche 7 (Troyes)', '2e manche 8'],
    sources: [ERA_TROYES, 'https://www.ffc-bfc.fr/uploads/elfinder/LES-COMITES/pv-reunions-bfc/2026/COMPTE-RENDU%20BE%2026%2008%202026.pdf'] },
  { id: 'favrel-marie', prenom: 'Marie', nom: 'Favrel', pays: 'FRA', genre: 'F', club: null,
    palmares: ['3e des Mondiaux U23 2025'],
    saison2026: ['Vainqueure du classement final de la Coupe de France Elite Dames'],
    sources: [ERA_TROYES, MONDIAUX_2025] },
  { id: 'brindjonc-lea', prenom: 'Léa', nom: 'Brindjonc', pays: 'FRA', genre: 'F', club: 'Lempdes BMX Auvergne',
    palmares: ['Championne du monde Junior 2022'],
    saison2026: ['2e du classement final de la Coupe de France Elite Dames', '17e aux Mondiaux (calculé)', 'Sélectionnée en Coupe du monde en Chine'],
    sources: [ERA_TROYES, FFC_SEL, 'https://uci.org/article/2022-uci-bmx-racing-world-championships-five-different-nations-win-the/5o4cO5pbS5sYsRFy325EnU'] },
];

// Coupe de France 2026 : classement final Elite (points non publiés) et clubs
export const COUPE_DE_FRANCE_2026 = {
  hommes: [[1, 'Evan Oliviera'], [2, 'Arthur Pilard'], [3, 'Clément Rocherieux']],
  femmes: [[1, 'Marie Favrel'], [2, 'Léa Brindjonc']],
  clubs: { DN1: 'BMX Besançon', DN2: 'Saint-Étienne', 'Équipe Avenir': 'BMX Besançon' },
  source: ERA_TROYES,
};

// Pilotes connus qui ne courent pas en BMX Elite en 2026 (gardés pour l'historique)
export const PILOTES_ABSENTS_2026 = [
  { nom: 'Mariana Pajón', pays: 'COL', raison: 'Passée au cyclisme sur piste (2 fois championne olympique BMX, 2012 et 2016)', source: 'https://www.winsports.co/mas-deportes/ciclismo/noticias/mariana-pajon-y-su-equipo-brillan-con-oro-suramericano-464743' },
  { nom: 'Alise Willoughby', pays: 'USA', raison: "Pas dans l'équipe des États-Unis aux Mondiaux 2026 ; pas d'annonce de retraite trouvée", source: 'https://usacycling.org/article/usa-cycling-announces-team-for-2026-uci-bmx-racing-world-championships' },
];
