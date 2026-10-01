// DBSpeed — Championnat de France des clubs de BMX Racing : DN1 2026 (Division Nationale 1, FFC).
// Recherche du 01/10/2026. Équipes de club MIXTES (hommes et femmes) : 5 à 10 pilotes Elite, U23 et U19,
// au moins 3 Elite ; les 5 meilleurs résultats de l'équipe comptent sur la Coupe de France, la manche
// française de la Coupe d'Europe et les championnats de France.
//
// Pilotes : la liste officielle FFC des Divisions nationales 2026 (lue deux fois, mêmes noms).
// On ne donne le nom que des pilotes Elite et U23 (adultes). Les U19 (juniors) sont seulement comptés.
// Un pilote peut être licencié dans un club sans être dans son équipe DN (ex. Joris Daudet, Eddy Clerté
// au Stade Bordelais, Romain Mahieu à Sarrians).
//
// Pilote : ['Prénom Nom', 'PAYS', 'Elite' | 'U23']

const LISTE_FFC = 'https://beynostbmxcotiere.fr/wp-content/uploads/2026/03/Liste_DN_2026.pdf';
const CLASSEMENT_AVRIL = 'https://beynostbmxcotiere.fr/wp-content/uploads/2026/04/Classement_DN-EA-2.pdf';
const REGLEMENT = 'https://www.cyclisme.bzh/wp-content/uploads/2025/11/Reglement-Championnats-de-France-des-DN-BMX-Racing-2026.pdf';
const ERA_TROYES = 'https://erabmx.com/news/race-report-coupe-de-france-troyes/';

