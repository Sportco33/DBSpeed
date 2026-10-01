// DBSpeed — CLASSEMENTS DBSpeed (notre classement, calculé avec les résultats des compétitions).
// Écrans (adresse après #competition) :
//   /classements               → classement : Hommes / Femmes, catégorie, Monde / Pays / Région / Département
//   /classements/pilote/ID     → un pilote : ses rangs (monde, pays, région, département) et ses points
//
// Comment on calcule (inspiré du classement UCI) :
//   points d'un résultat = points de la place × coefficient de la compétition
//   classement = total des points de la saison, dans la catégorie (Elite, U23, Junior…).
// Deux sources :
//   - « Vrais résultats » : les résultats publiés des vraies compétitions 2026 (donnees-reelles.js).
//     Souvent seulement le podium : un pilote 5e peut manquer. Région et département : seulement les
//     pilotes français dont on connaît le club (club → département du club, comme les comités FFC).
//   - « Exemple » : les compétitions d'exemple (tout est inventé), pour voir à quoi ça ressemble en grand.
import { COMPETITIONS_REELLES } from '/app/competitions/donnees-reelles.js';
import { PILOTES_ELITE_HOMMES, PILOTES_ELITE_FEMMES, PILOTES_ELITE_FRANCE } from '/app/competitions/pilotes-elite.js';
import { DN1_2026 } from '/app/competitions/dn1-2026.js';
import { listerCompetitions as listerExemples, chargerCompetition as chargerExemple, PAYS } from '/app/competitions/donnees-exemple.js';
import { esc, lienRetour, vide, puces, surChoix, animer } from '/app/outils.js';

// ---------------------------------------------------------------------------
// Le barème
// ---------------------------------------------------------------------------
// Points de la place (finale : 1er → 8e), puis par tour atteint
const POINTS_FINALE = [100, 80, 65, 55, 45, 40, 35, 30];
export function pointsPlace(place) {
  if (place <= 8) return POINTS_FINALE[place - 1];
  if (place <= 16) return 20;  // demi-finale
  if (place <= 32) return 10;  // quart de finale
  return 5;                    // plus loin
}
// Coefficient de chaque type de compétition (les plus grandes rapportent le plus)
export const COEFS = [
  ['Championnat du monde', 6],
  ['Coupe du monde UCI', 3, 'par manche'],
  ["Championnat d'Europe", 3],
  ['Championnat continental', 2.5, 'panaméricain, Océanie, Asie'],
  ["Coupe d'Europe UEC", 1.5, 'par manche'],
  ['Championnat de France', 1.5],
  ['Championnat national', 1.5, 'autres pays'],
  ['Coupe de France', 1, 'par manche'],
  ['Trophée de France', 1],
  ['Coupe de Slovaquie (Slovenský pohár)', 0.6, 'par manche'],
];
const COEF = Object.fromEntries(COEFS.map(([t, k]) => [t, k]));
// Compétitions d'exemple : coefficient selon le niveau
const COEF_EXEMPLE = { International: 3, National: 1.5, Régional: 0.5 };

