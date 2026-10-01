// DBSpeed — onglet Compétition
// Écrans (adresse après #competition) :
//   (rien)                → recherche des compétitions dans le monde
//   /ID                   → accueil de la compétition (infos, horaires, podiums, engagés)
//   /ID/pilote/PID        → fiche d'un pilote pour cette compétition
//   /ID/equipe/EID        → fiche d'une équipe pour cette compétition
//   /ID/resultats         → temps et classements (classement final, qualifs, toutes les manches)
//   /ID/manche/MID        → une manche en détail (arrivée, secteurs, passages)
//   /ID/tableau           → arbre du tableau final (1/16, 1/8, 1/4, 1/2, finale)
//   /dn1                  → championnat de France des clubs DN1 2026 (les 10 équipes)
//   /dn1/CLUB             → une équipe de DN1 : ses pilotes femmes et hommes
import { listerCompetitions as listerExemples, chargerCompetition as chargerExemple, PAYS } from '/app/competitions/donnees-exemple.js';
import { COMPETITIONS_REELLES, PAYS_EN_PLUS } from '/app/competitions/donnees-reelles.js';
import { DN1_2026 } from '/app/competitions/dn1-2026.js';
import { esc, lienRetour, vide, puces, surChoix, animer, secteurs, brancherLiens } from '/app/outils.js';

Object.assign(PAYS, PAYS_EN_PLUS);

// ---------------------------------------------------------------------------
// Les vraies compétitions (UCI, UEC, FFC…) + les compétitions d'exemple (démo, sur demande)
// ---------------------------------------------------------------------------
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const statutReel = (c) => (aujourdhui() < c.debut ? 'a-venir' : aujourdhui() > c.fin ? 'terminee' : 'en-cours');
const ORGA_COURT = (o) => String(o || '').split(' (')[0];
const idPilote = (nom) => nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function preparerReelle(base) {
  const pilotes = {};
  const categories = Object.entries(base.resultats || {}).map(([nom, places]) => ({
    nom,
    classement: places.map(([place, complet, pays, temps = null]) => {
      const id = idPilote(complet);
      const [prenom, ...reste] = complet.split(' ');
      pilotes[id] ||= { id, prenom, nom: reste.join(' '), pays, resultats: [] };
      pilotes[id].resultats.push({ categorie: nom, place, temps });
      return { pilote: id, place, temps };
    }),
  }));
  return {
    ...base, reelle: true, statut: statutReel(base),
    nomPays: PAYS[base.pays]?.nom || base.pays, drapeau: PAYS[base.pays]?.drapeau || '',
    categories, pilotes,
  };
}
const REELLES = COMPETITIONS_REELLES.map(preparerReelle);

async function listerCompetitions() {
  const reelles = REELLES.map((c) => ({
    id: c.id, nom: c.nom, type: c.type, niveau: c.niveau, ville: c.ville, pays: c.pays, nomPays: c.nomPays,
    debut: c.debut, fin: c.fin, statut: c.statut, reelle: true, organisateur: c.organisateur,
    categoriesNoms: c.categories.map((k) => k.nom),
    gagnants: c.categories.flatMap((k) => k.classement.map((x) => `${c.pilotes[x.pilote].prenom} ${c.pilotes[x.pilote].nom}`)),
  }));
  return memoire.demo ? [...reelles, ...await listerExemples()] : reelles;
}
async function chargerCompetition(id) {
  return REELLES.find((c) => c.id === id) || chargerExemple(id);
}

// ---------------------------------------------------------------------------
// Mémoire de l'écran (filtres choisis), pour la retrouver en revenant en arrière
// ---------------------------------------------------------------------------
const memoire = { recherche: '', filtre: 'toutes', compets: {}, demo: false };
function reglages(id) {
  if (!memoire.compets[id]) {
    memoire.compets[id] = {
      engages: 'pilotes', catEngages: 'toutes', chercheEngages: '', nbAffiches: 40,
      cat: null, vue: 'classement', phase: null, affichage: 'arrivee', depuis: null,
    };
  }
  return memoire.compets[id];
}
const positions = new Map(); // position de défilement par écran
let dernierEcran = null;
let retourDemande = false;
let jeton = 0;

// ---------------------------------------------------------------------------
// Petits outils d'affichage
// ---------------------------------------------------------------------------
const temps = (t) => (t == null ? '—' : t.toFixed(3));
const ecart = (d) => (d == null ? '—' : d < 0.0005 ? '—' : `+${d.toFixed(3)}`);
const place = (n) => (n == null ? '—' : n === 1 ? '1er' : `${n}e`);
const placeF = (n, f) => (n === 1 && f ? '1re' : place(n));
const drapeau = (code) => PAYS[code]?.drapeau || '';
const nomPays = (code) => PAYS[code]?.nom || code;
const sansAccent = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const initiales = (nom) => nom.split(/\s+/).filter((m) => /^[A-Za-zÀ-ÿ]/.test(m)).slice(0, 2).map((m) => m[0]).join('').toUpperCase();

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const decouper = (iso) => { const [a, m, j] = iso.split('-').map(Number); return { a, m: m - 1, j }; };
const dateCourte = (iso) => { const d = decouper(iso); return `${d.j} ${MOIS[d.m]}`; };
const dateJour = (iso) => { const d = decouper(iso); const js = new Date(d.a, d.m, d.j); return `${JOURS[js.getDay()]} ${d.j} ${MOIS_LONG[d.m]}`; };
function periode(c) {
  const d = decouper(c.debut); const f = decouper(c.fin);
  if (c.debut === c.fin) return `Le ${d.j} ${MOIS_LONG[d.m]} ${d.a}`;
  if (d.m === f.m) return `Du ${d.j} au ${f.j} ${MOIS_LONG[f.m]} ${f.a}`;
  return `Du ${d.j} ${MOIS_LONG[d.m]} au ${f.j} ${MOIS_LONG[f.m]} ${f.a}`;
}
const STATUTS = {
  'en-cours': { texte: 'En direct', classe: 'statut-direct' },
  'a-venir': { texte: 'À venir', classe: 'statut-avenir' },
  terminee: { texte: 'Terminée', classe: 'statut-terminee' },
};
const badgeStatut = (s) => `<span class="badge-statut ${STATUTS[s].classe}">${STATUTS[s].texte}</span>`;

const ICONES = {
  loupe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  croix: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  fleche: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  lieu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  calendrier: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  drapeau: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V3.5"/><path d="M5 4h13l-2.5 4.5L18 13H5"/></svg>',
  piste: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18c3 0 3-5 6-5s3 5 6 5 3-8 6-8"/><path d="M3 21h18"/></svg>',
  groupe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.6c2.8-.3 5 1.4 5.6 4.4"/></svg>',
  orga: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V9l8-5 8 5v12"/><path d="M9 21v-6h6v6"/></svg>',
  chrono: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5M12 2.5V6"/></svg>',
  arbre: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h5v4H3zM3 16h5v4H3zM16 10h5v4h-5z"/><path d="M8 6h3v12H8M11 12h5"/></svg>',
};

// ---------------------------------------------------------------------------
// Index d'une compétition : retrouver vite un pilote, ses manches, sa place…
// ---------------------------------------------------------------------------
const index = new WeakMap();
function indexer(c) {
  if (index.has(c)) return index.get(c);
  const pilotes = Object.fromEntries(c.pilotes.map((p) => [p.id, p]));
  const equipes = Object.fromEntries(c.equipes.map((e) => [e.id, e]));
  const manches = Object.fromEntries(c.manches.map((m) => [m.id, m]));
  const cats = Object.fromEntries(c.categories.map((k) => [k.nom, k]));
  const manchesDe = {};
  for (const m of c.manches) {
    for (const id of m.pilotes || []) (manchesDe[id] ||= []).push(m);
  }
  const final = {}; const qualif = {};
  for (const k of c.categories) {
    for (const x of k.classement || []) final[x.pilote] = x;
    for (const x of k.qualifs || []) qualif[x.pilote] = x;
  }
  // meilleurs temps de chaque secteur, par catégorie (pour donner un rang à chaque pilote)
  const secteursCat = {};
  for (const k of c.categories) {
    const meilleurs = {}; // pilote -> [s1,s2,s3,s4] meilleurs
    for (const m of c.manches.filter((x) => x.categorie === k.nom && x.resultats)) {
      for (const r of m.resultats) {
        const s = secteurs(r.passages);
        const b = (meilleurs[r.pilote] ||= [null, null, null, null]);
        s.forEach((v, i) => { if (v != null && (b[i] == null || v < b[i])) b[i] = v; });
      }
    }
    secteursCat[k.nom] = meilleurs;
  }
  const res = { pilotes, equipes, manches, cats, manchesDe, final, qualif, secteursCat };
  index.set(c, res);
  return res;
}