export const DN1_2026 = {
  saison: 2026,
  champion: 'besancon',
  vainqueurDN2: 'Saint-Étienne BMX',
  vainqueurEquipeAvenir: 'BMX Besançon',
  // Classement publié en avril 2026, après les premières manches (pas encore le final)
  classementAvril: [
    ['lempdes', 486], ['nantes', 471], ['saint-brieuc', 451], ['besancon', 430], ['sarrians', 369],
    ['stade-bordelais', 300], ['joue', 254], ['compiegne', 253], ['cournon', 219], ['ubv', 86],
  ],
  clubs: [
    {
      id: 'besancon', sigle: 'BES', equipe: 'DN Work4cad Grand Besançon Doubs', club: 'BMX Besançon', ville: 'Besançon', region: 'Bourgogne-Franche-Comté',
      femmes: [['Merel Smulders', 'NED', 'Elite'], ['Laura Mougey', 'FRA', 'U23']],
      hommes: [['Michael Bias', 'NZL', 'Elite'], ['Dylan Gobert', 'FRA', 'Elite'], ['Mathis Ragot Richard', 'FRA', 'Elite'], ['Jérémy Rencurel', 'FRA', 'Elite'],
        ['Simon Beaucamp', 'FRA', 'U23'], ['Mathis Jacquet', 'FRA', 'U23'], ['Baptiste Jupille', 'FRA', 'U23'], ['Zian Lemee', 'FRA', 'U23']],
      u19: { filles: 0, garcons: 0 },
    },
    {
      id: 'lempdes', sigle: 'LEM', equipe: 'Lempdes BMX Auvergne', club: 'Lempdes BMX Auvergne', ville: 'Lempdes', region: 'Auvergne-Rhône-Alpes',
      femmes: [['Christelle Boivin', 'SUI', 'Elite'], ['Thalya Burford', 'SUI', 'Elite'], ['Axelle Étienne', 'FRA', 'Elite'], ['Léa Brindjonc', 'FRA', 'U23']],
      hommes: [['Mathis Louet', 'FRA', 'Elite'], ['Romain Mayet', 'FRA', 'Elite'], ['Romain Racine', 'FRA', 'Elite'], ['Pierre Geisse', 'FRA', 'U23']],
      u19: { filles: 0, garcons: 2 },
    },
    {
      id: 'nantes', sigle: 'NAN', equipe: 'Nantes BMX', club: 'UC Nantes Atlantique', ville: 'Nantes', region: 'Pays de la Loire',
      femmes: [['Manon Veenstra', 'NED', 'Elite']],
      hommes: [['Hugo Marszalek', 'FRA', 'Elite'], ['Alexis Pieczanowsky', 'FRA', 'Elite'], ['Louison Rousseau', 'FRA', 'Elite'], ['Thibaut Stoffels', 'BEL', 'Elite'],
        ['Arthur Bretin Monard', 'FRA', 'U23'], ['Evan Oliviera', 'FRA', 'U23'], ['Tom Won Fah Hin', 'FRA', 'U23']],
      u19: { filles: 0, garcons: 1 },
    },
    {
      id: 'saint-brieuc', sigle: 'SBC', equipe: "Saint-Brieuc BMX Côtes d'Armor", club: 'Saint-Brieuc BMX', ville: 'Saint-Brieuc', region: 'Bretagne',
      femmes: [['Bethany Shriever', 'GBR', 'Elite'], ['Méline Videlo', 'FRA', 'U23']],
      hommes: [['Pietro Bertagnoli', 'ITA', 'Elite'], ['Nathanaël Dieuaide', 'FRA', 'Elite'], ['Arthur Pilard', 'FRA', 'Elite'], ['Theo Thouin', 'FRA', 'Elite'],
        ['Adam Aubin', 'FRA', 'U23'], ['Peter Danihel', 'SVK', 'U23'], ['Leo Le Bougeant', 'FRA', 'U23']],
      u19: { filles: 0, garcons: 1 },
    },
    {
      id: 'sarrians', sigle: 'SAR', equipe: 'Sarrians Provence Aushopping', club: 'BMX Club Sarrians', ville: 'Sarrians', region: "Provence-Alpes-Côte d'Azur",
      femmes: [['Mariona Calvis Garcia', 'ESP', 'Elite'], ['Adriana Dominguez Bernal', 'ESP', 'Elite'], ['Marie Favrel', 'FRA', 'Elite']],
      hommes: [['Arno Conne Perrin', 'FRA', 'Elite'], ['Léo Garoyan', 'FRA', 'Elite'], ['Gabin Lavorel Paladjouglian', 'FRA', 'U23'], ['Dorian Montusclat', 'FRA', 'U23']],
      u19: { filles: 2, garcons: 1 },
    },
    {
      id: 'stade-bordelais', sigle: 'SBB', equipe: 'Stade Bordelais BMX', club: 'Stade Bordelais BMX', ville: 'Bordeaux', region: 'Nouvelle-Aquitaine',
      femmes: [['Avril Pillet', 'FRA', 'U23'], ['Gersende Popin', 'FRA', 'U23'], ['Clara Rouget', 'FRA', 'U23']],
      hommes: [['Axel Essabar', 'FRA', 'Elite'], ['Ruben Gommers', 'BEL', 'Elite'], ['Pedro Benalcazar', 'ECU', 'U23'], ['Leo Defrance', 'FRA', 'U23'],
        ['Matteo Faure', 'FRA', 'U23'], ['Luigi Seraudie', 'FRA', 'U23']],
      u19: { filles: 0, garcons: 1 },
    },
    {
      id: 'joue', sigle: 'JLT', equipe: 'DN Joué-lès-Tours', club: 'BMX Club Joué-lès-Tours', ville: 'Joué-lès-Tours', region: 'Centre-Val de Loire',
      femmes: [['Anaïs Garnier', 'FRA', 'U23']],
      hommes: [['Corentin Dubois', 'FRA', 'Elite'], ['Ruben Eugenie', 'FRA', 'U23'], ['Ethan Mondesir Bodol', 'FRA', 'U23'], ['Clément Rocherieux', 'FRA', 'U23']],
      u19: { filles: 0, garcons: 1 },
    },
    {
      id: 'compiegne', sigle: 'CVC', equipe: 'DN Compiègne-Venette Custom Racing', club: null, ville: 'Compiègne / Venette', region: 'Hauts-de-France',
      femmes: [['Jodie Viemont', 'FRA', 'Elite'], ['Lola De Oliveira', 'FRA', 'U23']],
      hommes: [['Chris Aldon', 'FRA', 'Elite'], ['Simba Darnand', 'FRA', 'Elite'], ['Tyméo Calif', 'FRA', 'U23'], ['Maxime Habert', 'FRA', 'U23'],
        ['Wannes Magdelijns', 'BEL', 'U23'], ['Raphaël Marie', 'FRA', 'U23']],
      u19: { filles: 0, garcons: 0 },
    },
    {
      id: 'cournon', sigle: 'COU', equipe: "DN BMX Cournon d'Auvergne", club: "BMX Cournon d'Auvergne", ville: "Cournon-d'Auvergne", region: 'Auvergne-Rhône-Alpes',
      femmes: [['Charlotte Morot', 'FRA', 'Elite'], ['Yvette De Waard', 'NED', 'U23'], ['Léonie Druart', 'FRA', 'U23']],
      hommes: [['Robin Genestroni', 'FRA', 'Elite'], ['Tanguy Rivoire', 'FRA', 'Elite'], ['Robin Brun', 'FRA', 'U23'], ['Matt Dubreuil', 'FRA', 'U23'],
        ['Malo Herbert', 'FRA', 'U23'], ['Emile Vinit Dunand', 'FRA', 'U23']],
      u19: { filles: 1, garcons: 0 },
    },
    {
      id: 'ubv', sigle: 'UBV', equipe: 'UBV – Union BMX Vaucluse', club: 'Union BMX Vaucluse', ville: 'Vaucluse', region: "Provence-Alpes-Côte d'Azur",
      femmes: [['Celia Bonnet', 'FRA', 'Elite'], ['Mathilde Doudoux', 'FRA', 'Elite']],
      hommes: [['Sylvain André', 'FRA', 'Elite'], ['Maxime Bondu', 'FRA', 'Elite'], ['Basile Ansart Layrac', 'FRA', 'U23'], ['Nathan Maserati', 'FRA', 'U23'],
        ['Matteo Vidal', 'FRA', 'U23']],
      u19: { filles: 2, garcons: 0 },
    },
  ],
  // Les 15 équipes de DN2 (noms seulement), dans l'ordre du classement d'avril
  dn2: ['St Michel – Préférence Home', 'Ain Côtière BMX', 'Saint-Étienne BMX', 'Évreux BMX', 'BMX Saint-Paul Vallée du Gier', 'Gerzat BMX',
    'UVCA Troyes', 'BMX Centre-Val de Loire', 'Bolbec BMX', 'Pays de Vesoul Haute-Saône', 'BMX Dinan-Quévert', 'BMX Lourdes',
    'SQY BMX Racing', 'BMXSucy94 Prostart', 'BMX LPM'],
  sources: [
    { nom: 'FFC – Divisions nationales BMX Racing 2026 (liste des 25 équipes)', url: LISTE_FFC },
    { nom: 'FFC – classement des DN publié en avril 2026', url: CLASSEMENT_AVRIL },
    { nom: 'Règlement des championnats de France des DN 2026', url: REGLEMENT },
    { nom: 'ERA BMX – Troyes : Besançon champion de DN1', url: ERA_TROYES },
  ],
};