// ---------------------------------------------------------------------------
// Départements et régions (France)
// ---------------------------------------------------------------------------
const DEPARTEMENTS = {
  '06': ['Alpes-Maritimes', "Provence-Alpes-Côte d'Azur"],
  13: ['Bouches-du-Rhône', "Provence-Alpes-Côte d'Azur"],
  84: ['Vaucluse', "Provence-Alpes-Côte d'Azur"],
  22: ["Côtes-d'Armor", 'Bretagne'],
  35: ['Ille-et-Vilaine', 'Bretagne'],
  56: ['Morbihan', 'Bretagne'],
  25: ['Doubs', 'Bourgogne-Franche-Comté'],
  70: ['Haute-Saône', 'Bourgogne-Franche-Comté'],
  63: ['Puy-de-Dôme', 'Auvergne-Rhône-Alpes'],
  '01': ['Ain', 'Auvergne-Rhône-Alpes'],
  42: ['Loire', 'Auvergne-Rhône-Alpes'],
  26: ['Drôme', 'Auvergne-Rhône-Alpes'],
  44: ['Loire-Atlantique', 'Pays de la Loire'],
  49: ['Maine-et-Loire', 'Pays de la Loire'],
  33: ['Gironde', 'Nouvelle-Aquitaine'],
  17: ['Charente-Maritime', 'Nouvelle-Aquitaine'],
  64: ['Pyrénées-Atlantiques', 'Nouvelle-Aquitaine'],
  37: ['Indre-et-Loire', 'Centre-Val de Loire'],
  45: ['Loiret', 'Centre-Val de Loire'],
  60: ['Oise', 'Hauts-de-France'],
  62: ['Pas-de-Calais', 'Hauts-de-France'],
  59: ['Nord', 'Hauts-de-France'],
  10: ['Aube', 'Grand Est'],
  67: ['Bas-Rhin', 'Grand Est'],
  27: ['Eure', 'Normandie'],
  76: ['Seine-Maritime', 'Normandie'],
  78: ['Yvelines', 'Île-de-France'],
  94: ['Val-de-Marne', 'Île-de-France'],
  31: ['Haute-Garonne', 'Occitanie'],
  65: ['Hautes-Pyrénées', 'Occitanie'],
  34: ['Hérault', 'Occitanie'],
};
const nomDep = (d) => DEPARTEMENTS[d]?.[0] || d;
const regionDe = (d) => DEPARTEMENTS[d]?.[1] || null;

// Département de chaque club (là où est le club : c'est son comité FFC)
const DEP_CLUB = {
  'BMX Besançon': '25', 'Lempdes BMX Auvergne': '63', 'UC Nantes Atlantique': '44', 'Saint-Brieuc BMX': '22',
  'BMX Club Sarrians': '84', 'Stade Bordelais BMX': '33', 'BMX Club Joué-lès-Tours': '37', 'BMX Club Cavaillon': '84',
  'Union BMX Vaucluse': '84', "BMX Cournon d'Auvergne": '63',
};
const DEP_EQUIPE_DN1 = {
  besancon: '25', lempdes: '63', nantes: '44', 'saint-brieuc': '22', sarrians: '84',
  'stade-bordelais': '33', joue: '37', compiegne: '60', cournon: '63', ubv: '84',
};

// ---------------------------------------------------------------------------
// Petits outils
// ---------------------------------------------------------------------------
const sansAccent = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const idNom = (nom) => sansAccent(nom).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const nbAccents = (t) => (String(t).normalize('NFD').match(/[̀-ͯ]/g) || []).length;
// Même pilote écrit de deux façons dans les sources
const MEME_PILOTE = { 'diego-arboleda': 'diego-arboleda-ospina', 'veronika-monika-sturiska': 'veronika-sturiska' };
const drapeau = (code) => PAYS[code]?.drapeau || '';
const nomPays = (code) => PAYS[code]?.nom || code;
const place = (n) => (n === 1 ? '1er' : `${n}e`);
const pts = (n) => (Math.round(n * 10) / 10).toLocaleString('fr-FR');
const ORDRE_CATS = ['Elite', 'U23', 'Junior', 'Cadets', 'Minimes', 'Benjamins', 'Pupilles', 'Cruiser', 'Masters 30+'];
const NIVEAUX_ZONE = [['monde', 'Monde'], ['pays', 'Pays'], ['region', 'Région'], ['departement', 'Département']];

// « Elite Hommes » → { genre: 'H', cat: 'Elite' } ; « Cadettes » → { genre: 'F', cat: 'Cadets' }
function decouperCategorie(nom) {
  const genre = /Femmes|Cadettes|Dames/.test(nom) ? 'F' : 'H';
  const cat = nom.replace(/ (Hommes|Femmes|Dames)$/, '').replace(/^Cadettes$/, 'Cadets');
  return { genre, cat };
}