function nomManche(m) {
  if (m.tour === 'qualif') return `${m.phase} · Groupe ${m.groupe}`;
  if (m.phase === 'Finale') return 'Finale';
  return `${m.phase} · Manche ${m.numero}`;
}
function resultatDe(m, piloteId) { return m.resultats?.find((r) => r.pilote === piloteId) || null; }

// ---------------------------------------------------------------------------
// Point d'entrée : appelé par accueil.js à chaque changement d'adresse
// ---------------------------------------------------------------------------
export async function afficherCompetition(zone, chemin) {
  const ecran = chemin.join('/');
  if (dernierEcran !== null) positions.set(dernierEcran, window.scrollY);
  const revenir = retourDemande;
  retourDemande = false;
  const monJeton = ++jeton;

  const [id, type, cible] = chemin;
  let c = null;
  if (id && id !== 'dn1') {
    c = await chargerCompetition(id);
    if (monJeton !== jeton) return; // l'utilisateur est déjà allé ailleurs
  }

  if (!id) await ecranListe(zone);
  else if (id === 'dn1' && type) ecranClubDN1(zone, type);
  else if (id === 'dn1') ecranDN1(zone);
  else if (!c) zone.innerHTML = vide('Compétition introuvable', 'Elle a peut-être été supprimée.') + lienRetour('#competition', 'Compétitions');
  else if (c.reelle && type === 'pilote') ecranPiloteReel(zone, c, cible);
  else if (c.reelle) ecranCompetitionReelle(zone, c);
  else if (!type) ecranCompetition(zone, c);
  else if (type === 'pilote') ecranPilote(zone, c, cible);
  else if (type === 'equipe') ecranEquipe(zone, c, cible);
  else if (type === 'resultats') ecranResultats(zone, c);
  else if (type === 'manche') ecranManche(zone, c, cible);
  else if (type === 'tableau') ecranTableau(zone, c);
  else ecranCompetition(zone, c);

  if (monJeton !== jeton) return;
  // le bouton « Retour » revient vraiment en arrière (et retrouve l'endroit où on était)
  zone.querySelectorAll('[data-retour]').forEach((a) => a.addEventListener('click', (e) => {
    if (dernierEcran === null) return;
    e.preventDefault();
    retourDemande = true;
    history.back();
  }));
  // lignes de tableau cliquables (au doigt et au clavier)
  brancherLiens(zone);

  animer(zone, revenir ? 'glisse-droite' : 'glisse-gauche');
  window.scrollTo(0, revenir ? positions.get(ecran) || 0 : 0);
  dernierEcran = ecran;
}

function segments(nom, options, actif) {
  return `<div class="segments" role="group" aria-label="${esc(nom)}">${options.map(([valeur, texte]) =>
    `<button type="button" data-valeur="${esc(valeur)}" aria-pressed="${valeur === actif}">${esc(texte)}</button>`).join('')}</div>`;
}
function plaquePetite(p) { return `<span class="plaque-petite">${esc(p.plaque)}</span>`; }

// ===========================================================================
// 1. Recherche des compétitions
// ===========================================================================
async function ecranListe(zone) {
  const toutes = await listerCompetitions();
  const ordre = { 'en-cours': 0, 'a-venir': 1, terminee: 2 };
  toutes.sort((a, b) => ordre[a.statut] - ordre[b.statut]
    || (a.statut === 'terminee' ? b.debut.localeCompare(a.debut) : a.debut.localeCompare(b.debut)));

  zone.innerHTML = `
    <h1 class="salut or-brillant">Compétition</h1>
    <p class="sous-titre">Cherche une course de BMX, partout dans le monde.</p>
    <label class="recherche">
      ${ICONES.loupe}
      <input type="search" id="c-recherche" placeholder="Nom, ville, pays, catégorie…" autocomplete="off" enterkeyhint="search" value="${esc(memoire.recherche)}" aria-label="Chercher une compétition">
      <button type="button" class="effacer" id="c-effacer" aria-label="Effacer" ${memoire.recherche ? '' : 'hidden'}>${ICONES.croix}</button>
    </label>
    ${puces('Filtrer', [['toutes', 'Toutes'], ['en-cours', 'En direct'], ['a-venir', 'À venir'], ['terminee', 'Terminées']], memoire.filtre, 'puces-defile puces-filtre')}
    <p class="compte" id="c-compte" aria-live="polite"></p>
    <a class="carte-dn1 marbre-bordeaux cadre-or" href="#competition/dn1">
      <span class="logo-equipe">DN1</span>
      <span class="ligne-texte"><strong>Championnat de France des clubs</strong><small>Les 10 équipes de DN1 2026 et leurs pilotes</small></span>
      ${ICONES.fleche}
    </a>
    <div id="c-liste" class="liste-compets"></div>
    <p class="note">Ce sont les <strong>vraies compétitions 2026</strong> (UCI, UEC, Fédération française…), avec les résultats publiés. Le détail des manches et les temps à chaque ligne arriveront quand les organisateurs importeront leurs fichiers.</p>
    <button type="button" class="bouton bouton-secondaire" id="c-demo">${memoire.demo ? 'Cacher les compétitions d’exemple' : 'Voir aussi des compétitions d’exemple (démo des temps détaillés)'}</button>`;

  const champ = zone.querySelector('#c-recherche');
  const effacer = zone.querySelector('#c-effacer');
  const liste = zone.querySelector('#c-liste');
  const compte = zone.querySelector('#c-compte');

  function majListe() {
    const mots = sansAccent(memoire.recherche).split(/\s+/).filter(Boolean);
    const trouvees = toutes.filter((c) => {
      if (memoire.filtre !== 'toutes' && c.statut !== memoire.filtre) return false;
      const texte = sansAccent([c.nom, c.ville, c.nomPays, c.pays, c.type, c.niveau, c.organisateur, ...c.categoriesNoms, ...(c.gagnants || [])].join(' '));
      return mots.every((m) => texte.includes(m));
    });
    compte.textContent = trouvees.length === 0 ? '' : trouvees.length === 1 ? '1 compétition' : `${trouvees.length} compétitions`;
    liste.innerHTML = trouvees.length ? trouvees.map((c) => {
      const d = decouper(c.debut);
      return `<a class="carte-compet" href="#competition/${c.id}">
        <span class="c-date"><span class="c-jour">${d.j}</span><span class="c-mois">${MOIS[d.m]}</span></span>
        <span class="c-corps">
          <strong class="c-nom-liste">${esc(c.nom)}</strong>
          <span class="c-lieu">${drapeau(c.pays)} ${esc(c.ville)}, ${esc(c.nomPays)}</span>
          <span class="c-meta">${c.reelle ? `${esc(ORGA_COURT(c.organisateur))} · ${esc(c.niveau)}` : `${esc(c.type)} · ${c.nbPilotes} pilotes · exemple`}</span>
        </span>
        ${badgeStatut(c.statut)}
      </a>`;
    }).join('') : vide('Aucune compétition trouvée', 'Essaie un autre mot : une ville, un pays, « coupe », « elite »…');
  }

  champ.addEventListener('input', () => {
    memoire.recherche = champ.value;
    effacer.hidden = !champ.value;
    majListe();
  });
  champ.addEventListener('keydown', (e) => { if (e.key === 'Enter') champ.blur(); });
  effacer.addEventListener('click', () => {
    memoire.recherche = ''; champ.value = ''; effacer.hidden = true; majListe(); champ.focus();
  });
  surChoix(zone.querySelector('.puces-filtre'), (v) => { memoire.filtre = v; majListe(); });
  zone.querySelector('#c-demo').addEventListener('click', async () => {
    memoire.demo = !memoire.demo;
    await ecranListe(zone);
    animer(zone, 'glisse');
  });
  majListe();
}

