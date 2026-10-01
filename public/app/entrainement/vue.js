// DBSpeed — onglet Entraînement
// Écrans (adresse après #entrainement) :
//   (rien)               → calendrier : jours, mois, années ; les jours avec des données sont dorés
//   /jour/AAAA-MM-JJ     → la journée : piste, tracé, nombre de tours, liste des tours, publier
//   /tour/ID             → un tour : tous les intermédiaires, comparés au record, à mon meilleur et à mes amis
//   /classement[/PISTE]  → classement d'une piste (meilleur tour publié de chaque pilote)
// Un compte organisateur ou spectateur arrive directement sur le classement.
import { messageErreur } from '/app/supabase.js';

// ---------------------------------------------------------------------------
// Mémoire de l'onglet (pour retrouver le même mois en revenant en arrière)
// ---------------------------------------------------------------------------
const aujourdHui = new Date();
const memoire = {
  annee: aujourdHui.getFullYear(),
  mois: aujourdHui.getMonth(),
  piste: null,           // piste choisie dans le classement
  reference: 'record',   // à quoi on compare un tour
  moisPositionne: false, // le calendrier s'est déjà placé sur le dernier mois avec des données
};
const cache = { seances: null, pistes: null };
const positions = new Map();
let dernierEcran = null;
let retourDemande = false;
let jeton = 0;
let ctx = null; // { supabase, profil }

export function oublierEntrainement() {
  cache.seances = null;
}

// ---------------------------------------------------------------------------
// Petits outils
// ---------------------------------------------------------------------------
const calme = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nombre = (v) => (v == null || v === '' ? null : Number(v));
const temps = (t) => (t == null ? '—' : Number(t).toFixed(3));
const ecartTexte = (d) => (d == null ? '—' : Math.abs(d) < 0.0005 ? '0.000' : `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(3)}`);
const ecartClasse = (d) => (d == null || Math.abs(d) < 0.0005 ? '' : d < 0 ? 'gagne' : 'perd');
const prenom = (nom) => (nom || '').trim().split(/\s+/)[0] || 'Pilote';

const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const JOURS_INITIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const deux = (n) => String(n).padStart(2, '0');
const iso = (a, m, j) => `${a}-${deux(m + 1)}-${deux(j)}`;
const isoAujourdHui = () => { const d = new Date(); return iso(d.getFullYear(), d.getMonth(), d.getDate()); };
const decouper = (texte) => { const [a, m, j] = texte.split('-').map(Number); return { a, m: m - 1, j }; };
const valide = (texte) => /^\d{4}-\d{2}-\d{2}$/.test(texte || '');
function dateLongue(texte) {
  const d = decouper(texte);
  return `${majuscule(JOURS[new Date(d.a, d.m, d.j).getDay()])} ${d.j} ${MOIS_LONG[d.m]}${d.a !== aujourdHui.getFullYear() ? ` ${d.a}` : ''}`;
}
function dateCourte(texte) {
  const d = decouper(texte);
  return `${d.j} ${MOIS_COURT[d.m]}${d.a !== aujourdHui.getFullYear() ? ` ${d.a}` : ''}`;
}

// temps de chaque secteur à partir des temps cumulés (secteur 1 = départ → Inter 1)
function secteurs(cumul) {
  return cumul.map((t, i) => (t == null ? null : i === 0 ? t : cumul[i - 1] == null ? null : Math.round((t - cumul[i - 1]) * 1000) / 1000));
}
// noms des lignes après le départ (Inter 1, Inter 2…, Arrivée)
function nomsLignes(piste, n) {
  const noms = (piste?.lignes || []).slice(1).map((l) => l.nom);
  return Array.from({ length: n }, (_, i) => noms[i] || (i === n - 1 ? 'Arrivée' : `Inter ${i + 1}`));
}
// dernière ligne passée, pour un tour pas fini
function arretApres(piste, t) {
  let dernier = -1;
  t.forEach((v, i) => { if (v != null) dernier = i; });
  if (dernier < 0) return 'Chute au départ';
  return `Arrêt après ${nomsLignes(piste, t.length)[dernier]}`;
}

const ICONES = {
  retour: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
  avant: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  fleche: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  bas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  lieu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  coupe: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 21h8M9 18h6"/></svg>',
  rejouer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/></svg>',
  publier: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 14v5h14v-5"/></svg>',
  poubelle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/></svg>',
  amis: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.6c2.8-.3 5 1.4 5.6 4.4"/></svg>',
};