// ---------------------------------------------------------------------------
// Construire les données : pilotes et leurs résultats, par catégorie
// ---------------------------------------------------------------------------
// donnees = { pilotes: Map(id → pilote), entrees: [{ pilote, genre, cat, resultats: [...], points }] }
function nouvelleBase() {
  const pilotes = new Map();
  const entrees = new Map(); // `${id}|${genre}|${cat}` → entrée
  function ajouter({ id, nom, pays, genre, cat, club = null, dep = null, resultat }) {
    let p = pilotes.get(id);
    if (!p) { p = { id, nom, pays, club, dep }; pilotes.set(id, p); }
    // garder la plus belle écriture du nom (celle qui donne le bon id, avec les accents)
    const bonId = idNom(nom) === id;
    if ((bonId && idNom(p.nom) !== id) || (bonId && nbAccents(nom) > nbAccents(p.nom))) p.nom = nom;
    if (!p.club && club) { p.club = club; p.dep = dep; }
    const cle = `${id}|${genre}|${cat}`;
    let e = entrees.get(cle);
    if (!e) { e = { pilote: p, genre, cat, resultats: [], points: 0 }; entrees.set(cle, e); }
    e.resultats.push(resultat);
    e.points += resultat.points;
  }
  return { pilotes, entrees, ajouter };
}

// Club connu de chaque vrai pilote (club de licence d'abord, sinon son équipe de DN1)
function clubsConnus() {
  const clubs = new Map();
  for (const p of [...PILOTES_ELITE_HOMMES, ...PILOTES_ELITE_FEMMES, ...PILOTES_ELITE_FRANCE]) {
    if (p.club) clubs.set(idNom(`${p.prenom} ${p.nom}`), { club: p.club, dep: DEP_CLUB[p.club] || null, pays: p.pays });
  }
  for (const e of DN1_2026.clubs) {
    for (const [nom, pays] of [...e.femmes, ...e.hommes]) {
      const id = MEME_PILOTE[idNom(nom)] || idNom(nom);
      if (!clubs.has(id)) clubs.set(id, { club: e.club || e.equipe, dep: DEP_EQUIPE_DN1[e.id] || null, pays });
    }
  }
  return clubs;
}

let cacheReel = null;
function donneesReelles() {
  if (cacheReel) return cacheReel;
  const base = nouvelleBase();
  const clubs = clubsConnus();
  for (const c of COMPETITIONS_REELLES) {
    const coef = COEF[c.type] ?? 1;
    for (const [epreuveComplete, places] of Object.entries(c.resultats || {})) {
      const [nomCat, epreuve = ''] = epreuveComplete.split(' · ');
      if (/Classement final/i.test(epreuve)) continue; // le général d'une série : ses manches comptent déjà
      const { genre, cat } = decouperCategorie(nomCat);
      if (cat === 'Junior') continue; // juniors = mineurs : pas de fiche de classement à leur nom (règle des pilotes réels)
      for (const [pl, nom, pays] of places) {
        const id = MEME_PILOTE[idNom(nom)] || idNom(nom);
        const club = clubs.get(id);
        // région et département : seulement les pilotes français (club en France)
        const avecClub = club && pays === 'FRA';
        base.ajouter({
          id, nom, pays, genre, cat,
          club: club?.club || null, dep: avecClub ? club.dep : null,
          resultat: {
            compet: c.id, nomCompet: c.nom, type: c.type, date: c.debut, epreuve,
            place: pl, coef, points: pointsPlace(pl) * coef,
          },
        });
      }
    }
  }
  cacheReel = { ...base, source: 'reel' };
  return cacheReel;
}