// ===========================================================================
// 2. Accueil d'une compétition
// ===========================================================================
function ecranCompetition(zone, c) {
  const ix = indexer(c);
  const r = reglages(c.id);
  const aDesResultats = c.manches.some((m) => m.resultats);
  const avecTableau = c.categories.some((k) => k.nbGroupes > 1);
  const premierTour = c.categories.map((k) => k.tours[0]).filter(Boolean)
    .sort((a, b) => ['1/32', '1/16', '1/8', '1/4', '1/2', 'Finale'].indexOf(a) - ['1/32', '1/16', '1/8', '1/4', '1/2', 'Finale'].indexOf(b))[0];

  // horaires, groupés par jour
  const parJour = {};
  for (const p of c.programme) (parJour[p.date] ||= []).push(p);
  const horaires = Object.entries(parJour).map(([jour, lignes]) => `
    <h3 class="jour">${esc(dateJour(jour))}</h3>
    <ol class="programme">${lignes.map((l) => `
      <li><span class="heure">${esc(l.heure)}</span><span><strong>${esc(l.quoi)}</strong>${l.detail ? `<small>${esc(l.detail)}</small>` : ''}</span></li>`).join('')}
    </ol>`).join('');

  // podiums des catégories terminées
  const podiums = c.categories.filter((k) => k.termine && k.classement).map((k) => `
    <div class="podium">
      <h3>${esc(k.nom)}</h3>
      <ol>${k.classement.slice(0, 3).map((x, i) => {
        const p = ix.pilotes[x.pilote];
        return `<li><a href="#competition/${c.id}/pilote/${p.id}" class="podium-ligne">
          <span class="medaille m${i + 1}">${i + 1}</span>
          <span class="podium-nom"><strong>${esc(p.prenom)} ${esc(p.nom)}</strong><small>${drapeau(p.pays)} ${esc(ix.equipes[p.equipe].nom)}</small></span>
          ${ICONES.fleche}</a></li>`;
      }).join('')}</ol>
    </div>`).join('');

  const categoriesTexte = c.categories.map((k) => `${k.nom} (${k.pilotes.length})`).join(', ');

  zone.innerHTML = `
    ${lienRetour('#competition', 'Compétitions')}
    <div class="c-hero marbre-bordeaux cadre-or">
      <div class="c-hero-haut">${badgeStatut(c.statut)}<span class="etiquette">${esc(c.type)}</span></div>
      <h1 class="c-titre">${esc(c.nom)}</h1>
      <p class="c-hero-ligne">${ICONES.lieu}<span>${drapeau(c.pays)} ${esc(c.ville)}, ${esc(c.nomPays)}</span></p>
      <p class="c-hero-ligne">${ICONES.calendrier}<span>${esc(periode(c))}</span></p>
    </div>
    <p class="c-description">${esc(c.description)}</p>

    <div class="c-boutons">
      <a class="bouton bouton-principal bouton-or" href="#competition/${c.id}/resultats">${ICONES.chrono}Temps et classements</a>
      ${avecTableau ? `<a class="bouton bouton-secondaire" href="#competition/${c.id}/tableau">${ICONES.arbre}Tableau final${premierTour && premierTour !== 'Finale' ? ` (${premierTour} → finale)` : ''}</a>` : ''}
    </div>
    ${!aDesResultats ? `<p class="note">Les manches n'ont pas encore commencé : les temps arriveront ici dès le ${esc(dateCourte(c.debut))}.</p>` : ''}

    <div class="chiffres">
      <div><strong>${c.pilotes.length}</strong><span>pilotes</span></div>
      <div><strong>${c.equipes.length}</strong><span>équipes</span></div>
      <div><strong>${c.categories.length}</strong><span>catégories</span></div>
      <div><strong>${c.manches.length}</strong><span>manches</span></div>
    </div>

    <section class="bloc">
      <h2>Infos</h2>
      <dl class="infos-liste">
        <div>${ICONES.lieu}<dt>Lieu</dt><dd>${esc(c.piste)}<br>${esc(c.ville)}, ${drapeau(c.pays)} ${esc(c.nomPays)}</dd></div>
        <div>${ICONES.calendrier}<dt>Dates</dt><dd>${esc(periode(c))}</dd></div>
        <div>${ICONES.drapeau}<dt>Type de course</dt><dd>${esc(c.type)} · niveau ${esc(c.niveau.toLowerCase())}<br><small>3 manches de qualification, puis tableau final : les 4 premiers de chaque manche passent au tour suivant.</small></dd></div>
        <div>${ICONES.groupe}<dt>Pilotes</dt><dd>${c.pilotes.length} pilotes, ${c.equipes.length} équipes<br><small>${esc(categoriesTexte)}</small></dd></div>
        <div>${ICONES.piste}<dt>Piste</dt><dd>${c.longueur} m · 3 intermédiaires + arrivée<br><small>Secteurs : ${c.nomsSecteurs.map((n, i) => `S${i + 1} ${n}`).join(' · ')}</small></dd></div>
        <div>${ICONES.orga}<dt>Organisateur</dt><dd>${esc(c.organisateur)}</dd></div>
      </dl>
    </section>

    <section class="bloc">
      <h2>Horaires</h2>
      ${horaires}
    </section>

    ${podiums ? `<section class="bloc"><h2>Podiums</h2><div class="podiums">${podiums}</div></section>` : ''}

    <section class="bloc" id="engages">
      <h2>Engagés</h2>
      ${segments('Pilotes ou équipes', [['pilotes', `Pilotes (${c.pilotes.length})`], ['equipes', `Équipes (${c.equipes.length})`]], r.engages)}
      <div id="engages-cats">${puces('Catégorie', [['toutes', 'Toutes'], ...c.categories.map((k) => [k.nom, k.nom])], r.catEngages, 'puces-defile')}</div>
      <label class="recherche petite">
        ${ICONES.loupe}
        <input type="search" id="engages-recherche" placeholder="Nom, plaque, équipe, pays…" autocomplete="off" value="${esc(r.chercheEngages)}" aria-label="Chercher un engagé">
      </label>
      <ul class="lignes" id="engages-liste"></ul>
      <button type="button" class="bouton bouton-secondaire" id="engages-plus" hidden>Voir plus</button>
    </section>`;

  const liste = zone.querySelector('#engages-liste');
  const plus = zone.querySelector('#engages-plus');

  function majEngages() {
    zone.querySelector('#engages-cats').hidden = r.engages !== 'pilotes';
    const mots = sansAccent(r.chercheEngages).split(/\s+/).filter(Boolean);
    let lignes;
    if (r.engages === 'pilotes') {
      const choisis = c.pilotes.filter((p) => {
        if (r.catEngages !== 'toutes' && p.categorie !== r.catEngages) return false;
        const t = sansAccent(`${p.prenom} ${p.nom} ${p.plaque} ${ix.equipes[p.equipe].nom} ${nomPays(p.pays)} ${p.pays} ${p.categorie}`);
        return mots.every((m) => t.includes(m));
      }).sort((a, b) => (ix.final[a.id]?.place ?? 999) - (ix.final[b.id]?.place ?? 999) || a.nom.localeCompare(b.nom));
      lignes = choisis.map((p) => {
        const f = ix.final[p.id];
        const cat = ix.cats[p.categorie];
        return `<li><a class="ligne" href="#competition/${c.id}/pilote/${p.id}">
          ${plaquePetite(p)}
          <span class="ligne-texte"><strong>${esc(p.prenom)} ${esc(p.nom)}</strong><small>${drapeau(p.pays)} ${esc(ix.equipes[p.equipe].nom)} · ${esc(p.categorie)}</small></span>
          ${f ? `<span class="ligne-place ${f.place <= 3 && cat.termine ? 'top' : ''}">${place(f.place)}</span>` : ''}
          ${ICONES.fleche}</a></li>`;
      });
    } else {
      const choisies = c.equipes.filter((e) => {
        const t = sansAccent(`${e.nom} ${nomPays(e.pays)} ${e.pays} ${e.pilotes.map((id) => `${ix.pilotes[id].prenom} ${ix.pilotes[id].nom}`).join(' ')}`);
        return mots.every((m) => t.includes(m));
      }).sort((a, b) => b.pilotes.length - a.pilotes.length || a.nom.localeCompare(b.nom));
      lignes = choisies.map((e) => {
        const meilleur = e.pilotes.map((id) => ix.final[id]).filter(Boolean).sort((a, b) => a.place - b.place)[0];
        return `<li><a class="ligne" href="#competition/${c.id}/equipe/${e.id}">
          <span class="logo-equipe">${esc(initiales(e.nom))}</span>
          <span class="ligne-texte"><strong>${esc(e.nom)}</strong><small>${drapeau(e.pays)} ${esc(nomPays(e.pays))} · ${e.pilotes.length} pilote${e.pilotes.length > 1 ? 's' : ''}</small></span>
          ${meilleur ? `<span class="ligne-place">${place(meilleur.place)}</span>` : ''}
          ${ICONES.fleche}</a></li>`;
      });
    }
    liste.innerHTML = lignes.length ? lignes.slice(0, r.nbAffiches).join('') : `<li>${vide('Personne trouvé', 'Essaie un autre nom ou une plaque.')}</li>`;
    plus.hidden = lignes.length <= r.nbAffiches;
    plus.textContent = `Voir plus (${lignes.length - r.nbAffiches} de plus)`;
  }
  surChoix(zone.querySelector('.segments'), (v) => { r.engages = v; r.nbAffiches = 40; majEngages(); });
  surChoix(zone.querySelector('#engages-cats .puces'), (v) => { r.catEngages = v; r.nbAffiches = 40; majEngages(); });
  zone.querySelector('#engages-recherche').addEventListener('input', (e) => { r.chercheEngages = e.target.value; r.nbAffiches = 40; majEngages(); });
  plus.addEventListener('click', () => { r.nbAffiches += 60; majEngages(); });
  majEngages();
}

// ===========================================================================
// 3. Fiche d'un pilote (pour cette compétition)
// ===========================================================================
function tableauPassages(m, res, ix) {
  // place et écart à chaque ligne, comparés aux autres pilotes de la manche
  const s = secteurs(res.passages);
  const lignes = ['Inter 1', 'Inter 2', 'Inter 3', 'Arrivée'].map((nom, i) => {
    const t = res.passages[i];
    const autres = m.resultats.map((x) => x.passages[i]).filter((v) => v != null).sort((a, b) => a - b);
    const pos = t == null ? null : autres.indexOf(t) + 1;
    const ecartPremier = t == null ? null : t - autres[0];
    // meilleur secteur de la manche ?
    const secteursManche = m.resultats.map((x) => secteurs(x.passages)[i]).filter((v) => v != null);
    const meilleur = s[i] != null && s[i] === Math.min(...secteursManche);
    return `<tr>
      <th scope="row">${nom}</th>
      <td>${temps(t)}</td>
      <td class="${meilleur ? 'meilleur' : ''}">${temps(s[i])}</td>
      <td><span class="pos ${pos === 1 ? 'p1' : ''}">${t == null ? '—' : place(pos)}</span></td>
      <td class="doux">${ecart(ecartPremier)}</td>
    </tr>`;
  }).join('');
  return `<div class="tableau-defile"><table class="t">
    <thead><tr><th>Ligne</th><th>Temps</th><th>Secteur</th><th>Place</th><th>Écart</th></tr></thead>
    <tbody>${lignes}</tbody></table></div>`;
}

function ecranPilote(zone, c, id) {
  const ix = indexer(c);
  const p = ix.pilotes[id];
  if (!p) { zone.innerHTML = lienRetour(`#competition/${c.id}`, c.nom) + vide('Pilote introuvable', ''); return; }
  const equipe = ix.equipes[p.equipe];
  const cat = ix.cats[p.categorie];
  const f = ix.final[p.id];
  const q = ix.qualif[p.id];
  const ses = (ix.manchesDe[p.id] || []);
  const faites = ses.filter((m) => m.resultats);
  const meilleurTemps = Math.min(...faites.map((m) => resultatDe(m, p.id).passages[3]).filter((v) => v != null));

  // secteurs : son meilleur temps et son rang dans la catégorie
  const tousSecteurs = ix.secteursCat[p.categorie];
  const sesSecteurs = tousSecteurs[p.id];
  let blocSecteurs = '';
  if (sesSecteurs) {
    const rangs = sesSecteurs.map((v, i) => (v == null ? null
      : Object.values(tousSecteurs).map((x) => x[i]).filter((x) => x != null).sort((a, b) => a - b).indexOf(v) + 1));
    const nbCat = Object.keys(tousSecteurs).length;
    const fort = rangs.reduce((best, rg, i) => (rg != null && (best == null || rg < rangs[best]) ? i : best), null);
    blocSecteurs = `
      <section class="bloc">
        <h2>Ses secteurs</h2>
        <p class="sous-titre">Son meilleur temps sur chaque morceau de piste, et sa place parmi les ${nbCat} pilotes de la catégorie.</p>
        <div class="secteurs">${sesSecteurs.map((v, i) => `
          <div class="secteur ${i === fort ? 'fort' : ''}">
            <span class="s-nom">S${i + 1}</span>
            <span class="s-detail">${esc(c.nomsSecteurs[i])}</span>
            <strong class="s-temps">${temps(v)}</strong>
            <span class="pos ${rangs[i] === 1 ? 'p1' : ''}">${rangs[i] ? place(rangs[i]) : '—'}</span>
          </div>`).join('')}
        </div>
        ${fort != null ? `<p class="astuce">Son point fort : <strong>S${fort + 1} (${esc(c.nomsSecteurs[fort])})</strong>.</p>` : ''}
      </section>`;
  }

  const cartes = ses.map((m) => {
    const res = resultatDe(m, p.id);
    const tete = `<header class="mp-tete"><strong>${esc(nomManche(m))}</strong><span>${esc(dateCourte(m.date))} · ${esc(m.heure)}</span></header>`;
    if (!res) {
      return `<article class="carte-manche a-venir">${tete}<p class="doux">À venir : ${m.pilotes.length} pilotes dans cette manche.</p>
        <a class="lien-fleche" href="#competition/${c.id}/manche/${m.id}">Voir les pilotes de la manche ${ICONES.fleche}</a></article>`;
    }
    const premier = m.resultats[0].passages[3];
    const qualifiePour = m.tour !== 'qualif' && m.phase !== 'Finale' && res.place <= 4;
    return `<article class="carte-manche">
      ${tete}
      <div class="mp-resume">
        <span class="place-grosse ${res.place === 1 ? 'p1' : ''}">${place(res.place)}</span>
        <span class="mp-temps"><strong>${res.abandon ? 'Chute' : temps(res.passages[3])}</strong>
          <small>${res.abandon ? 'n\'a pas fini' : res.place === 1 ? 'gagne la manche' : `${ecart(res.passages[3] - premier)} sur le 1er`} · couloir ${res.couloir}</small></span>
        ${m.tour === 'qualif' ? `<span class="mp-pts">${res.points} pt${res.points > 1 ? 's' : ''}</span>` : qualifiePour ? '<span class="mp-pts ok">Qualifié</span>' : ''}
      </div>
      ${tableauPassages(m, res, ix)}
      <a class="lien-fleche" href="#competition/${c.id}/manche/${m.id}">Voir toute la manche ${ICONES.fleche}</a>
    </article>`;
  }).join('');

  zone.innerHTML = `
    ${lienRetour(`#competition/${c.id}`, c.nom)}
    <div class="ma-page marbre-bordeaux cadre-or fiche-hero">
      <span class="plaque">${esc(p.plaque)}</span>
      <p class="nom">${esc(p.prenom)} ${esc(p.nom)}</p>
      <p class="infos">${drapeau(p.pays)} ${esc(nomPays(p.pays))} · ${esc(p.categorie)}</p>
      <a class="etiquette lien-equipe" href="#competition/${c.id}/equipe/${equipe.id}">${esc(equipe.nom)} ${ICONES.fleche}</a>
    </div>

    <div class="chiffres">
      <div class="${f && f.place <= 3 && cat.termine ? 'or' : ''}"><strong>${f ? place(f.place) : '—'}</strong><span>${cat.termine ? 'place finale' : 'place provisoire'}</span></div>
      <div><strong>${f ? esc(f.phaseAtteinte) : '—'}</strong><span>tour atteint</span></div>
      <div><strong>${q ? `${q.points} pts` : '—'}</strong><span>${q ? `qualifs (${place(q.rang)})` : 'qualifs'}</span></div>
      <div><strong>${Number.isFinite(meilleurTemps) ? temps(meilleurTemps) : '—'}</strong><span>meilleur temps</span></div>
    </div>
    ${q && cat.nbGroupes > 1 ? `<p class="note">${q.qualifie ? `${q.rangGroupe}${q.rangGroupe === 1 ? 'er' : 'e'} de son groupe de qualifs : <strong>qualifié</strong> pour le tableau final.` : `${q.rangGroupe}e de son groupe de qualifs : <strong>pas qualifié</strong> pour le tableau final (il fallait être dans les 4 premiers).`}</p>` : ''}

    ${blocSecteurs}

    <section class="bloc">
      <h2>Ses manches</h2>
      ${cartes || vide('Pas encore de manche', 'Ses temps arriveront ici pendant la course.')}
    </section>`;
}

// ===========================================================================
// 4. Fiche d'une équipe (pour cette compétition)
// ===========================================================================
function ecranEquipe(zone, c, id) {
  const ix = indexer(c);
  const e = ix.equipes[id];
  if (!e) { zone.innerHTML = lienRetour(`#competition/${c.id}`, c.nom) + vide('Équipe introuvable', ''); return; }
  const membres = e.pilotes.map((pid) => ix.pilotes[pid])
    .sort((a, b) => a.categorie.localeCompare(b.categorie) || (ix.final[a.id]?.place ?? 999) - (ix.final[b.id]?.place ?? 999));
  const places = membres.map((p) => ix.final[p.id]).filter(Boolean);
  const meilleure = places.sort((a, b) => a.place - b.place)[0];
  const finalistes = membres.filter((p) => ix.final[p.id]?.phaseAtteinte === 'Finale').length;
  const podiums = membres.filter((p) => ix.final[p.id]?.place <= 3 && ix.cats[p.categorie].termine).length;
  const qualifies = membres.filter((p) => ix.qualif[p.id]?.qualifie).length;

  const cartes = membres.map((p) => {
    const f = ix.final[p.id];
    const lignes = (ix.manchesDe[p.id] || []).map((m) => {
      const res = resultatDe(m, p.id);
      return `<tr data-lien="competition/${c.id}/manche/${m.id}" class="touchable">
        <th scope="row">${esc(m.tour === 'qualif' ? m.phase : m.phase === 'Finale' ? 'Finale' : `${m.phase} M${m.numero}`)}</th>
        <td>${res ? `<span class="pos ${res.place === 1 ? 'p1' : ''}">${place(res.place)}</span>` : '<span class="doux">à venir</span>'}</td>
        <td>${res ? (res.abandon ? 'Chute' : temps(res.passages[3])) : ''}</td>
      </tr>`;
    }).join('');
    return `<article class="carte-membre">
      <a class="ligne" href="#competition/${c.id}/pilote/${p.id}">
        ${plaquePetite(p)}
        <span class="ligne-texte"><strong>${esc(p.prenom)} ${esc(p.nom)}</strong><small>${esc(p.categorie)}${f ? ` · ${esc(f.phaseAtteinte)}` : ''}</small></span>
        ${f ? `<span class="ligne-place ${f.place <= 3 && ix.cats[p.categorie].termine ? 'top' : ''}">${place(f.place)}</span>` : ''}
        ${ICONES.fleche}
      </a>
      ${lignes ? `<div class="tableau-defile"><table class="t compacte"><thead><tr><th>Manche</th><th>Place</th><th>Temps</th></tr></thead><tbody>${lignes}</tbody></table></div>` : ''}
    </article>`;
  }).join('');

  zone.innerHTML = `
    ${lienRetour(`#competition/${c.id}`, c.nom)}
    <div class="ma-page marbre-bordeaux cadre-or fiche-hero">
      <span class="plaque initiales">${esc(initiales(e.nom))}</span>
      <p class="nom">${esc(e.nom)}</p>
      <p class="infos">${drapeau(e.pays)} ${esc(nomPays(e.pays))} · ${membres.length} pilote${membres.length > 1 ? 's' : ''} engagé${membres.length > 1 ? 's' : ''}</p>
      <span class="etiquette">${esc(c.nom)}</span>
    </div>
    <div class="chiffres">
      <div class="${meilleure && meilleure.place <= 3 ? 'or' : ''}"><strong>${meilleure ? place(meilleure.place) : '—'}</strong><span>meilleure place</span></div>
      <div><strong>${podiums}</strong><span>podium${podiums > 1 ? 's' : ''}</span></div>
      <div><strong>${finalistes}</strong><span>finaliste${finalistes > 1 ? 's' : ''}</span></div>
      <div><strong>${qualifies}</strong><span>qualifié${qualifies > 1 ? 's' : ''} tableau</span></div>
    </div>
    <section class="bloc">
      <h2>Ses pilotes</h2>
      <div class="membres">${cartes}</div>
    </section>`;
}

// ===========================================================================
// 5. Temps et classements
// ===========================================================================
function ecranResultats(zone, c) {
  const ix = indexer(c);
  const r = reglages(c.id);
  if (!r.cat || !ix.cats[r.cat]) r.cat = c.categories[0].nom;

  zone.innerHTML = `
    ${lienRetour(`#competition/${c.id}`, c.nom)}
    <h1 class="salut or-brillant">Temps et classements</h1>
    <p class="sous-titre">${esc(c.nom)}</p>
    ${puces('Catégorie', c.categories.map((k) => [k.nom, k.nom]), r.cat, 'puces-defile puces-cat')}
    ${segments('Que voir', [['classement', 'Classement'], ['qualifs', 'Qualifs'], ['manches', 'Manches']], r.vue)}
    <div id="res-contenu"></div>`;

  const contenu = zone.querySelector('#res-contenu');
  function maj() {
    const cat = ix.cats[r.cat];
    if (r.vue === 'classement') contenu.innerHTML = vueClassement(c, cat, ix);
    else if (r.vue === 'qualifs') contenu.innerHTML = vueQualifs(c, cat, ix);
    else contenu.innerHTML = vueManches(c, cat, ix, r);
    brancherLiens(contenu);
    if (r.vue === 'manches') {
      surChoix(contenu.querySelector('.puces-phase'), (v) => { r.phase = v; maj(); });
      surChoix(contenu.querySelector('.segments-affichage'), (v) => { r.affichage = v; maj(); });
    }
    animer(contenu);
  }
  surChoix(zone.querySelector('.puces-cat'), (v) => { r.cat = v; r.phase = null; maj(); });
  surChoix(zone.querySelector('.segments'), (v) => { r.vue = v; maj(); });
  maj();
}

function cellPilote(c, p, ix, avecEquipe = true, avecPlaque = true) {
  return `<td class="cel-pilote"><span class="cp">${avecPlaque ? plaquePetite(p) : ''}<span><strong>${esc(p.prenom[0])}. ${esc(p.nom)}</strong>${avecEquipe ? `<small>${drapeau(p.pays)} ${esc(ix.equipes[p.equipe].nom)}</small>` : ''}</span></span></td>`;
}

function vueClassement(c, cat, ix) {
  if (!cat.classement) return vide('Pas encore de classement', `Il arrivera après les premières manches, le ${dateCourte(c.debut)}.`);
  const lignes = cat.classement.map((x) => {
    const p = ix.pilotes[x.pilote];
    return `<tr data-lien="competition/${c.id}/pilote/${p.id}" class="touchable ${x.place <= 3 && cat.termine ? 'podium-ligne-t' : ''}">
      <td class="cel-place">${x.place <= 3 && cat.termine ? `<span class="medaille m${x.place}">${x.place}</span>` : x.place}</td>
      ${cellPilote(c, p, ix)}
      <td class="cel-droite">${esc(x.phaseAtteinte)}${x.phaseAtteinte === 'Qualifs' && x.points != null ? `<small>${x.points} pts</small>` : ''}</td>
    </tr>`;
  }).join('');
  return `
    ${cat.termine ? '' : '<p class="note"><strong>Classement provisoire</strong> : la catégorie n\'est pas finie.</p>'}
    <div class="tableau-defile"><table class="t t-classement">
      <thead><tr><th>Pl.</th><th>Pilote</th><th class="cel-droite">Tour atteint</th></tr></thead>
      <tbody>${lignes}</tbody>
    </table></div>
    <p class="astuce">Les pilotes sont classés par le tour qu'ils ont atteint, puis par leur place dans la manche où ils ont été éliminés.</p>`;
}