function lienRetour(href, texte) {
  return `<a class="retour" href="${href}" data-retour>${ICONES.retour}<span>${esc(texte)}</span></a>`;
}
function vide(titre, texte) {
  return `<div class="vide"><strong>${esc(titre)}</strong>${esc(texte)}</div>`;
}
function puces(nom, options, actif, classe = '') {
  return `<div class="puces ${classe}" role="group" aria-label="${esc(nom)}">${options.map(([valeur, texte]) =>
    `<button type="button" class="puce" data-valeur="${esc(valeur)}" aria-pressed="${valeur === actif}">${esc(texte)}</button>`).join('')}</div>`;
}
function surChoix(conteneur, quand) {
  conteneur?.querySelectorAll('button[data-valeur]').forEach((b) => b.addEventListener('click', () => {
    conteneur.querySelectorAll('button[data-valeur]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    quand(b.dataset.valeur);
  }));
}
function animer(zone, classe) {
  zone.classList.remove('glisse', 'glisse-gauche', 'glisse-droite');
  void zone.offsetWidth;
  zone.classList.add(classe);
}
function erreurEcran(zone, err, retour = true) {
  zone.innerHTML = `${retour ? lienRetour('#entrainement', 'Calendrier') : ''}
    <div class="vide"><strong>Impossible de charger.</strong>${esc(messageErreur(err))}</div>`;
}

// Petite question « tu es sûr ? » qui s'ouvre sous un bouton
function demander(apres, { texte, oui, classeOui = 'bouton-or bouton-principal' }) {
  return new Promise((resoudre) => {
    apres.parentElement.querySelector('.question')?.remove();
    const q = document.createElement('div');
    q.className = 'question';
    q.hidden = true;
    q.innerHTML = `<p>${texte}</p>
      <div class="question-boutons">
        <button type="button" class="bouton bouton-secondaire" data-non>Annuler</button>
        <button type="button" class="bouton ${classeOui}" data-oui>${esc(oui)}</button>
      </div>`;
    apres.after(q);
    window.montrer ? window.montrer(q, true) : (q.hidden = false);
    const fermer = (rep) => {
      window.montrer ? window.montrer(q, false) : (q.hidden = true);
      setTimeout(() => q.remove(), 260);
      resoudre(rep);
    };
    q.querySelector('[data-non]').addEventListener('click', () => fermer(false));
    q.querySelector('[data-oui]').addEventListener('click', () => fermer(true));
  });
}

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------
async function pistes() {
  if (cache.pistes) return cache.pistes;
  const { data, error } = await ctx.supabase.from('pistes').select('id, nom, lieu, trace, lignes, exemple').order('nom');
  if (error) throw error;
  cache.pistes = new Map(data.map((p) => [p.id, p]));
  return cache.pistes;
}

async function seances() {
  if (cache.seances) return cache.seances;
  const { data, error } = await ctx.supabase
    .from('entrainements')
    .select('id, jour, piste, publie, exemple, tours(count)')
    .order('jour', { ascending: true })
    .limit(5000);
  if (error) throw error;
  cache.seances = data.map((s) => ({ ...s, nbTours: s.tours?.[0]?.count ?? 0 }));
  return cache.seances;
}

function normaliserTour(t) {
  const tp = (t.temps || []).map(nombre);
  return { ...t, temps: tp, temps_final: nombre(t.temps_final) };
}

// ---------------------------------------------------------------------------
// Le tracé de la piste (SVG), avec ses lignes de chronométrage
// ---------------------------------------------------------------------------
let numeroTrace = 0;
function svgTrace(piste, { classe = '' } = {}) {
  const n = ++numeroTrace;
  return `<figure class="trace ${classe}" data-trace>
    <svg viewBox="0 0 320 210" role="img" aria-label="Tracé de la piste ${esc(piste.nom)}">
      <defs>
        <pattern id="damier-${n}" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" class="damier-clair"/><rect width="3" height="3" class="damier-fonce"/><rect x="3" y="3" width="3" height="3" class="damier-fonce"/>
        </pattern>
      </defs>
      <path class="t-bord" d="${esc(piste.trace)}"/>
      <path class="t-terre" d="${esc(piste.trace)}"/>
      <path class="t-bosses" d="${esc(piste.trace)}"/>
      <path class="t-milieu" d="${esc(piste.trace)}"/>
      <g class="t-secteurs"></g>
      <g class="t-lignes" data-damier="damier-${n}"></g>
      <circle class="t-pilote" r="7" hidden/>
    </svg>
  </figure>`;
}

// Place les lignes sur le tracé et le fait se dessiner
function preparerTrace(figure, piste) {
  const svg = figure.querySelector('svg');
  const chemin = svg.querySelector('.t-terre');
  const L = chemin.getTotalLength();
  figure._L = L;
  figure._lignes = (piste.lignes || []).map((l) => Math.max(0, Math.min(1, Number(l.pos) || 0)) * L);
  const ns = 'http://www.w3.org/2000/svg';
  const groupe = svg.querySelector('.t-lignes');
  const damier = groupe.dataset.damier;
  (piste.lignes || []).forEach((ligne, i) => {
    const d = figure._lignes[i];
    const p = chemin.getPointAtLength(d);
    const a = chemin.getPointAtLength(Math.max(0, d - 1));
    const b = chemin.getPointAtLength(Math.min(L, d + 1));
    const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    const g = document.createElementNS(ns, 'g');
    const premiere = i === 0;
    const derniere = i === piste.lignes.length - 1;
    g.setAttribute('class', `t-ligne ${premiere ? 'depart' : derniere ? 'arrivee' : 'inter'}`);
    g.setAttribute('transform', `translate(${p.x} ${p.y})`);
    g.style.setProperty('--i', i);
    const barre = document.createElementNS(ns, 'rect');
    barre.setAttribute('x', -2.5); barre.setAttribute('y', -12);
    barre.setAttribute('width', derniere ? 6 : 4); barre.setAttribute('height', 24);
    barre.setAttribute('transform', `rotate(${angle})`);
    if (derniere) barre.setAttribute('fill', `url(#${damier})`);
    g.append(barre);
    // étiquette : D, I1, I2…, A
    const court = premiere ? 'D' : derniere ? 'A' : `I${i}`;
    const nx = -Math.sin(angle * Math.PI / 180);
    const ny = Math.cos(angle * Math.PI / 180);
    const sens = p.y < 105 ? -1 : 1;
    const ex = nx * 22 * sens;
    const ey = ny * 22 * sens;
    const bulle = document.createElementNS(ns, 'g');
    bulle.setAttribute('class', 't-etiquette');
    bulle.setAttribute('transform', `translate(${ex.toFixed(1)} ${ey.toFixed(1)})`);
    const fond = document.createElementNS(ns, 'rect');
    const largeur = court.length > 1 ? 22 : 16;
    fond.setAttribute('x', -largeur / 2); fond.setAttribute('y', -8);
    fond.setAttribute('width', largeur); fond.setAttribute('height', 16); fond.setAttribute('rx', 8);
    const texte = document.createElementNS(ns, 'text');
    texte.setAttribute('text-anchor', 'middle'); texte.setAttribute('dy', '4');
    texte.textContent = court;
    const titre = document.createElementNS(ns, 'title');
    titre.textContent = ligne.nom;
    bulle.append(fond, texte, titre);
    g.append(bulle);
    groupe.append(g);
  });
  if (!calme()) {
    svg.querySelectorAll('.t-bord, .t-terre').forEach((c) => {
      c.style.strokeDasharray = `${L} ${L}`;
      c.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 900, easing: 'cubic-bezier(.4,0,.2,1)' });
    });
    figure.classList.add('dessine');
  }
}

// Colore chaque secteur : plus rapide (vert) ou plus lent (bordeaux) que la référence
function colorerSecteurs(figure, ecarts) {
  const svg = figure.querySelector('svg');
  const groupe = svg.querySelector('.t-secteurs');
  groupe.innerHTML = '';
  if (!ecarts) return;
  const d = svg.querySelector('.t-terre').getAttribute('d');
  const L = figure._L;
  const ns = 'http://www.w3.org/2000/svg';
  ecarts.forEach((e, i) => {
    const classe = ecartClasse(e);
    if (!classe) return;
    const debut = figure._lignes[i];
    const fin = figure._lignes[i + 1];
    if (debut == null || fin == null) return;
    const c = document.createElementNS(ns, 'path');
    c.setAttribute('d', d);
    c.setAttribute('class', `t-secteur ${classe}`);
    c.style.strokeDasharray = `0 ${debut} ${fin - debut} ${L}`;
    groupe.append(c);
  });
}