// Exemple : un département inventé mais toujours le même pour un même club
const DEPS_LISTE = Object.keys(DEPARTEMENTS);
function depInvente(club) {
  let h = 0;
  for (const ch of club) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return DEPS_LISTE[h % DEPS_LISTE.length];
}
let cacheExemple = null;
async function donneesExemple() {
  if (cacheExemple) return cacheExemple;
  const base = nouvelleBase();
  for (const resume of await listerExemples()) {
    const c = await chargerExemple(resume.id);
    if (!c) continue;
    const coef = COEF_EXEMPLE[c.niveau] ?? 1;
    const equipes = Object.fromEntries(c.equipes.map((e) => [e.id, e]));
    const parId = Object.fromEntries(c.pilotes.map((p) => [p.id, p]));
    for (const k of c.categories) {
      if (!k.termine || !k.classement) continue; // seulement les catégories finies
      const { genre, cat } = decouperCategorie(k.nom);
      for (const x of k.classement) {
        const p = parId[x.pilote];
        const nom = `${p.prenom} ${p.nom}`;
        const club = equipes[p.equipe]?.nom || null;
        base.ajouter({
          id: `ex-${idNom(nom)}-${p.pays.toLowerCase()}`, nom, pays: p.pays, genre, cat,
          club, dep: p.pays === 'FRA' && club ? depInvente(club) : null,
          resultat: {
            compet: c.id, nomCompet: c.nom, type: c.type, date: c.debut, epreuve: '',
            place: x.place, coef, points: pointsPlace(x.place) * coef,
          },
        });
      }
    }
  }
  cacheExemple = { ...base, source: 'exemple' };
  return cacheExemple;
}

// ---------------------------------------------------------------------------
// Classer
// ---------------------------------------------------------------------------
function dansZone(p, niveau, valeur) {
  if (niveau === 'pays') return p.pays === valeur;
  if (niveau === 'region') return !!p.dep && regionDe(p.dep) === valeur;
  if (niveau === 'departement') return p.dep === valeur;
  return true;
}
const meilleurePlace = (e) => Math.min(...e.resultats.map((r) => r.place));
const victoires = (e) => e.resultats.filter((r) => r.place === 1).length;
// Plus de points d'abord ; à égalité : meilleure place, puis plus de victoires. Même total = même rang.
function classer(entrees) {
  const liste = [...entrees].sort((a, b) => b.points - a.points || meilleurePlace(a) - meilleurePlace(b)
    || victoires(b) - victoires(a) || a.pilote.nom.localeCompare(b.pilote.nom));
  let rang = 0;
  return liste.map((e, i) => {
    if (i === 0 || e.points !== liste[i - 1].points) rang = i + 1;
    return { ...e, rang };
  });
}
function entreesDe(d, genre, cat) {
  return [...d.entrees.values()].filter((e) => e.genre === genre && e.cat === cat);
}
function rangDans(d, e, niveau, valeur) {
  const liste = classer(entreesDe(d, e.genre, e.cat).filter((x) => dansZone(x.pilote, niveau, valeur)));
  const trouve = liste.find((x) => x.pilote.id === e.pilote.id);
  return trouve ? { rang: trouve.rang, sur: liste.length } : null;
}
// Les choix possibles pour une zone (pays présents, régions, départements), les plus fournis d'abord
function choixZone(entrees, niveau) {
  const compte = new Map();
  for (const e of entrees) {
    const p = e.pilote;
    const v = niveau === 'pays' ? p.pays : niveau === 'region' ? (p.dep && regionDe(p.dep)) : p.dep;
    if (v) compte.set(v, (compte.get(v) || 0) + 1);
  }
  const nomDe = (v) => (niveau === 'pays' ? nomPays(v) : niveau === 'departement' ? `${nomDep(v)} (${v})` : v);
  return [...compte.entries()].sort((a, b) => b[1] - a[1] || nomDe(a[0]).localeCompare(nomDe(b[0])))
    .map(([v]) => [v, niveau === 'pays' ? `${drapeau(v)} ${nomPays(v)}` : nomDe(v)]);
}

// ---------------------------------------------------------------------------
// Mémoire de l'écran (pour la retrouver en revenant en arrière)
// ---------------------------------------------------------------------------
const memoire = { source: 'reel', genre: 'H', cat: 'Elite', niveau: 'monde', zone: { pays: 'FRA', region: null, departement: null }, nb: 50 };