function vueQualifs(c, cat, ix) {
  if (!cat.qualifs) return vide('Les qualifs n\'ont pas commencé', `Elles commencent le ${dateCourte(c.debut)}.`);
  const qm = c.manches.filter((m) => m.categorie === cat.nom && m.tour === 'qualif');
  const lignes = cat.qualifs.map((x) => {
    const p = ix.pilotes[x.pilote];
    const placesQ = [1, 2, 3].map((n) => {
      const m = qm.find((mm) => mm.phase === `Qualif ${n}` && mm.pilotes.includes(p.id));
      const res = m && resultatDe(m, p.id);
      return `<td class="cel-num">${res ? (res.abandon ? `<span class="chute" title="Chute">${res.place}</span>` : res.place) : '—'}</td>`;
    }).join('');
    return `<tr data-lien="competition/${c.id}/pilote/${p.id}" class="touchable">
      <td class="cel-place">${x.rang}</td>
      ${cellPilote(c, p, ix, false)}
      <td class="cel-num doux">${x.groupe}</td>
      ${placesQ}
      <td class="cel-num"><strong>${x.points}</strong></td>
      <td class="cel-num">${x.qualifie ? '<span class="q">Q</span>' : ''}</td>
    </tr>`;
  }).join('');
  return `
    <p class="astuce">Chaque pilote fait 3 manches. 1re place = 1 point, 2e = 2 points… Le moins de points gagne.${cat.nbGroupes > 1 ? ' <span class="q">Q</span> = dans les 4 premiers de son groupe, qualifié pour le tableau final.' : ' Ici, pas de tableau : le classement aux points est le classement final.'}</p>
    <div class="tableau-defile"><table class="t t-qualifs">
      <thead><tr><th>Rg</th><th>Pilote</th><th class="cel-num">Gr.</th><th class="cel-num">Q1</th><th class="cel-num">Q2</th><th class="cel-num">Q3</th><th class="cel-num">Pts</th><th></th></tr></thead>
      <tbody>${lignes}</tbody>
    </table></div>`;
}