// Fait rouler un pilote sur le tracé, au rythme des temps du tour (accéléré)
function rejouer(figure, cumul) {
  const point = figure.querySelector('.t-pilote');
  const chemin = figure.querySelector('.t-terre');
  if (!point || !figure._lignes || calme()) return;
  cancelAnimationFrame(figure._raf);
  const passages = [0, ...cumul];
  const fini = passages.findIndex((v) => v == null);
  const dernier = fini === -1 ? passages.length - 1 : fini - 1;
  if (dernier < 1) return;
  const total = passages[dernier];
  const duree = 3200; // le tour entier en 3,2 s
  point.hidden = false;
  const debut = performance.now();
  const pas = (maintenant) => {
    const t = Math.min(1, (maintenant - debut) / duree) * total;
    let k = 0;
    while (k < dernier - 1 && t > passages[k + 1]) k += 1;
    const part = (t - passages[k]) / (passages[k + 1] - passages[k] || 1);
    const dist = figure._lignes[k] + (figure._lignes[k + 1] - figure._lignes[k]) * Math.min(1, part);
    const p = chemin.getPointAtLength(dist);
    point.setAttribute('cx', p.x);
    point.setAttribute('cy', p.y);
    if (t < total) figure._raf = requestAnimationFrame(pas);
    else {
      point.classList.toggle('tombe', fini !== -1);
      window.vibrer?.('leger');
    }
  };
  point.classList.remove('tombe');
  figure._raf = requestAnimationFrame(pas);
}

// ---------------------------------------------------------------------------
// Point d'entrée : appelé par accueil.js à chaque changement d'adresse
// ---------------------------------------------------------------------------
export async function afficherEntrainement(zone, chemin, contexte) {
  ctx = contexte;
  const ecran = chemin.join('/');
  if (dernierEcran !== null) positions.set(dernierEcran, window.scrollY);
  const revenir = retourDemande;
  retourDemande = false;
  const monJeton = ++jeton;
  const estPilote = ctx.profil?.type_compte === 'pilote';

  const [type, cible] = chemin;
  if (!estPilote) {
    await ecranClassement(zone, type === 'classement' ? cible : null, false, monJeton);
  } else if (type === 'jour' && valide(cible)) {
    await ecranJour(zone, cible, monJeton);
  } else if (type === 'tour' && cible) {
    await ecranTour(zone, cible, monJeton);
  } else if (type === 'classement') {
    await ecranClassement(zone, cible, true, monJeton);
  } else {
    await ecranCalendrier(zone, monJeton);
  }
  if (monJeton !== jeton) return;

  // « Retour » revient vraiment en arrière (et retrouve l'endroit où on était)
  zone.querySelectorAll('[data-retour]').forEach((a) => a.addEventListener('click', (e) => {
    if (dernierEcran === null) return;
    e.preventDefault();
    retourDemande = true;
    history.back();
  }));
  zone.querySelectorAll('[data-lien]').forEach((el) => el.addEventListener('click', () => { location.hash = el.dataset.lien; }));

  animer(zone, revenir ? 'glisse-droite' : 'glisse-gauche');
  window.scrollTo(0, revenir ? positions.get(ecran) || 0 : 0);
  dernierEcran = ecran;
}