function segments(nom, options, actif, classe = '') {
  return `<div class="segments ${classe}" role="group" aria-label="${esc(nom)}">${options.map(([v, t]) =>
    `<button type="button" data-valeur="${esc(v)}" aria-pressed="${v === actif}">${esc(t)}</button>`).join('')}</div>`;
}
const FLECHE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';

// ===========================================================================
// Écran : le classement
// ===========================================================================
export async function ecranClassements(zone, chemin) {
  if (chemin[0] === 'pilote') return ecranPiloteClasse(zone, chemin[1]);
  const d = memoire.source === 'exemple' ? await donneesExemple() : donneesReelles();

  zone.innerHTML = `
    ${lienRetour('#competition', 'Compétitions')}
    <h1 class="salut or-brillant">Classements</h1>
    <p class="sous-titre">Le classement DBSpeed des meilleurs pilotes : du monde entier jusqu'à ton département.</p>
    ${segments('Résultats utilisés', [['reel', 'Vrais résultats 2026'], ['exemple', 'Exemple (démo)']], memoire.source, 'cl-source')}
    ${segments('Hommes ou femmes', [['H', 'Hommes'], ['F', 'Femmes']], memoire.genre, 'cl-genre')}
    <div id="cl-cats"></div>
    ${puces('Niveau', NIVEAUX_ZONE, memoire.niveau, 'puces-defile cl-niveau')}
    <div id="cl-zone"></div>
    <div id="cl-liste"></div>
    <details class="cl-calcul">
      <summary>Comment on calcule ?</summary>
      <p>Chaque résultat rapporte <strong>des points selon la place</strong>, multipliés par <strong>l'importance de la compétition</strong>. On additionne tous les points de la saison, catégorie par catégorie (comme le classement UCI).</p>
      <p><strong>Points de la place :</strong> 1er 100 · 2e 80 · 3e 65 · 4e 55 · 5e 45 · 6e 40 · 7e 35 · 8e 30 · 9e à 16e 20 · 17e à 32e 10 · plus loin 5.</p>
      <p><strong>Importance de la compétition :</strong></p>
      <ul>${COEFS.map(([t, k, plus]) => `<li>${esc(t)}${plus ? ` <small>(${esc(plus)})</small>` : ''} : <strong>× ${String(k).replace('.', ',')}</strong></li>`).join('')}</ul>
      <p>Exemple : une victoire en Coupe du monde = 100 × 3 = <strong>300 points</strong>.</p>
      <p><strong>Région et département</strong> : ceux du club du pilote (comme les comités de la Fédération française), seulement pour les pilotes français dont on connaît le club.</p>
    </details>
    <p class="note" id="cl-note"></p>`;

  const zCats = zone.querySelector('#cl-cats');
  const zZone = zone.querySelector('#cl-zone');
  const zListe = zone.querySelector('#cl-liste');
  const note = zone.querySelector('#cl-note');

  function maj() {
    // catégories qui existent pour ce genre
    const cats = [...new Set([...d.entrees.values()].filter((e) => e.genre === memoire.genre).map((e) => e.cat))]
      .sort((a, b) => (ORDRE_CATS.indexOf(a) + 1 || 99) - (ORDRE_CATS.indexOf(b) + 1 || 99));
    if (!cats.includes(memoire.cat)) memoire.cat = cats[0];
    zCats.innerHTML = puces('Catégorie', cats.map((k) => [k, k]), memoire.cat, 'puces-defile cl-cat');
    surChoix(zCats.querySelector('.cl-cat'), (v) => { memoire.cat = v; memoire.nb = 50; maj(); });

    const toutes = entreesDe(d, memoire.genre, memoire.cat);
    // choix du pays / de la région / du département
    let valeur = null;
    if (memoire.niveau !== 'monde') {
      const options = choixZone(toutes, memoire.niveau);
      valeur = memoire.zone[memoire.niveau];
      if (!options.some(([v]) => v === valeur)) valeur = options[0]?.[0] ?? null;
      memoire.zone[memoire.niveau] = valeur;
      zZone.innerHTML = options.length ? puces('Choisir', options, valeur, 'puces-defile cl-choix') : '';
      surChoix(zZone.querySelector('.cl-choix'), (v) => { memoire.zone[memoire.niveau] = v; memoire.nb = 50; maj(); });
    } else zZone.innerHTML = '';

    const liste = memoire.niveau !== 'monde' && valeur == null ? [] : classer(toutes.filter((e) => dansZone(e.pilote, memoire.niveau, valeur)));
    const titreZone = memoire.niveau === 'monde' ? 'Monde'
      : memoire.niveau === 'pays' ? `${drapeau(valeur)} ${nomPays(valeur)}`
        : memoire.niveau === 'region' ? valeur : `${nomDep(valeur)} (${valeur})`;
    const genreTxt = memoire.genre === 'F' ? 'Femmes' : 'Hommes';

    if (!liste.length) {
      zListe.innerHTML = vide('Personne à classer ici',
        memoire.niveau === 'region' || memoire.niveau === 'departement'
          ? 'On ne connaît pas encore le club des pilotes de cette catégorie. Essaie « Pays » ou une autre catégorie.'
          : 'Pas encore de résultat dans cette catégorie.');
    } else {
      zListe.innerHTML = `
        <h2 class="cl-titre">${esc(memoire.cat)} ${genreTxt} · ${esc(titreZone || '')}</h2>
        <p class="compte">${liste.length} pilote${liste.length > 1 ? 's' : ''} classé${liste.length > 1 ? 's' : ''}</p>
        <ol class="lignes cl-lignes">${liste.slice(0, memoire.nb).map((e) => {
          const p = e.pilote;
          const lieu = p.dep ? `${nomDep(p.dep)}` : nomPays(p.pays);
          return `<li><a class="ligne" href="#competition/classements/pilote/${encodeURIComponent(p.id)}">
            <span class="medaille ${e.rang <= 3 ? `m${e.rang}` : 'mx'}">${e.rang}</span>
            <span class="ligne-texte"><strong>${esc(p.nom)}</strong><small>${drapeau(p.pays)} ${p.club ? `${esc(p.club)} · ` : ''}${esc(lieu)}</small></span>
            <span class="cl-points"><strong>${pts(e.points)}</strong><small>pts · ${e.resultats.length} course${e.resultats.length > 1 ? 's' : ''}</small></span>
            ${FLECHE}</a></li>`;
        }).join('')}</ol>
        ${liste.length > memoire.nb ? `<button type="button" class="bouton bouton-secondaire" id="cl-plus">Voir plus (${liste.length - memoire.nb} de plus)</button>` : ''}`;
      zListe.querySelector('#cl-plus')?.addEventListener('click', () => { memoire.nb += 100; maj(); });
    }
    note.innerHTML = d.source === 'reel'
      ? 'Calculé avec les <strong>résultats publiés</strong> des vraies compétitions 2026 (UCI, UEC, FFC…). Souvent, seul le podium est publié : un pilote qui a fini 5e peut manquer. Le classement deviendra complet quand les organisateurs importeront leurs résultats dans DBSpeed.'
      : '<strong>Exemple</strong> : pilotes, clubs et départements inventés, calculés avec les compétitions d\'exemple terminées.';
    animer(zListe);
  }

  surChoix(zone.querySelector('.cl-source'), async (v) => {
    memoire.source = v; memoire.nb = 50;
    await ecranClassements(zone, []);
    animer(zone, 'glisse');
  });
  surChoix(zone.querySelector('.cl-genre'), (v) => { memoire.genre = v; memoire.nb = 50; maj(); });
  surChoix(zone.querySelector('.cl-niveau'), (v) => { memoire.niveau = v; memoire.nb = 50; maj(); });
  maj();
}