function tableManche(c, m, ix, affichage) {
  if (!m.pilotes) return `<p class="doux petit">Les pilotes seront connus après le tour précédent.</p>`;
  if (!m.resultats) {
    return `<ul class="mini-liste">${m.pilotes.map((id) => { const p = ix.pilotes[id]; return `<li><a href="#competition/${c.id}/pilote/${p.id}">${plaquePetite(p)} ${esc(p.prenom)} ${esc(p.nom)}</a></li>`; }).join('')}</ul>`;
  }
  const premier = m.resultats[0].passages;
  const tousSecteurs = m.resultats.map((x) => secteurs(x.passages));
  const meilleursS = [0, 1, 2, 3].map((i) => Math.min(...tousSecteurs.map((s) => s[i]).filter((v) => v != null)));
  let tete; let corps;
  if (affichage === 'secteurs') {
    tete = `<th>Pl.</th><th>Pilote</th>${['S1', 'S2', 'S3', 'S4'].map((s) => `<th class="cel-num">${s}</th>`).join('')}`;
    corps = m.resultats.map((x, k) => {
      const p = ix.pilotes[x.pilote];
      return `<tr data-lien="competition/${c.id}/pilote/${p.id}" class="touchable">
        <td class="cel-place">${x.place}</td>${cellPilote(c, p, ix, false, false)}
        ${tousSecteurs[k].map((v, i) => `<td class="cel-num ${v != null && v === meilleursS[i] ? 'meilleur' : ''}">${temps(v)}</td>`).join('')}
      </tr>`;
    }).join('');
  } else if (affichage === 'passages') {
    tete = `<th>Pl.</th><th>Pilote</th>${['Inter 1', 'Inter 2', 'Inter 3'].map((s) => `<th class="cel-num">${s}</th>`).join('')}`;
    corps = m.resultats.map((x) => {
      const p = ix.pilotes[x.pilote];
      return `<tr data-lien="competition/${c.id}/pilote/${p.id}" class="touchable">
        <td class="cel-place">${x.place}</td>${cellPilote(c, p, ix, false, false)}
        ${[0, 1, 2].map((i) => {
          const t = x.passages[i];
          const tri = m.resultats.map((y) => y.passages[i]).filter((v) => v != null).sort((a, b) => a - b);
          const pos = t == null ? null : tri.indexOf(t) + 1;
          return `<td class="cel-num">${t == null ? '—' : `${temps(t)}<small class="pos-mini ${pos === 1 ? 'p1' : ''}">${place(pos)}</small>`}</td>`;
        }).join('')}
      </tr>`;
    }).join('');
  } else {
    tete = '<th>Pl.</th><th class="cel-num">Coul.</th><th>Pilote</th><th class="cel-num">Temps</th><th class="cel-num">Écart</th>';
    corps = m.resultats.map((x) => {
      const p = ix.pilotes[x.pilote];
      const passe = m.tour !== 'qualif' && m.phase !== 'Finale' && x.place <= 4;
      return `<tr data-lien="competition/${c.id}/pilote/${p.id}" class="touchable ${passe ? 'passe' : ''}">
        <td class="cel-place">${m.phase === 'Finale' && x.place <= 3 ? `<span class="medaille m${x.place}">${x.place}</span>` : x.place}</td>
        <td class="cel-num doux">${x.couloir}</td>
        ${cellPilote(c, p, ix, false)}
        <td class="cel-num">${x.abandon ? '<span class="chute">Chute</span>' : temps(x.passages[3])}</td>
        <td class="cel-num doux">${x.abandon ? '' : ecart(x.passages[3] - premier[3])}</td>
      </tr>`;
    }).join('');
  }
  return `<div class="tableau-defile"><table class="t"><thead><tr>${tete}</tr></thead><tbody>${corps}</tbody></table></div>`;
}