// ===========================================================================
// 1. Calendrier
// ===========================================================================
async function ecranCalendrier(zone, monJeton) {
  let liste;
  try {
    [liste] = await Promise.all([seances(), pistes()]);
  } catch (err) {
    if (monJeton === jeton) erreurEcran(zone, err, false);
    return;
  }
  if (monJeton !== jeton) return;

  // La première fois : on se place sur le dernier mois où il y a eu des données
  if (!memoire.moisPositionne && liste.length) {
    const d = decouper(liste[liste.length - 1].jour);
    memoire.annee = d.a; memoire.mois = d.m;
  }
  memoire.moisPositionne = true;

  const parJour = new Map();
  for (const s of liste) {
    if (!parJour.has(s.jour)) parJour.set(s.jour, []);
    parJour.get(s.jour).push(s);
  }
  const aDesExemples = liste.some((s) => s.exemple);

  zone.innerHTML = `
    <h1 class="salut or-brillant">Entraînement</h1>
    <p class="sous-titre">Touche un jour doré pour revoir tes tours.</p>

    <div class="cal panneau-verre">
      <div class="cal-tete">
        <button type="button" class="cal-fleche" data-mois="-1" aria-label="Mois précédent">${ICONES.retour}</button>
        <button type="button" class="cal-titre" aria-expanded="false" aria-controls="cal-choix">
          <span class="cal-mois"></span><span class="cal-annee"></span>${ICONES.bas}
        </button>
        <button type="button" class="cal-fleche" data-mois="1" aria-label="Mois suivant">${ICONES.avant}</button>
      </div>
      <div id="cal-choix" class="cal-choix" hidden>
        <div class="cal-choix-annee">
          <button type="button" class="cal-fleche" data-annee="-1" aria-label="Année précédente">${ICONES.retour}</button>
          <strong class="cal-choix-titre"></strong>
          <button type="button" class="cal-fleche" data-annee="1" aria-label="Année suivante">${ICONES.avant}</button>
        </div>
        <div class="cal-choix-mois"></div>
        <button type="button" class="lien-simple" data-aujourdhui>Revenir à aujourd'hui</button>
      </div>
      <div class="cal-semaine" aria-hidden="true">${JOURS_INITIALES.map((j) => `<span>${j}</span>`).join('')}</div>
      <div class="cal-grille-cadre"><div class="cal-grille" role="grid" aria-label="Jours du mois"></div></div>
      <p class="cal-resume" aria-live="polite"></p>
    </div>

    ${liste.length ? '' : `
      <div class="vide vide-entrainement">
        <strong>Pas encore d'entraînement.</strong>
        Tes séances arriveront ici quand tes temps seront importés (fichier ou transpondeur).
        Pour voir à quoi ça ressemble, charge des données d'exemple.
      </div>
      <p id="message-exemples" class="message" role="status"></p>
      <button type="button" class="bouton bouton-or bouton-principal" data-exemples>Essayer avec des exemples</button>`}

    <a class="carte-lien" href="#entrainement/classement">
      <span class="carte-lien-icone">${ICONES.coupe}</span>
      <span class="carte-lien-texte"><strong>Classement des pistes</strong><small>Les meilleurs tours publiés par les pilotes</small></span>
      ${ICONES.fleche}
    </a>

    ${aDesExemples ? `
      <p class="note note-exemples">Tu vois des <strong>données d'exemple</strong> (temps inventés). Elles ne sont visibles que par toi.
        <button type="button" class="lien-simple" data-effacer-exemples>Effacer les exemples</button></p>
      <p id="message-exemples" class="message" role="status"></p>` : ''}
  `;

  const titreMois = zone.querySelector('.cal-mois');
  const titreAnnee = zone.querySelector('.cal-annee');
  const grille = zone.querySelector('.cal-grille');
  const resume = zone.querySelector('.cal-resume');
  const choix = zone.querySelector('#cal-choix');
  const boutonTitre = zone.querySelector('.cal-titre');
  let anneeChoix = memoire.annee;

  function dessinerMois(sens = 0) {
    const { annee, mois } = memoire;
    titreMois.textContent = majuscule(MOIS_LONG[mois]);
    titreAnnee.textContent = annee;
    const premier = new Date(annee, mois, 1);
    const decalage = (premier.getDay() + 6) % 7; // lundi = 0
    const nbJours = new Date(annee, mois + 1, 0).getDate();
    const auj = isoAujourdHui();
    let html = '';
    for (let i = 0; i < decalage; i += 1) html += '<span class="cal-jour hors" aria-hidden="true"></span>';
    let nbSeances = 0;
    let nbTours = 0;
    let joursAvec = 0;
    for (let j = 1; j <= nbJours; j += 1) {
      const cle = iso(annee, mois, j);
      const ce = parJour.get(cle) || [];
      const tours = ce.reduce((s, x) => s + x.nbTours, 0);
      nbSeances += ce.length; nbTours += tours;
      const classes = ['cal-jour'];
      if (cle === auj) classes.push('aujourdhui');
      if (cle > auj) classes.push('futur');
      if (ce.length) {
        joursAvec += 1;
        classes.push('avec');
        if (ce.some((x) => x.publie)) classes.push('publie');
        const etiquette = `${j} ${MOIS_LONG[mois]} : ${ce.length > 1 ? `${ce.length} séances, ` : ''}${tours} tour${tours > 1 ? 's' : ''}`;
        html += `<a class="${classes.join(' ')}" href="#entrainement/jour/${cle}" role="gridcell" aria-label="${etiquette}" style="--k:${joursAvec}">
          <span class="cal-num">${j}</span><span class="cal-tours">${tours}</span></a>`;
      } else {
        html += `<span class="${classes.join(' ')}" role="gridcell"><span class="cal-num">${j}</span></span>`;
      }
    }
    grille.innerHTML = html;
    resume.innerHTML = nbSeances
      ? `<strong>${nbSeances}</strong> séance${nbSeances > 1 ? 's' : ''} · <strong>${nbTours}</strong> tour${nbTours > 1 ? 's' : ''} en ${MOIS_LONG[mois]}`
      : `Aucun entraînement en ${MOIS_LONG[mois]} ${annee}.`;
    if (sens && !calme()) {
      grille.animate(
        [{ opacity: 0, transform: `translateX(${sens * 36}px)` }, { opacity: 1, transform: 'none' }],
        { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
    }
  }

  function changerMois(n) {
    const d = new Date(memoire.annee, memoire.mois + n, 1);
    memoire.annee = d.getFullYear(); memoire.mois = d.getMonth();
    dessinerMois(n);
  }

  function dessinerChoix() {
    zone.querySelector('.cal-choix-titre').textContent = anneeChoix;
    const moisAvec = new Set(liste.filter((s) => s.jour.startsWith(`${anneeChoix}-`)).map((s) => decouper(s.jour).m));
    zone.querySelector('.cal-choix-mois').innerHTML = MOIS_COURT.map((m, i) => `
      <button type="button" data-choix-mois="${i}" class="${moisAvec.has(i) ? 'avec' : ''}"
        aria-pressed="${anneeChoix === memoire.annee && i === memoire.mois}">${majuscule(m)}</button>`).join('');
    zone.querySelectorAll('[data-choix-mois]').forEach((b) => b.addEventListener('click', () => {
      const avant = memoire.annee * 12 + memoire.mois;
      memoire.annee = anneeChoix; memoire.mois = Number(b.dataset.choixMois);
      ouvrirChoix(false);
      dessinerMois(Math.sign(memoire.annee * 12 + memoire.mois - avant));
    }));
  }
  function ouvrirChoix(ouvrir) {
    if (ouvrir) { anneeChoix = memoire.annee; dessinerChoix(); }
    boutonTitre.setAttribute('aria-expanded', ouvrir);
    window.montrer ? window.montrer(choix, ouvrir) : (choix.hidden = !ouvrir);
  }

  boutonTitre.addEventListener('click', () => ouvrirChoix(choix.hidden));
  zone.querySelectorAll('[data-mois]').forEach((b) => b.addEventListener('click', () => changerMois(Number(b.dataset.mois))));
  zone.querySelectorAll('[data-annee]').forEach((b) => b.addEventListener('click', () => { anneeChoix += Number(b.dataset.annee); dessinerChoix(); }));
  zone.querySelector('[data-aujourdhui]').addEventListener('click', () => {
    const avant = memoire.annee * 12 + memoire.mois;
    memoire.annee = aujourdHui.getFullYear(); memoire.mois = aujourdHui.getMonth();
    ouvrirChoix(false);
    dessinerMois(Math.sign(memoire.annee * 12 + memoire.mois - avant));
  });

  // Glisser le doigt sur le calendrier pour changer de mois
  const cadre = zone.querySelector('.cal-grille-cadre');
  let depart = null;
  cadre.addEventListener('pointerdown', (e) => { depart = { x: e.clientX, y: e.clientY }; }, { passive: true });
  cadre.addEventListener('pointerup', (e) => {
    if (!depart) return;
    const dx = e.clientX - depart.x;
    const dy = e.clientY - depart.y;
    depart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      window.vibrer?.('leger');
      changerMois(dx < 0 ? 1 : -1);
    }
  });
  cadre.addEventListener('pointercancel', () => { depart = null; });

  // Données d'exemple
  zone.querySelector('[data-exemples]')?.addEventListener('click', async (e) => {
    const bouton = e.currentTarget;
    bouton.disabled = true;
    bouton.textContent = 'Création des exemples…';
    const { error } = await ctx.supabase.rpc('creer_exemples_entrainement');
    if (error) {
      bouton.disabled = false;
      bouton.textContent = 'Essayer avec des exemples';
      const m = zone.querySelector('#message-exemples');
      m.textContent = messageErreur(error); m.className = 'message erreur';
      window.vibrer?.('erreur');
      return;
    }
    window.vibrer?.('fort');
    cache.seances = null;
    memoire.moisPositionne = false;
    afficherEntrainement(zone, [], ctx);
  });
  zone.querySelector('[data-effacer-exemples]')?.addEventListener('click', async (e) => {
    const ok = await demander(e.currentTarget.closest('.note'), {
      texte: 'Effacer toutes les séances d\'exemple ? Tes vraies séances ne sont pas touchées.',
      oui: 'Effacer', classeOui: 'bouton-danger',
    });
    if (!ok) return;
    const { error } = await ctx.supabase.rpc('effacer_exemples_entrainement');
    if (error) {
      const m = zone.querySelector('#message-exemples');
      m.textContent = messageErreur(error); m.className = 'message erreur';
      window.vibrer?.('erreur');
      return;
    }
    window.vibrer?.('fort');
    cache.seances = null;
    memoire.moisPositionne = false;
    afficherEntrainement(zone, [], ctx);
  });

  dessinerMois();
}

// ===========================================================================
// 2. Une journée
// ===========================================================================
async function ecranJour(zone, jour, monJeton) {
  let reponse;
  let lesPistes;
  try {
    [reponse, lesPistes] = await Promise.all([
      ctx.supabase.from('entrainements')
        .select('id, jour, piste, publie, exemple, tours(id, numero, temps, temps_final)')
        .eq('jour', jour)
        .order('cree_le', { ascending: true }),
      pistes(),
    ]);
    if (reponse.error) throw reponse.error;
  } catch (err) {
    if (monJeton === jeton) erreurEcran(zone, err);
    return;
  }
  if (monJeton !== jeton) return;
  const liste = reponse.data;
  const d = decouper(jour);
  memoire.annee = d.a; memoire.mois = d.m;

  if (!liste.length) {
    zone.innerHTML = `${lienRetour('#entrainement', 'Calendrier')}
      <h1 class="titre-ecran">${esc(dateLongue(jour))}</h1>
      ${vide('Aucun entraînement ce jour-là.', 'Choisis un jour doré dans le calendrier.')}`;
    return;
  }

  const blocs = liste.map((s, k) => {
    const piste = lesPistes.get(s.piste) || { nom: 'Piste inconnue', lignes: [], trace: 'M20 105 H300' };
    const tours = (s.tours || []).map(normaliserTour).sort((a, b) => a.numero - b.numero);
    const finis = tours.filter((t) => t.temps_final != null);
    const meilleur = finis.length ? Math.min(...finis.map((t) => t.temps_final)) : null;
    const pire = finis.length ? Math.max(...finis.map((t) => t.temps_final)) : null;
    const moyenne = finis.length ? finis.reduce((a, t) => a + t.temps_final, 0) / finis.length : null;
    const nbLignes = Math.max(0, (piste.lignes || []).length - 2);

    const lignesTours = tours.map((t, i) => {
      const fini = t.temps_final != null;
      const estMeilleur = fini && t.temps_final === meilleur;
      const largeur = fini && pire > meilleur ? 34 + 66 * ((t.temps_final - meilleur) / (pire - meilleur)) : 34;
      return `<a class="tour-ligne ${estMeilleur ? 'meilleur' : ''} ${fini ? '' : 'pas-fini'}" href="#entrainement/tour/${t.id}" style="--k:${i}">
        <span class="tour-num">${t.numero}</span>
        <span class="tour-corps">
          <span class="tour-haut">
            <strong>${fini ? temps(t.temps_final) : '<span class="chute">Chute</span>'}</strong>
            ${estMeilleur ? '<span class="badge-meilleur">Meilleur</span>'
              : fini ? `<small class="perd">${ecartTexte(t.temps_final - meilleur)}</small>`
                : `<small>${esc(arretApres(piste, t.temps))}</small>`}
          </span>
          ${fini ? `<span class="tour-barre" aria-hidden="true"><span style="width:${largeur.toFixed(1)}%"></span></span>` : ''}
        </span>
        ${ICONES.fleche}
      </a>`;
    }).join('');

    const boutonPublier = s.exemple
      ? '<p class="petit doux publication-note">Données d\'exemple : elles ne peuvent pas être publiées.</p>'
      : s.publie
        ? `<p class="badge-publie">${ICONES.publier} Publiée : tout le monde voit ces temps et ils comptent au classement.</p>
           <button type="button" class="bouton bouton-secondaire" data-depublier="${s.id}">Retirer du classement</button>`
        : `<button type="button" class="bouton bouton-or bouton-principal" data-publier="${s.id}">${ICONES.publier} Publier cette séance</button>
           <p class="petit doux publication-note">Tes amis voient déjà tes meilleurs temps. Publier, c'est les montrer à tout le monde et entrer au classement.</p>`;

    return `<section class="seance" aria-label="Séance sur ${esc(piste.nom)}">
      ${liste.length > 1 ? `<h2 class="seance-titre">Séance ${k + 1}</h2>` : ''}
      <div class="piste-carte marbre-bordeaux cadre-or">
        <div class="piste-tete">
          <div>
            <p class="piste-nom">${esc(piste.nom)}</p>
            ${piste.lieu ? `<p class="piste-lieu">${ICONES.lieu}${esc(piste.lieu)}</p>` : ''}
          </div>
          ${s.publie ? '<span class="badge-statut statut-terminee">Publiée</span>' : s.exemple ? '<span class="badge-statut statut-avenir">Exemple</span>' : ''}
        </div>
        ${svgTrace(piste)}
        <p class="piste-legende">${nbLignes ? `Départ, ${nbLignes} intermédiaire${nbLignes > 1 ? 's' : ''} et arrivée` : 'Départ et arrivée'}</p>
      </div>

      <div class="chiffres">
        <div><strong>${tours.length}</strong><span>tour${tours.length > 1 ? 's' : ''}</span></div>
        <div class="or"><strong>${temps(meilleur)}</strong><span>meilleur</span></div>
        <div><strong>${temps(moyenne)}</strong><span>moyenne</span></div>
        <div><strong>${tours.length - finis.length}</strong><span>chute${tours.length - finis.length > 1 ? 's' : ''}</span></div>
      </div>

      <h2>Tes tours</h2>
      <p class="astuce">Touche un tour pour voir tous ses intermédiaires.</p>
      <div class="liste-tours">${lignesTours || vide('Aucun tour enregistré.', '')}</div>

      <div class="publication">
        <p class="message" role="status" data-message="${s.id}"></p>
        ${boutonPublier}
      </div>
      <button type="button" class="lien-simple lien-danger" data-supprimer="${s.id}">${ICONES.poubelle} Supprimer cette séance</button>
    </section>`;
  }).join('');

  zone.innerHTML = `${lienRetour('#entrainement', 'Calendrier')}
    <h1 class="titre-ecran">${esc(dateLongue(jour))}</h1>
    <p class="sous-titre">${liste.length > 1 ? `${liste.length} séances ce jour-là.` : 'Ta séance du jour.'}</p>
    ${blocs}`;

  // Tracés
  zone.querySelectorAll('[data-trace]').forEach((fig, k) => {
    const piste = lesPistes.get(liste[k].piste);
    if (piste) preparerTrace(fig, piste);
  });

  // Publier / retirer
  const changerPublication = async (bouton, id, publie) => {
    const message = zone.querySelector(`[data-message="${id}"]`);
    if (publie) {
      const ok = await demander(bouton, {
        texte: 'Tous les utilisateurs de DBSpeed pourront voir tes temps de cette séance, et ton meilleur tour comptera au classement de la piste.',
        oui: 'Oui, publier',
      });
      if (!ok) return;
    }
    bouton.disabled = true;
    const { error } = await ctx.supabase.from('entrainements').update({ publie }).eq('id', id);
    bouton.disabled = false;
    if (error) {
      message.textContent = messageErreur(error); message.className = 'message erreur';
      window.vibrer?.('erreur');
      return;
    }
    window.vibrer?.('fort');
    cache.seances = null;
    await ecranJour(zone, jour, jeton);
    branchements(zone);
    const m = zone.querySelector(`[data-message="${id}"]`);
    if (m) {
      m.innerHTML = publie
        ? 'Séance publiée ! <a href="#entrainement/classement">Voir le classement</a>'
        : 'Séance retirée du classement. Seuls toi et tes amis voyez ces temps.';
      m.className = 'message ok';
    }
  };
  zone.querySelectorAll('[data-publier]').forEach((b) => b.addEventListener('click', () => changerPublication(b, b.dataset.publier, true)));
  zone.querySelectorAll('[data-depublier]').forEach((b) => b.addEventListener('click', () => changerPublication(b, b.dataset.depublier, false)));

  // Supprimer
  zone.querySelectorAll('[data-supprimer]').forEach((b) => b.addEventListener('click', async () => {
    const ok = await demander(b, {
      texte: 'Supprimer cette séance et tous ses tours ? On ne pourra pas les récupérer.',
      oui: 'Supprimer', classeOui: 'bouton-danger',
    });
    if (!ok) return;
    const { error } = await ctx.supabase.from('entrainements').delete().eq('id', b.dataset.supprimer);
    if (error) {
      const m = zone.querySelector(`[data-message="${b.dataset.supprimer}"]`);
      m.textContent = messageErreur(error); m.className = 'message erreur';
      window.vibrer?.('erreur');
      return;
    }
    window.vibrer?.('fort');
    cache.seances = null;
    location.hash = 'entrainement';
  }));
}

// Après un nouvel affichage fait « à la main » (sans passer par l'adresse)
function branchements(zone) {
  zone.querySelectorAll('[data-retour]').forEach((a) => a.addEventListener('click', (e) => {
    if (dernierEcran === null) return;
    e.preventDefault();
    retourDemande = true;
    history.back();
  }));
}

// ===========================================================================
// 3. Un tour : tous les intermédiaires, et les comparaisons
// ===========================================================================
async function ecranTour(zone, id, monJeton) {
  let tour;
  let lesPistes;
  try {
    const [rep, p] = await Promise.all([
      ctx.supabase.from('tours')
        .select('id, numero, temps, temps_final, seance:entrainements(id, jour, piste, publie, exemple, tours(id, numero, temps_final))')
        .eq('id', id)
        .single(),
      pistes(),
    ]);
    if (rep.error) throw rep.error;
    tour = normaliserTour(rep.data);
    lesPistes = p;
  } catch (err) {
    if (monJeton === jeton) erreurEcran(zone, err);
    return;
  }
  if (monJeton !== jeton) return;

  const seance = tour.seance;
  const piste = lesPistes.get(seance.piste) || { nom: 'Piste', lignes: [], trace: 'M20 105 H300' };
  const noms = nomsLignes(piste, tour.temps.length);
  const autres = (seance.tours || []).map(normaliserTour).sort((a, b) => a.numero - b.numero);
  const position = autres.findIndex((t) => t.id === tour.id);
  const precedent = autres[position - 1];
  const suivant = autres[position + 1];
  const finisDuJour = autres.filter((t) => t.temps_final != null);
  const meilleurDuJour = finisDuJour.length ? Math.min(...finisDuJour.map((t) => t.temps_final)) : null;

  // Les références pour comparer : record de la piste, meilleurs inter, mon meilleur tour, mes amis
  const [recordRep, interRep, amisRep, monMeilleurRep] = await Promise.all([
    ctx.supabase.rpc('record_piste', { p_piste: seance.piste }),
    ctx.supabase.rpc('meilleurs_intermediaires_piste', { p_piste: seance.piste }),
    ctx.supabase.rpc('meilleurs_tours_amis', { p_piste: seance.piste }),
    ctx.supabase.from('tours')
      .select('id, temps, temps_final, entrainements!inner(jour, piste)')
      .eq('entrainements.piste', seance.piste)
      .not('temps_final', 'is', null)
      .order('temps_final', { ascending: true })
      .limit(1),
  ]);
  if (monJeton !== jeton) return;

  const references = [];
  const record = recordRep.data?.[0];
  if (record) {
    references.push({
      cle: 'record', court: 'Record',
      titre: `Record de la piste${record.est_moi ? ' (toi !)' : ''}`,
      detail: `${record.est_moi ? 'Toi' : esc(record.nom || 'Pilote')}${record.plaque ? ` · plaque ${esc(record.plaque)}` : ''} · ${dateCourte(record.jour)}`,
      temps: (record.temps || []).map(nombre),
    });
  }
  const inter = (interRep.data || null);
  if (Array.isArray(inter) && inter.length) {
    references.push({
      cle: 'inter', court: 'Meilleurs inter',
      titre: 'Meilleurs intermédiaires de la piste',
      detail: 'Le meilleur temps publié à chaque ligne, tous pilotes confondus',
      temps: inter.map(nombre),
    });
  }
  const monMeilleur = monMeilleurRep.data?.[0];
  const estMonMeilleur = monMeilleur?.id === tour.id;
  if (monMeilleur && !estMonMeilleur) {
    const mm = normaliserTour(monMeilleur);
    references.push({
      cle: 'moi', court: 'Mon meilleur',
      titre: 'Ton meilleur tour sur cette piste',
      detail: dateCourte(mm.entrainements.jour),
      temps: mm.temps,
    });
  }
  for (const a of amisRep.data || []) {
    references.push({
      cle: `ami-${a.pilote}`, court: prenom(a.nom),
      titre: `Meilleur tour de ${esc(a.nom || 'ton ami')}`,
      detail: `${a.plaque ? `Plaque ${esc(a.plaque)} · ` : ''}${dateCourte(a.jour)}`,
      temps: (a.temps || []).map(nombre),
      ami: true,
    });
  }
  if (!references.some((r) => r.cle === memoire.reference)) {
    memoire.reference = references[0]?.cle || null;
  }
  const amis = references.filter((r) => r.ami);

  const fini = tour.temps_final != null;
  const sect = secteurs(tour.temps);

  zone.innerHTML = `${lienRetour(`#entrainement/jour/${seance.jour}`, dateLongue(seance.jour))}
    <div class="tour-entete">
      <div>
        <h1 class="titre-ecran">Tour ${tour.numero}</h1>
        <p class="sous-titre">${esc(piste.nom)} · ${esc(dateCourte(seance.jour))}</p>
      </div>
      <div class="tour-chrono ${fini && (estMonMeilleur || tour.temps_final === meilleurDuJour) ? 'record-jour' : ''}">
        <strong class="${fini ? 'or-brillant' : 'chute'}">${fini ? temps(tour.temps_final) : 'Chute'}</strong>
        <small>${!fini ? esc(arretApres(piste, tour.temps)) : estMonMeilleur ? 'Ton meilleur tour sur cette piste !' : tour.temps_final === meilleurDuJour ? 'Meilleur tour du jour' : `${ecartTexte(tour.temps_final - meilleurDuJour)} sur ton meilleur du jour`}</small>
      </div>
    </div>

    <div class="piste-carte marbre-bordeaux cadre-or">
      ${svgTrace(piste, { classe: 'trace-tour' })}
      <div class="trace-pied">
        <p class="legende" data-legende hidden>
          <span><i class="gagne"></i>plus rapide</span><span><i class="perd"></i>plus lent</span>
        </p>
        <button type="button" class="bouton-mini" data-rejouer>${ICONES.rejouer} Rejouer le tour</button>
      </div>
    </div>

    <h2>Tes intermédiaires</h2>
    <div class="tableau-defile">
      <table class="t">
        <thead><tr><th>Ligne</th><th class="cel-num">Temps</th><th class="cel-num">Secteur</th></tr></thead>
        <tbody>
          ${noms.map((nom, i) => `<tr>
            <th scope="row">${esc(nom)}</th>
            <td class="cel-num">${temps(tour.temps[i])}</td>
            <td class="cel-num">${temps(sect[i])}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="astuce">Temps : depuis la chute de la grille. Secteur : entre la ligne d'avant et celle-ci.</p>

    <h2>Comparer</h2>
    ${references.length ? `
      ${puces('Comparer avec', references.map((r) => [r.cle, r.court]), memoire.reference, 'puces-defile puces-ref')}
      <div class="ref-carte" data-ref-carte></div>
      <div class="tableau-defile"><table class="t t-compare" data-compare></table></div>
    ` : vide('Rien à comparer pour l\'instant.', 'Le record arrivera quand des pilotes publieront leurs temps sur cette piste.')}

    ${amis.length ? '' : `<a class="carte-lien" href="#profil">
      <span class="carte-lien-icone">${ICONES.amis}</span>
      <span class="carte-lien-texte"><strong>Ajoute tes amis</strong><small>Pour comparer tes intermédiaires avec les leurs (dans Mon profil)</small></span>
      ${ICONES.fleche}
    </a>`}

    ${references.length > 1 ? `
      <h2>Tout le monde, ligne par ligne</h2>
      <div class="tableau-defile"><table class="t compacte t-tous">
        <thead><tr><th>Ligne</th><th class="cel-num">Toi</th>${references.map((r) => `<th class="cel-num">${esc(r.court)}</th>`).join('')}</tr></thead>
        <tbody>${noms.map((nom, i) => `<tr>
          <th scope="row">${esc(nom)}</th>
          <td class="cel-num"><strong>${temps(tour.temps[i])}</strong></td>
          ${references.map((r) => {
            const e = tour.temps[i] != null && r.temps[i] != null ? tour.temps[i] - r.temps[i] : null;
            return `<td class="cel-num">${temps(r.temps[i])}${e == null ? '' : `<span class="sous-ecart"><small class="${ecartClasse(e)}">${ecartTexte(e)}</small></span>`}</td>`;
          }).join('')}
        </tr>`).join('')}</tbody>
      </table></div>
      <p class="astuce">Sous chaque temps : ton écart (<span class="gagne">vert</span> = tu es plus rapide).</p>` : ''}

    <nav class="tour-nav" aria-label="Autres tours">
      ${precedent ? `<a class="bouton bouton-secondaire" href="#entrainement/tour/${precedent.id}">${ICONES.retour} Tour ${precedent.numero}</a>` : '<span></span>'}
      ${suivant ? `<a class="bouton bouton-secondaire" href="#entrainement/tour/${suivant.id}">Tour ${suivant.numero} ${ICONES.avant}</a>` : '<span></span>'}
    </nav>`;

  const figure = zone.querySelector('[data-trace]');
  preparerTrace(figure, piste);

  function majComparaison() {
    const ref = references.find((r) => r.cle === memoire.reference);
    const carte = zone.querySelector('[data-ref-carte]');
    const table = zone.querySelector('[data-compare]');
    const legende = zone.querySelector('[data-legende]');
    if (!ref || !table) { colorerSecteurs(figure, null); legende.hidden = true; return; }
    const sRef = secteurs(ref.temps);
    const ecartsSecteurs = sect.map((s, i) => (s != null && sRef[i] != null ? s - sRef[i] : null));
    carte.innerHTML = `<strong>${ref.titre}</strong><small>${ref.detail}</small>`;
    table.innerHTML = `<thead><tr><th>Ligne</th><th class="cel-num">Toi</th><th class="cel-num">${esc(ref.court)}</th><th class="cel-num">Écart</th><th class="cel-num">Secteur</th></tr></thead>
      <tbody>${noms.map((nom, i) => {
        const e = tour.temps[i] != null && ref.temps[i] != null ? tour.temps[i] - ref.temps[i] : null;
        const es = ecartsSecteurs[i];
        return `<tr>
          <th scope="row">${esc(nom)}</th>
          <td class="cel-num">${temps(tour.temps[i])}</td>
          <td class="cel-num doux">${temps(ref.temps[i])}</td>
          <td class="cel-num"><span class="ecart ${ecartClasse(e)}">${ecartTexte(e)}</span></td>
          <td class="cel-num"><span class="ecart ${ecartClasse(es)}">${ecartTexte(es)}</span></td>
        </tr>`;
      }).join('')}</tbody>`;
    colorerSecteurs(figure, ecartsSecteurs);
    legende.hidden = !ecartsSecteurs.some((e) => ecartClasse(e));
    if (!calme()) {
      [carte, table].forEach((el) => el.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' }));
    }
  }
  surChoix(zone.querySelector('.puces-ref'), (v) => { memoire.reference = v; majComparaison(); });
  majComparaison();

  zone.querySelector('[data-rejouer]').addEventListener('click', () => rejouer(figure, tour.temps));
  // le pilote fait le tour une première fois, juste après le dessin de la piste
  setTimeout(() => { if (figure.isConnected) rejouer(figure, tour.temps); }, calme() ? 0 : 950);
}

// ===========================================================================
// 4. Classement d'une piste
// ===========================================================================
async function ecranClassement(zone, pisteId, avecRetour, monJeton) {
  let lesPistes;
  try {
    lesPistes = await pistes();
  } catch (err) {
    if (monJeton === jeton) erreurEcran(zone, err, avecRetour);
    return;
  }
  if (monJeton !== jeton) return;
  const liste = [...lesPistes.values()].sort((a, b) => (a.exemple - b.exemple) || a.nom.localeCompare(b.nom));
  const choisie = lesPistes.get(pisteId) || lesPistes.get(memoire.piste) || liste[0];

  const entete = `${avecRetour ? lienRetour('#entrainement', 'Calendrier') : ''}
    <h1 class="${avecRetour ? 'titre-ecran' : 'salut or-brillant'}">${avecRetour ? 'Classement' : 'Entraînement'}</h1>
    <p class="sous-titre">${avecRetour ? 'Le meilleur tour publié de chaque pilote, piste par piste.' : 'Le classement des meilleurs tours d\'entraînement publiés par les pilotes, piste par piste.'}</p>`;

  if (!choisie) {
    zone.innerHTML = `${entete}${vide('Pas encore de piste.', 'Les pistes arriveront avec les premiers temps importés.')}`;
    return;
  }
  memoire.piste = choisie.id;

  zone.innerHTML = `${entete}
    ${liste.length > 1 ? puces('Piste', liste.map((p) => [p.id, p.nom]), choisie.id, 'puces-defile puces-piste') : ''}
    <div data-classement></div>`;

  const boite = zone.querySelector('[data-classement]');
  async function remplir(piste, anime) {
    boite.innerHTML = '<p class="chargement">Chargement…</p>';
    const { data, error } = await ctx.supabase.rpc('classement_piste', { p_piste: piste.id });
    if (!boite.isConnected) return;
    if (error) {
      boite.innerHTML = `<div class="vide"><strong>Impossible de charger le classement.</strong>${esc(messageErreur(error))}</div>`;
      return;
    }
    const lignes = data || [];
    const premier = lignes[0];
    const noms = nomsLignes(piste, (premier?.temps || []).length);
    boite.innerHTML = `
      <div class="piste-carte marbre-bordeaux cadre-or">
        <div class="piste-tete">
          <div>
            <p class="piste-nom">${esc(piste.nom)}</p>
            ${piste.lieu ? `<p class="piste-lieu">${ICONES.lieu}${esc(piste.lieu)}</p>` : ''}
          </div>
        </div>
        ${svgTrace(piste)}
      </div>
      ${premier ? `
        <div class="record-carte">
          <span class="record-icone">${ICONES.coupe}</span>
          <div class="record-texte">
            <small>Record de la piste</small>
            <strong class="or-brillant">${temps(premier.temps_final)}</strong>
            <span>${premier.est_moi ? 'Toi' : esc(premier.nom || 'Pilote')}${premier.plaque ? ` · plaque ${esc(premier.plaque)}` : ''} · ${esc(dateCourte(premier.jour))}</span>
          </div>
        </div>
        <div class="tableau-defile"><table class="t compacte">
          <thead><tr><th>Ligne</th><th class="cel-num">Temps</th><th class="cel-num">Secteur</th></tr></thead>
          <tbody>${noms.map((n, i) => `<tr><th scope="row">${esc(n)}</th><td class="cel-num">${temps(nombre(premier.temps[i]))}</td><td class="cel-num">${temps(secteurs(premier.temps.map(nombre))[i])}</td></tr>`).join('')}</tbody>
        </table></div>

        <h2>Classement</h2>
        <div class="tableau-defile"><table class="t">
          <thead><tr><th></th><th>Pilote</th><th class="cel-num">Temps</th><th class="cel-num">Écart</th></tr></thead>
          <tbody>${lignes.map((l) => `<tr class="${l.est_moi ? 'passe' : ''}">
            <td class="cel-place">${l.rang <= 3 ? `<span class="medaille m${l.rang}">${l.rang}</span>` : l.rang}</td>
            <td class="cel-pilote"><span class="cp">${l.plaque ? `<span class="plaque-petite">${esc(l.plaque)}</span>` : ''}<span><strong>${l.est_moi ? 'Toi' : esc(l.nom || 'Pilote')}</strong><small>${esc([l.club, l.categorie].filter(Boolean).join(' · ') || dateCourte(l.jour))}</small></span></span></td>
            <td class="cel-num">${temps(l.temps_final)}</td>
            <td class="cel-num doux">${l.rang === 1 ? '—' : ecartTexte(nombre(l.temps_final) - nombre(premier.temps_final))}</td>
          </tr>`).join('')}</tbody>
        </table></div>`
        : vide('Personne n\'a encore publié sur cette piste.', ctx.profil?.type_compte === 'pilote'
          ? 'Sois le premier : ouvre une séance dans le calendrier et appuie sur « Publier cette séance ».'
          : 'Le classement apparaîtra quand les pilotes publieront leurs temps.')}
      ${ctx.profil?.type_compte === 'pilote' && premier && !lignes.some((l) => l.est_moi)
        ? '<p class="note">Tu n\'es pas encore classé ici : ouvre une séance sur cette piste et appuie sur « Publier cette séance ».</p>' : ''}`;
    const fig = boite.querySelector('[data-trace]');
    if (fig) preparerTrace(fig, piste);
    if (anime && !calme()) boite.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  surChoix(zone.querySelector('.puces-piste'), (v) => {
    memoire.piste = v;
    history.replaceState(null, '', `${location.pathname}#entrainement/classement/${v}`);
    dernierEcran = `classement/${v}`;
    remplir(lesPistes.get(v), true);
  });
  await remplir(choisie, false);
}