// ===========================================================================
// Écran : un pilote dans les classements
// ===========================================================================
async function ecranPiloteClasse(zone, idBrut) {
  const id = decodeURIComponent(idBrut || '');
  const d = id.startsWith('ex-') ? await donneesExemple() : donneesReelles();
  const p = d.pilotes.get(id);
  if (!p) {
    zone.innerHTML = lienRetour('#competition/classements', 'Classements') + vide('Pilote introuvable', 'Il n\'a pas (encore) de résultat classé.');
    return;
  }
  const sesEntrees = [...d.entrees.values()].filter((e) => e.pilote.id === id)
    .sort((a, b) => b.points - a.points);
  const region = p.dep ? regionDe(p.dep) : null;

  const blocs = sesEntrees.map((e) => {
    const zones = [
      ['monde', null, 'Monde'],
      ['pays', p.pays, `${drapeau(p.pays)} ${nomPays(p.pays)}`],
      ...(p.dep ? [['region', region, region], ['departement', p.dep, nomDep(p.dep)]] : []),
    ];
    const cases = zones.map(([niveau, valeur, nom]) => {
      const r = rangDans(d, e, niveau, valeur);
      return `<div class="${r && r.rang <= 3 ? 'or' : ''}"><strong>${r ? place(r.rang) : '—'}</strong><span>${esc(nom)}${r ? ` <small>sur ${r.sur}</small>` : ''}</span></div>`;
    }).join('');
    const resultats = [...e.resultats].sort((a, b) => b.date.localeCompare(a.date) || a.epreuve.localeCompare(b.epreuve)).map((r) => `
      <li><a class="ligne" href="#competition/${esc(r.compet)}">
        <span class="medaille ${r.place <= 3 ? `m${r.place}` : 'mx'}">${r.place}</span>
        <span class="ligne-texte"><strong>${esc(r.nomCompet)}</strong><small>${esc(r.epreuve || r.type)} · ${pts(pointsPlace(r.place))} × ${String(r.coef).replace('.', ',')}</small></span>
        <span class="cl-points"><strong>${pts(r.points)}</strong><small>pts</small></span>
        ${FLECHE}</a></li>`).join('');
    return `<section class="bloc">
      <h2>${esc(e.cat)} ${e.genre === 'F' ? 'Femmes' : 'Hommes'} · ${pts(e.points)} pts</h2>
      <div class="chiffres cl-rangs chiffres-${zones.length}">${cases}</div>
      <ol class="lignes">${resultats}</ol>
    </section>`;
  }).join('');

  zone.innerHTML = `
    ${lienRetour('#competition/classements', 'Classements')}
    <div class="ma-page marbre-bordeaux cadre-or fiche-hero">
      <p class="nom">${esc(p.nom)}</p>
      <p class="infos">${drapeau(p.pays)} ${esc(nomPays(p.pays))}${p.club ? ` · ${esc(p.club)}` : ''}</p>
      ${p.dep ? `<span class="etiquette">${esc(nomDep(p.dep))} (${esc(p.dep)}) · ${esc(region)}</span>` : ''}
    </div>
    <p class="astuce">Son rang dans le classement DBSpeed${p.dep ? '' : ' (région et département : seulement les pilotes français dont on connaît le club)'}, et les courses qui lui ont rapporté des points.</p>
    ${blocs}
    ${d.source === 'exemple' ? '<p class="note"><strong>Exemple</strong> : ce pilote et ses résultats sont inventés.</p>' : ''}`;
}

// Pour la fiche d'un vrai pilote dans une compétition : son rang mondial DBSpeed dans chaque catégorie
export function rangsMondeReels(idPiloteReel) {
  const d = donneesReelles();
  const id = MEME_PILOTE[idPiloteReel] || idPiloteReel;
  return [...d.entrees.values()].filter((e) => e.pilote.id === id)
    .map((e) => ({ id, cat: e.cat, genre: e.genre, points: e.points, ...rangDans(d, e, 'monde', null) }));
}