function vueManches(c, cat, ix, r) {
  const phases = ['Qualif 1', 'Qualif 2', 'Qualif 3', ...cat.tours];
  if (!r.phase || !phases.includes(r.phase)) {
    // par défaut : le dernier tour qui a des résultats
    const faites = phases.filter((ph) => c.manches.some((m) => m.categorie === cat.nom && m.phase === ph && m.resultats));
    r.phase = faites[faites.length - 1] || 'Qualif 1';
  }
  const ms = c.manches.filter((m) => m.categorie === cat.nom && m.phase === r.phase);
  const cartes = ms.map((m) => `
    <article class="carte-manche">
      <header class="mp-tete"><strong>${esc(nomManche(m))}</strong><span>${esc(dateCourte(m.date))} · ${esc(m.heure)}</span></header>
      ${tableManche(c, m, ix, r.affichage)}
      ${m.pilotes ? `<a class="lien-fleche" href="#competition/${c.id}/manche/${m.id}">Tout le détail de la manche ${ICONES.fleche}</a>` : ''}
    </article>`).join('');
  return `
    ${puces('Tour', phases.map((ph) => [ph, ph]), r.phase, 'puces-defile puces-phase')}
    ${segments('Affichage', [['arrivee', 'Arrivée'], ['secteurs', 'Secteurs'], ['passages', 'Passages']], r.affichage).replace('class="segments"', 'class="segments segments-affichage petit"')}
    ${r.affichage === 'secteurs' ? `<p class="astuce">${c.nomsSecteurs.map((n, i) => `<strong>S${i + 1}</strong> ${esc(n)}`).join(' · ')}. En or : le meilleur de la manche.</p>` : ''}
    ${r.affichage === 'passages' ? '<p class="astuce">Temps au passage de chaque ligne, avec la place du pilote à ce moment-là.</p>' : ''}
    ${r.affichage === 'arrivee' && r.phase !== 'Finale' && !r.phase.startsWith('Qualif') ? '<p class="astuce">Les lignes surlignées passent au tour suivant (4 premiers).</p>' : ''}
    <div class="liste-manches">${cartes}</div>`;
}

// ===========================================================================
// 6. Une manche en détail
// ===========================================================================
function ecranManche(zone, c, id) {
  const ix = indexer(c);
  const m = ix.manches[id];
  if (!m) { zone.innerHTML = lienRetour(`#competition/${c.id}`, c.nom) + vide('Manche introuvable', ''); return; }
  zone.innerHTML = `
    ${lienRetour(`#competition/${c.id}/resultats`, 'Temps et classements')}
    <h1 class="salut or-brillant">${esc(nomManche(m))}</h1>
    <p class="sous-titre">${esc(m.categorie)} · ${esc(dateJour(m.date))} à ${esc(m.heure)}<br>${esc(c.nom)}</p>
    ${!m.resultats ? `<section class="bloc"><h2>Pilotes</h2>${tableManche(c, m, ix, 'arrivee')}<p class="note">Cette manche n'a pas encore été courue.</p></section>` : `
    <section class="bloc"><h2>Arrivée</h2>${tableManche(c, m, ix, 'arrivee')}</section>
    <section class="bloc"><h2>Temps par secteur</h2>
      <p class="astuce">${c.nomsSecteurs.map((n, i) => `<strong>S${i + 1}</strong> ${esc(n)}`).join(' · ')}. En or : le plus rapide.</p>
      ${tableManche(c, m, ix, 'secteurs')}</section>
    <section class="bloc"><h2>Passages</h2>
      <p class="astuce">Temps à chaque ligne et place à ce moment-là : on voit qui a doublé qui.</p>
      ${tableManche(c, m, ix, 'passages')}</section>`}`;
}

// ===========================================================================
// 7. Tableau final (l'arbre)
// ===========================================================================
const TOURS = ['1/32', '1/16', '1/8', '1/4', '1/2', 'Finale'];

function ecranTableau(zone, c) {
  const ix = indexer(c);
  const r = reglages(c.id);
  const avecTableau = c.categories.filter((k) => k.nbGroupes > 1);
  if (!r.cat || !ix.cats[r.cat] || ix.cats[r.cat].nbGroupes === 1) r.cat = (avecTableau[0] || c.categories[0]).nom;

  zone.innerHTML = `
    ${lienRetour(`#competition/${c.id}`, c.nom)}
    <h1 class="salut or-brillant">Tableau final</h1>
    <p class="sous-titre">${esc(c.nom)}</p>
    ${puces('Catégorie', c.categories.map((k) => [k.nom, k.nom]), r.cat, 'puces-defile puces-cat')}
    <div id="arbre-contenu"></div>`;
  const contenu = zone.querySelector('#arbre-contenu');

  function maj() {
    const cat = ix.cats[r.cat];
    if (cat.nbGroupes === 1) {
      contenu.innerHTML = vide('Pas de tableau pour cette catégorie', '8 pilotes ou moins : le classement se fait aux points des 3 manches de qualifs.')
        + `<a class="lien-fleche" href="#competition/${c.id}/resultats">Voir le classement ${ICONES.fleche}</a>`;
      return;
    }
    // depuis quel tour afficher ? (par défaut les 1/4, pour que ce soit lisible sur téléphone)
    const tours = cat.tours;
    if (!r.depuis || !tours.includes(r.depuis)) r.depuis = tours.includes('1/4') ? '1/4' : tours[0];
    const affiches = tours.slice(tours.indexOf(r.depuis));
    const colonnes = affiches.map((tour, ci) => {
      const ms = c.manches.filter((m) => m.categorie === cat.nom && m.phase === tour);
      return `<div class="arbre-col" data-col="${ci}">
        <h3>${tour === 'Finale' ? 'Finale' : esc(tour)}</h3>
        <div class="arbre-manches">${ms.map((m, k) => carteArbre(c, m, ix, k)).join('')}</div>
      </div>`;
    }).join('');
    contenu.innerHTML = `
      ${tours.length > 1 ? `<p class="petit-label">Voir à partir de :</p>${puces('Depuis', tours.filter((t) => t !== 'Finale').map((t) => [t, t]), r.depuis, 'puces-depuis')}` : ''}
      <p class="astuce">Les <span class="q">4 premiers</span> de chaque manche passent au tour suivant. Fais glisser vers la droite pour aller jusqu'à la finale. Appuie sur une manche pour tous ses temps.</p>
      <div class="arbre-defile"><div class="arbre">${colonnes}<svg class="arbre-liens" aria-hidden="true"></svg></div></div>`;
    surChoix(contenu.querySelector('.puces-depuis'), (v) => { r.depuis = v; maj(); });
    requestAnimationFrame(() => tracerLiens(contenu));
  }
  surChoix(zone.querySelector('.puces-cat'), (v) => { r.cat = v; r.depuis = null; maj(); animer(contenu); });
  maj();
  arbreAffiche = contenu;
}

// l'arbre se redessine si l'écran tourne
let arbreAffiche = null;
window.addEventListener('resize', () => { if (arbreAffiche?.isConnected) tracerLiens(arbreAffiche); }, { passive: true });

function carteArbre(c, m, ix, k) {
  const finale = m.phase === 'Finale';
  let corps;
  if (!m.pilotes) {
    corps = `<li class="attente">À déterminer</li>`.repeat(1);
  } else if (!m.resultats) {
    corps = m.pilotes.map((id) => { const p = ix.pilotes[id]; return `<li><span class="pl"></span><span class="nm">${esc(p.prenom[0])}. ${esc(p.nom)}</span><span class="tp doux">${drapeau(p.pays)}</span></li>`; }).join('');
  } else {
    corps = m.resultats.map((x) => {
      const p = ix.pilotes[x.pilote];
      const classe = finale ? (x.place <= 3 ? `med m${x.place}` : '') : x.place <= 4 ? 'q' : '';
      return `<li class="${classe}"><span class="pl">${x.place}</span><span class="nm">${esc(p.prenom[0])}. ${esc(p.nom)}</span><span class="tp">${x.abandon ? 'Chute' : temps(x.passages[3])}</span></li>`;
    }).join('');
  }
  return `<a class="arbre-manche ${finale ? 'finale' : ''} ${m.resultats ? '' : 'pas-couru'}" href="#competition/${c.id}/manche/${m.id}" data-k="${k}">
    <header><strong>${finale ? 'Finale' : `Manche ${m.numero}`}</strong><span>${m.resultats ? esc(m.heure) : `à ${esc(m.heure)}`}</span></header>
    <ol>${corps}</ol>
  </a>`;
}

// Traits qui relient deux manches à la manche suivante
function tracerLiens(contenu) {
  const arbre = contenu.querySelector('.arbre');
  const svg = contenu.querySelector('.arbre-liens');
  if (!arbre || !svg) return;
  const base = arbre.getBoundingClientRect();
  svg.setAttribute('width', arbre.scrollWidth);
  svg.setAttribute('height', arbre.scrollHeight);
  const cols = [...arbre.querySelectorAll('.arbre-col')];
  let chemins = '';
  for (let ci = 1; ci < cols.length; ci++) {
    const avant = [...cols[ci - 1].querySelectorAll('.arbre-manche')];
    const apres = [...cols[ci].querySelectorAll('.arbre-manche')];
    apres.forEach((carte, k) => {
      const b = carte.getBoundingClientRect();
      const x2 = b.left - base.left; const y2 = b.top - base.top + b.height / 2;
      [avant[2 * k], avant[2 * k + 1]].filter(Boolean).forEach((a) => {
        const ra = a.getBoundingClientRect();
        const x1 = ra.right - base.left; const y1 = ra.top - base.top + ra.height / 2;
        const xm = (x1 + x2) / 2;
        chemins += `<path d="M${x1} ${y1} H${xm} V${y2} H${x2}"/>`;
      });
    });
  }
  svg.innerHTML = chemins;
}

// ===========================================================================
// Vraies compétitions (UCI, UEC, FFC…) : infos, classements publiés, sources
// ===========================================================================
function ligneClassement(c, x, cat) {
  const p = c.pilotes[x.pilote];
  return `<li><a class="ligne" href="#competition/${c.id}/pilote/${p.id}">
    <span class="medaille ${x.place <= 3 ? `m${x.place}` : 'mx'}">${x.place}</span>
    <span class="ligne-texte"><strong>${esc(p.prenom)} ${esc(p.nom)}</strong><small>${drapeau(p.pays)} ${esc(nomPays(p.pays))}${x.temps != null ? ` · ${temps(x.temps)} s` : ''}</small></span>
    ${ICONES.fleche}</a></li>`;
}

function ecranCompetitionReelle(zone, c) {
  const nbCats = c.categories.length;
  const classements = c.categories.map((k) => {
    const trous = k.classement.some((x, i) => i > 0 && x.place !== k.classement[i - 1].place + 1);
    return `<div class="podium">
      <h3>${esc(k.nom)}</h3>
      <ol class="lignes">${k.classement.map((x) => ligneClassement(c, x, k)).join('')}</ol>
      ${trous ? '<p class="doux petit">Les autres places n’ont pas été publiées.</p>' : ''}
    </div>`;
  }).join('');

  const attente = c.statut === 'a-venir'
    ? `Les courses commencent le ${esc(dateCourte(c.debut))} : les résultats arriveront ici après la compétition.`
    : c.statut === 'en-cours'
      ? 'La compétition est en cours : les résultats arriveront ici dès qu’ils seront publiés.'
      : 'Les résultats de cette compétition n’ont pas encore été ajoutés dans DBSpeed.';

  zone.innerHTML = `
    ${lienRetour('#competition', 'Compétitions')}
    <div class="c-hero marbre-bordeaux cadre-or">
      <div class="c-hero-haut">${badgeStatut(c.statut)}<span class="etiquette">${esc(c.type)}</span></div>
      <h1 class="c-titre">${esc(c.nom)}</h1>
      <p class="c-hero-ligne">${ICONES.lieu}<span>${drapeau(c.pays)} ${esc(c.ville)}, ${esc(c.nomPays)}</span></p>
      <p class="c-hero-ligne">${ICONES.calendrier}<span>${esc(periode(c))}</span></p>
    </div>
    <p class="c-description">${esc(c.description)}</p>

    <section class="bloc">
      <h2>Infos</h2>
      <dl class="infos-liste">
        <div>${ICONES.lieu}<dt>Lieu</dt><dd>${c.piste ? `${esc(c.piste)}<br>` : ''}${esc(c.ville)}, ${drapeau(c.pays)} ${esc(c.nomPays)}</dd></div>
        <div>${ICONES.calendrier}<dt>Dates</dt><dd>${esc(periode(c))}</dd></div>
        <div>${ICONES.drapeau}<dt>Type de course</dt><dd>${esc(c.type)} · niveau ${esc(c.niveau.toLowerCase())}</dd></div>
        <div>${ICONES.orga}<dt>Organisateur</dt><dd>${esc(c.organisateur)}</dd></div>
      </dl>
    </section>

    <section class="bloc">
      <h2>Résultats</h2>
      ${nbCats ? `<div class="podiums">${classements}</div>` : vide('Pas encore de résultats', attente)}
      <p class="note">Le détail des manches (temps à chaque ligne, secteurs, tableau final) n’est pas publié en données ouvertes. Il arrivera quand l’organisateur importera son fichier de chronométrage dans DBSpeed.</p>
    </section>

    <section class="bloc">
      <h2>Sources</h2>
      <ul class="sources">${c.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.nom)}</a></li>`).join('')}</ul>
    </section>`;
}

function ecranPiloteReel(zone, c, id) {
  const p = c.pilotes[id];
  if (!p) { zone.innerHTML = lienRetour(`#competition/${c.id}`, c.nom) + vide('Pilote introuvable', ''); return; }
  const meilleure = Math.min(...p.resultats.map((r) => r.place));
  zone.innerHTML = `
    ${lienRetour(`#competition/${c.id}`, c.nom)}
    <div class="fiche-hero marbre-bordeaux cadre-or">
      <span class="place-grosse">${placeF(meilleure, /Femmes/.test(p.resultats[0].categorie))}</span>
      <h1 class="c-titre">${esc(p.prenom)} ${esc(p.nom)}</h1>
      <p class="c-hero-ligne">${drapeau(p.pays)} <span>${esc(nomPays(p.pays))}</span></p>
    </div>
    <section class="bloc">
      <h2>Ses résultats ici</h2>
      <ul class="lignes">${p.resultats.map((r) => `<li><div class="ligne">
        <span class="medaille ${r.place <= 3 ? `m${r.place}` : 'mx'}">${r.place}</span>
        <span class="ligne-texte"><strong>${esc(r.categorie)}</strong><small>${r.place === 1 ? 'Victoire' : `${placeF(r.place, /Femmes/.test(r.categorie))} place`}${r.temps != null ? ` · ${temps(r.temps)} s` : ''}</small></span>
      </div></li>`).join('')}</ul>
      <p class="note">Les temps de ses manches et à chaque ligne ne sont pas publiés pour cette compétition.</p>
    </section>`;
}

// ===========================================================================
// Championnat de France des clubs : DN1 2026
// ===========================================================================
const clubDN1 = (id) => DN1_2026.clubs.find((x) => x.id === id);
const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;

function ecranDN1(zone) {
  const d = DN1_2026;
  const champion = clubDN1(d.champion);
  const clubs = [...d.clubs].sort((a, b) => a.ville.localeCompare(b.ville, 'fr'));
  const ligneClub = (x) => `<li><a class="ligne" href="#competition/dn1/${x.id}">
      <span class="logo-equipe">${esc(x.sigle)}</span>
      <span class="ligne-texte"><strong>${esc(x.equipe)}</strong><small>${esc(x.ville)} · ${pluriel(x.femmes.length, 'femme', 'femmes')} · ${pluriel(x.hommes.length, 'homme', 'hommes')}</small></span>
      ${x.id === d.champion ? '<span class="ligne-place top">Champion</span>' : ''}${ICONES.fleche}</a></li>`;
  const ligneRang = ([id, points], i) => {
    const x = clubDN1(id);
    return `<li><a class="ligne" href="#competition/dn1/${x.id}">
      <span class="medaille ${i < 3 ? `m${i + 1}` : 'mx'}">${i + 1}</span>
      <span class="ligne-texte"><strong>${esc(x.equipe)}</strong><small>${esc(x.ville)}</small></span>
      <span class="ligne-place">${points} pts</span>${ICONES.fleche}</a></li>`;
  };
  zone.innerHTML = `
    ${lienRetour('#competition', 'Compétitions')}
    <div class="c-hero marbre-bordeaux cadre-or">
      <div class="c-hero-haut"><span class="etiquette">Championnat de France des clubs</span></div>
      <h1 class="c-titre">DN1 ${d.saison}</h1>
      <p class="c-hero-ligne">${ICONES.drapeau}<span>Champion : ${esc(champion.club)}</span></p>
    </div>
    <p class="c-description">Les 10 meilleurs clubs de France. Chaque équipe a de 5 à 10 pilotes, femmes et hommes ensemble (Elite, U23 et juniors U19). Ses 5 meilleurs résultats comptent à chaque Coupe de France et aux championnats de France.</p>

    <section class="bloc">
      <h2>Les 10 équipes</h2>
      <ul class="lignes">${clubs.map(ligneClub).join('')}</ul>
    </section>

    <section class="bloc">
      <h2>Classement d’avril</h2>
      <p class="doux petit">Classement publié après les premières manches. Le classement final n’est pas encore publié en détail : seul le champion est connu (${esc(champion.club)}).</p>
      <ol class="lignes">${d.classementAvril.map(ligneRang).join('')}</ol>
    </section>

    <section class="bloc">
      <h2>Les autres titres</h2>
      <dl class="infos-liste">
        <div>${ICONES.drapeau}<dt>DN2</dt><dd>${esc(d.vainqueurDN2)} (15 équipes)</dd></div>
        <div>${ICONES.drapeau}<dt>Équipe Avenir</dt><dd>${esc(d.vainqueurEquipeAvenir)}</dd></div>
      </dl>
    </section>

    <section class="bloc">
      <h2>Sources</h2>
      <ul class="sources">${d.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.nom)}</a></li>`).join('')}</ul>
    </section>`;
}

function ecranClubDN1(zone, id) {
  const x = clubDN1(id);
  if (!x) { zone.innerHTML = lienRetour('#competition/dn1', 'DN1') + vide('Équipe introuvable', ''); return; }
  const rang = DN1_2026.classementAvril.findIndex(([cle]) => cle === id) + 1;
  const lignePilote = ([nom, pays, cat]) => `<li><div class="ligne">
      <span class="ligne-texte"><strong>${esc(nom)}</strong><small>${drapeau(pays)} ${esc(nomPays(pays))}</small></span>
      <span class="ligne-place${cat === 'Elite' ? ' top' : ''}">${esc(cat)}</span></div></li>`;
  const groupe = (titre, liste) => `<section class="bloc">
      <h2>${titre} <span class="doux">(${liste.length})</span></h2>
      ${liste.length ? `<ul class="lignes">${liste.map(lignePilote).join('')}</ul>` : '<p class="doux">Pas de pilote Elite ou U23 dans l’équipe.</p>'}
    </section>`;
  const u19 = x.u19.filles + x.u19.garcons;
  zone.innerHTML = `
    ${lienRetour('#competition/dn1', 'DN1 2026')}
    <div class="c-hero marbre-bordeaux cadre-or">
      <div class="c-hero-haut"><span class="etiquette">DN1 ${DN1_2026.saison}</span>${id === DN1_2026.champion ? '<span class="etiquette">Champion de France</span>' : ''}</div>
      <h1 class="c-titre">${esc(x.equipe)}</h1>
      <p class="c-hero-ligne">${ICONES.lieu}<span>${esc(x.ville)} · ${esc(x.region)}</span></p>
      ${x.club && x.club !== x.equipe ? `<p class="c-hero-ligne">${ICONES.orga}<span>Club : ${esc(x.club)}</span></p>` : ''}
      ${rang ? `<p class="c-hero-ligne">${ICONES.drapeau}<span>${rang}${rang === 1 ? 'er' : 'e'} au classement d’avril</span></p>` : ''}
    </div>
    ${groupe('Femmes', x.femmes)}
    ${groupe('Hommes', x.hommes)}
    ${u19 ? `<p class="note">Et ${pluriel(u19, 'pilote junior (U19)', 'pilotes juniors (U19)')} : leurs noms ne sont pas affichés.</p>` : ''}
    <section class="bloc">
      <h2>Source</h2>
      <ul class="sources"><li><a href="${esc(DN1_2026.sources[0].url)}" target="_blank" rel="noopener">${esc(DN1_2026.sources[0].nom)}</a></li></ul>
    </section>`;
}
