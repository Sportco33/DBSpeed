// DBSpeed — onglet Accueil : les manches (la fonction principale de l'appli).
// Adresses (après #accueil) :
//   (rien)                     → accueil : mes dernières manches, dernières courses, bouton Importer
//   /courses                   → toutes les courses
//   /course/<id>               → une course : toutes ses manches, chercher un pilote
//   /manche/<id>               → une manche : arrivée, secteurs, passages
//   /manche/<id>/<resultat>    → la fiche d'un pilote dans la manche
//   /importer                  → importer un fichier Excel ou CSV (organisateurs validés)
// Utilisé par accueil.js : afficherManches(zone, parties, { supabase, profil })

import { messageErreur } from '/app/supabase.js';
import { esc, lienRetour, vide, animer, brancherLiens, demander } from '/app/outils.js';
import { lireFichierTemps, plaqueSansZeros } from '/app/manches/excel.js';
import { calculerManche, texteTemps, texteEcart, textePlace } from '/app/manches/calcul.js';

let ctx = null;
let routeAvant = null;
let jeton = 0;                       // une page plus récente a été demandée : on abandonne l'ancienne
const positions = new Map();         // où on était dans chaque page de l'historique (pour revenir au même endroit)
const DUREE_CACHE = 60 * 1000;       // les données gardées plus d'une minute sont rechargées
const cache = { courses: null, mesManches: null, course: new Map(), manche: new Map() };
const etat = { affichage: 'arrivee', recherche: '', categorie: '', courseId: null, importation: null };

// L'historique : chaque page de l'onglet reçoit un numéro (gardé dans history.state)
// et retient la page d'où l'on venait (« avant »). Comme ça on sait si on arrive
// par le bouton retour du téléphone, et si « Retour » peut simplement revenir en arrière.
let compteur = Date.now();           // numéros jamais réutilisés, même après un rechargement
let indexActuel = null;              // numéro de la page affichée
let avantActuel = null;              // la page d'avant (route, ou null si on vient d'ailleurs)
let remplacement = false;            // la prochaine adresse remplace la page actuelle (location.replace)
let autreOnglet = true;              // on arrive d'un autre onglet (ou au démarrage)
const remplacer = (adresse) => { remplacement = true; location.replace(adresse); };

// Une adresse avec un identifiant de la base (uuid) : sinon, pas la peine de demander
const ID_VALIDE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ICONES = {
  fichier: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  envoyer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 14v5h14v-5"/></svg>',
  fleche: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  loupe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
  poubelle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
};

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const dateDe = (jour) => new Date(`${jour}T12:00:00`);
const quantieme = (d) => (d.getDate() === 1 ? '1er' : String(d.getDate()));
// « jeudi 1er octobre 2026 »
const dateLongue = (jour) => { const d = dateDe(jour); return `${JOURS[d.getDay()]} ${quantieme(d)} ${MOIS_LONGS[d.getMonth()]} ${d.getFullYear()}`; };
// « 1er oct. 2026 »
const dateCourte = (jour) => { const d = dateDe(jour); return `${quantieme(d)} ${MOIS[d.getMonth()]} ${d.getFullYear()}`; };
const aujourdhui = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
// Le nom d'une manche : celui du fichier (« 1/4 finale A »), sinon « Manche 3 »
const titreManche = (m) => m.nom || `Manche ${m.numero}`;
const nomManche = (m) => `${titreManche(m)}${m.categorie ? ` · ${m.categorie}` : ''}`;
const nomPilote = (p) => p.pilote || `Plaque ${p.plaque}`;
const maPlaque = () => (ctx.profil.type_compte === 'pilote' ? (ctx.profil.plaque || '').trim() : '');
// « 021 » et « 21 » sont la même plaque
const memePlaque = (a, b) => Boolean(a) && Boolean(b) && plaqueSansZeros(a).toLowerCase() === plaqueSansZeros(b).toLowerCase();
const estMoi = (p) => memePlaque(p.plaque, maPlaque());
// Nombre de pilotes différents (par plaque) dans des manches
const compterPilotes = (listes) => new Set(listes.flat().map((p) => plaqueSansZeros(p.plaque).toLowerCase())).size;
const estOrganisateurValide = () => ctx.profil.type_compte === 'organisateur' && ctx.profil.organisateur_valide;
// La course est à moi (une course dont l'organisateur a supprimé son compte n'est à personne)
const estMaCourse = (c) => Boolean(c.organisateur) && c.organisateur === ctx.profil.id;
const titrePage = (t) => { document.title = `${t} · DBSpeed`; };

// Les secteurs : S1 = départ → 1re ligne, S2 = 1re ligne → 2e ligne…
const nomsSecteurs = (lignes) => lignes.map((nom, i) => `${i === 0 ? 'Départ' : lignes[i - 1]} → ${nom}`);

// Place, avec une médaille pour le podium
function placeHtml(p) {
  if (!p.fini) return `<span class="m-abandon" title="N'a pas fini">${p.place}<span class="cache"> (n'a pas fini)</span></span>`;
  return p.place <= 3 ? `<span class="medaille m${p.place}">${p.place}</span>` : String(p.place);
}

// Ce qui est écrit à la place du temps quand le pilote n'a pas fini
function finHtml(p, lignes) {
  if (p.fini) return texteTemps(p.final);
  if (p.derniere < 0) return '<span class="chute" title="N\'a pas fini">Non fini</span>';
  return `<span class="chute" title="N'a pas fini">Non fini · ${esc(lignes[p.derniere])}</span>`;
}

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------

// Une donnée gardée en mémoire est encore bonne si elle a moins d'une minute
const frais = (x) => x && Date.now() - x.quand < DUREE_CACHE;

async function dernieresCourses(limite = 10) {
  if (frais(cache.courses) && cache.courses.limite >= limite) return cache.courses.liste.slice(0, limite);
  const { data, error } = await ctx.supabase.from('courses')
    .select('id, nom, jour, lieu, lignes, organisateur, manches(count)')
    .order('jour', { ascending: false }).order('cree_le', { ascending: false })
    .limit(limite);
  if (error) throw error;
  cache.courses = { limite, liste: data, quand: Date.now() };
  return data;
}

// Les façons d'écrire ma plaque dans un fichier : « 21 », « 021 », « 0021 »
function variantesPlaque(p) {
  if (!/^\d+$/.test(p)) return [p];
  const sans = plaqueSansZeros(p);
  return [...new Set([p, sans, `0${sans}`, `00${sans}`])];
}

// Toutes les manches où ma plaque apparaît (avec les autres pilotes, pour calculer ma place),
// de la plus récente à la plus ancienne
async function mesManches() {
  const plaque = maPlaque();
  if (!plaque) return [];
  if (frais(cache.mesManches) && cache.mesManches.plaque === plaque) return cache.mesManches.liste;
  const { data, error } = await ctx.supabase.from('resultats')
    .select('id, plaque, manches(id, numero, nom, categorie, courses(id, nom, jour, lieu, lignes, cree_le), resultats(id, plaque, pilote, couloir, temps))')
    .in('plaque', variantesPlaque(plaque))
    .limit(500);
  if (error) throw error;
  const liste = data.filter((r) => r.manches?.courses && memePlaque(r.plaque, plaque)).map((r) => {
    const m = r.manches;
    const classement = calculerManche(m.resultats);
    return { manche: m, course: m.courses, moi: classement.find((p) => p.id === r.id), total: classement.length };
  }).filter((x) => x.moi).sort((a, b) => b.course.jour.localeCompare(a.course.jour)
    || String(b.course.cree_le || '').localeCompare(String(a.course.cree_le || ''))
    || b.manche.numero - a.manche.numero);
  cache.mesManches = { plaque, liste, quand: Date.now() };
  return liste;
}

const parOrdre = (a, b) => (a.categorie ?? '').localeCompare(b.categorie ?? '', 'fr') || a.numero - b.numero;

async function course(id) {
  if (frais(cache.course.get(id))) return cache.course.get(id).data;
  const { data, error } = await ctx.supabase.from('courses')
    .select('id, nom, jour, lieu, lignes, fichier, organisateur, manches(id, numero, nom, categorie, resultats(id, plaque, pilote, couloir, temps))')
    .eq('id', id).maybeSingle();
  if (error) throw error;
  if (data) {
    data.manches.sort(parOrdre);
    for (const m of data.manches) m.classement = calculerManche(m.resultats);
  }
  cache.course.set(id, { data, quand: Date.now() });
  return data;
}

async function manche(id) {
  if (frais(cache.manche.get(id))) return cache.manche.get(id).data;
  const { data, error } = await ctx.supabase.from('manches')
    .select('id, numero, nom, categorie, course_id, courses(id, nom, jour, lieu, lignes), resultats(id, plaque, pilote, couloir, temps)')
    .eq('id', id).maybeSingle();
  if (error) throw error;
  if (data) data.classement = calculerManche(data.resultats);
  cache.manche.set(id, { data, quand: Date.now() });
  return data;
}

function oublierTout() {
  cache.courses = null;
  cache.mesManches = null;
  cache.course.clear();
  cache.manche.clear();
}

// ---------------------------------------------------------------------------
// Morceaux d'écran
// ---------------------------------------------------------------------------

function carteCourse(c, moi) {
  const d = dateDe(c.jour);
  // (d.getDate() reste un nombre : la pastille est trop petite pour « 1er »)
  const nbManches = c.manches?.[0]?.count ?? c.manches?.length ?? 0;
  return `<a class="carte-compet m-carte-course touchable" href="#accueil/course/${esc(c.id)}">
    <span class="c-date"><span class="c-jour">${d.getDate()}</span><span class="c-mois">${esc(MOIS[d.getMonth()])}</span></span>
    <span class="c-corps">
      <strong class="c-nom-liste">${esc(c.nom)}</strong>
      <span class="c-lieu">${esc([c.lieu, String(d.getFullYear())].filter(Boolean).join(' · '))}</span>
      <span class="c-meta">${nbManches} manche${nbManches > 1 ? 's' : ''}${moi ? ' · <span class="m-a-toi">ta course</span>' : ''}</span>
    </span>
  </a>`;
}

function carteMaManche({ manche: m, course: c, moi, total }) {
  return `<a class="m-carte-manche touchable" href="#accueil/manche/${esc(m.id)}/${esc(moi.id)}">
    <span class="place-grosse ${moi.fini && moi.place === 1 ? 'p1' : ''}">${moi.fini ? esc(textePlace(moi.place)) : '—'}</span>
    <span class="m-carte-corps">
      <strong>${esc(c.nom)}</strong>
      <span class="doux">${esc(nomManche(m))} · ${esc(dateCourte(c.jour))}</span>
      <span class="m-carte-temps">${moi.fini ? `${esc(texteTemps(moi.final))} <small class="doux">${moi.place === 1 ? 'victoire' : esc(texteEcart(moi.passages[moi.passages.length - 1].ecart))}</small>` : finHtml(moi, c.lignes)}
        <small class="doux">· ${total} pilote${total > 1 ? 's' : ''}</small></span>
    </span>
    ${ICONES.fleche}
  </a>`;
}

// Tableau d'une manche. affichage : arrivee | secteurs | passages
function tableManche(m, lignes, affichage, lienBase) {
  const lien = (p) => (lienBase ? ` data-lien="${esc(`${lienBase}/${p.id}`)}" class="touchable${estMoi(p) ? ' m-moi' : ''}"` : estMoi(p) ? ' class="m-moi"' : '');
  const PL = '<th><abbr title="Place">Pl.</abbr></th>';
  const pilote = (p) => `<td class="cel-pilote"><strong class="m-plaque">${esc(p.plaque)}</strong> ${esc(p.pilote || '')}</td>`;
  let tete;
  let corps;
  if (affichage === 'secteurs') {
    tete = `${PL}<th>Pilote</th>${lignes.map((_, i) => `<th class="cel-num">S${i + 1}</th>`).join('')}`;
    corps = m.classement.map((p) => `<tr${lien(p)}><td class="cel-place">${placeHtml(p)}</td>${pilote(p)}
      ${p.passages.map((x) => `<td class="cel-num ${x.meilleurSecteur ? 'meilleur' : ''}">${x.secteur == null ? '—' : x.secteur.toFixed(3)}</td>`).join('')}</tr>`).join('');
  } else if (affichage === 'passages') {
    tete = `${PL}<th>Pilote</th>${lignes.map((n) => `<th class="cel-num">${esc(n)}</th>`).join('')}`;
    corps = m.classement.map((p) => `<tr${lien(p)}><td class="cel-place">${placeHtml(p)}</td>${pilote(p)}
      ${p.passages.map((x) => `<td class="cel-num">${x.temps == null ? '—' : `${texteTemps(x.temps)}<small class="pos-mini ${x.place === 1 ? 'p1' : ''}">${textePlace(x.place)}</small>`}</td>`).join('')}</tr>`).join('');
  } else {
    tete = `${PL}<th class="cel-num"><abbr title="Couloir">Coul.</abbr></th><th>Pilote</th><th class="cel-num">Temps</th><th class="cel-num">Écart</th>`;
    corps = m.classement.map((p) => `<tr${lien(p)}><td class="cel-place">${placeHtml(p)}</td>
      <td class="cel-num doux">${p.couloir ?? ''}</td>${pilote(p)}
      <td class="cel-num">${finHtml(p, lignes)}</td>
      <td class="cel-num doux">${p.fini ? texteEcart(p.passages[p.passages.length - 1].ecart) : ''}</td></tr>`).join('');
  }
  return `<div class="tableau-defile"><table class="t"><thead><tr>${tete}</tr></thead><tbody>${corps}</tbody></table></div>`;
}

function segmentsAffichage() {
  return `<div class="segments segments-affichage petit" role="group" aria-label="Affichage">
    ${[['arrivee', 'Arrivée'], ['secteurs', 'Secteurs'], ['passages', 'Passages']].map(([v, t]) =>
      `<button type="button" data-affichage="${v}" aria-pressed="${etat.affichage === v}">${t}</button>`).join('')}
  </div>`;
}

function astuceAffichage(lignes) {
  if (etat.affichage === 'secteurs') {
    return `<p class="astuce">${nomsSecteurs(lignes).map((n, i) => `<strong>S${i + 1}</strong> ${esc(n)}`).join(' · ')}. En or : le plus rapide.</p>`;
  }
  if (etat.affichage === 'passages') return '<p class="astuce">Temps au passage de chaque ligne (depuis la grille), avec la place du pilote à ce moment-là.</p>';
  return '';
}

function erreurChargement(zone, err, retour) {
  titrePage('Impossible de charger');
  zone.innerHTML = `${retour || ''}${vide('Impossible de charger.', messageErreur(err))}`;
}

function introuvable(zone, retour, titre) {
  titrePage(titre);
  zone.innerHTML = retour + vide(`${titre}.`, 'Elle a peut-être été supprimée par son organisateur.');
}

// ---------------------------------------------------------------------------
// 1. L'accueil
// ---------------------------------------------------------------------------

async function ecranAccueil(zone, j) {
  titrePage('Accueil');
  const pilote = Boolean(maPlaque());
  zone.innerHTML = `
    ${estOrganisateurValide() ? `<a class="bouton bouton-principal bouton-or m-importer" href="#accueil/importer">${ICONES.envoyer} Importer un fichier de temps</a>` : ''}
    ${pilote ? '<section class="bloc"><h2>Mes dernières manches</h2><div id="m-mes-manches"><p class="chargement">Chargement…</p></div></section>' : ''}
    <section class="bloc"><h2>Dernières courses</h2><div id="m-courses"><p class="chargement">Chargement…</p></div></section>`;

  const [mes, courses] = await Promise.allSettled([pilote ? mesManches() : [], dernieresCourses(8)]);
  if (j !== jeton) return;

  if (pilote) {
    const boite = zone.querySelector('#m-mes-manches');
    if (mes.status === 'rejected') boite.innerHTML = vide('Impossible de charger.', messageErreur(mes.reason));
    else if (!mes.value.length) {
      boite.innerHTML = vide('Pas encore de manche.', `Tes temps arriveront ici dès qu'un organisateur importera une course où tu roules avec la plaque ${maPlaque()}.`);
    } else {
      boite.innerHTML = `<div class="m-liste" data-apparait>${mes.value.slice(0, 5).map(carteMaManche).join('')}</div>`;
    }
  }

  const boite = zone.querySelector('#m-courses');
  if (courses.status === 'rejected') boite.innerHTML = vide('Impossible de charger.', messageErreur(courses.reason));
  else if (!courses.value.length) {
    boite.innerHTML = vide('Pas encore de course.', estOrganisateurValide()
      ? 'Importe ton premier fichier de temps avec le bouton ci-dessus.'
      : 'Les résultats arriveront ici dès qu’un organisateur aura importé sa première course.');
  } else {
    const mesCourses = new Set((mes.value || []).map((x) => x.course.id));
    boite.innerHTML = `<div class="m-liste">${courses.value.map((c) => carteCourse(c, mesCourses.has(c.id) || estMaCourse(c))).join('')}</div>
      <a class="lien-fleche" href="#accueil/courses">Toutes les courses ${ICONES.fleche}</a>`;
  }
}

// ---------------------------------------------------------------------------
// 2. Toutes les courses
// ---------------------------------------------------------------------------

const MAX_COURSES = 200;

async function ecranCourses(zone, j) {
  titrePage('Toutes les courses');
  const retour = lienRetour('#accueil', 'Accueil');
  zone.innerHTML = `${retour}<h1 class="titre-ecran salut or-brillant">Toutes les courses</h1><p class="chargement">Chargement…</p>`;
  let liste;
  try { liste = await dernieresCourses(MAX_COURSES); } catch (err) { if (j === jeton) erreurChargement(zone, err, retour); return; }
  if (j !== jeton) return;
  const combien = liste.length >= MAX_COURSES
    ? `Les ${MAX_COURSES} plus récentes.`
    : `${liste.length} course${liste.length > 1 ? 's' : ''}, de la plus récente à la plus ancienne.`;
  zone.innerHTML = `${retour}
    <h1 class="titre-ecran salut or-brillant">Toutes les courses</h1>
    <p class="sous-titre">${combien}</p>
    <div class="recherche petite">${ICONES.loupe}
      <label for="m-filtre" class="cache">Chercher une course ou un lieu</label>
      <input type="search" id="m-filtre" placeholder="Une course, un lieu…" autocomplete="off" maxlength="60">
    </div>
    <div class="m-liste" id="m-toutes">${liste.map((c) => carteCourse(c, estMaCourse(c))).join('') || vide('Pas encore de course.', '')}</div>`;
  const champ = zone.querySelector('#m-filtre');
  const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  champ.addEventListener('input', () => {
    const q = sansAccents(champ.value.trim());
    zone.querySelectorAll('#m-toutes > a').forEach((a, i) => {
      const c = liste[i];
      a.hidden = Boolean(q) && !sansAccents(`${c.nom} ${c.lieu || ''}`).includes(q);
    });
  });
}

// ---------------------------------------------------------------------------
// 3. Une course
// ---------------------------------------------------------------------------

async function ecranCourse(zone, j, id) {
  // « Retour » ramène là d'où l'on vient : toutes les courses, ou l'accueil
  const retour = avantActuel === 'courses' ? lienRetour('#accueil/courses', 'Toutes les courses') : lienRetour('#accueil', 'Accueil');
  if (!ID_VALIDE.test(id)) { introuvable(zone, retour, 'Course introuvable'); return; }
  // une autre course : on repart sans recherche ni catégorie
  if (etat.courseId !== id) { etat.courseId = id; etat.recherche = ''; etat.categorie = ''; }
  zone.innerHTML = `${retour}<p class="chargement">Chargement…</p>`;
  let c;
  try { c = await course(id); } catch (err) { if (j === jeton) erreurChargement(zone, err, retour); return; }
  if (j !== jeton) return;
  if (!c) { introuvable(zone, retour, 'Course introuvable'); return; }
  titrePage(c.nom);

  const nbPilotes = compterPilotes(c.manches.map((m) => m.resultats));
  const abandons = c.manches.reduce((n, m) => n + m.classement.filter((p) => !p.fini).length, 0);
  const categories = [...new Set(c.manches.map((m) => m.categorie).filter(Boolean))];
  if (!categories.includes(etat.categorie)) etat.categorie = '';
  const moi = maPlaque();
  const jeRoule = Boolean(moi) && c.manches.some((m) => m.resultats.some(estMoi));
  const aMoi = estMaCourse(c);

  zone.innerHTML = `${retour}
    <h1 class="titre-ecran salut or-brillant">${esc(c.nom)}</h1>
    <p class="sous-titre">${esc(dateLongue(c.jour))}${c.lieu ? ` · ${esc(c.lieu)}` : ''}</p>
    <div class="chiffres">
      <div class="or"><strong>${c.manches.length}</strong><span>manche${c.manches.length > 1 ? 's' : ''}</span></div>
      <div><strong>${nbPilotes}</strong><span>pilote${nbPilotes > 1 ? 's' : ''}</span></div>
      <div><strong>${c.lignes.length}</strong><span>ligne${c.lignes.length > 1 ? 's' : ''} de chrono</span></div>
      <div><strong>${abandons}</strong><span>non fini${abandons > 1 ? 's' : ''}</span></div>
    </div>
    <div class="recherche petite">${ICONES.loupe}
      <label for="m-cherche-pilote" class="cache">Chercher un pilote (plaque ou nom)</label>
      <input type="search" id="m-cherche-pilote" placeholder="Une plaque, un nom…" autocomplete="off" maxlength="40" value="${esc(etat.recherche)}">
    </div>
    ${jeRoule ? `<button type="button" class="puce m-voir-moi" data-moi aria-pressed="false">Mes manches (plaque ${esc(moi)})</button>` : ''}
    ${categories.length > 1 ? `<div class="puces puces-defile" role="group" aria-label="Catégorie">
      ${[['', 'Toutes'], ...categories.map((x) => [x, x])].map(([v, t]) => `<button type="button" class="puce" data-categorie="${esc(v)}" aria-pressed="${etat.categorie === v}">${esc(t)}</button>`).join('')}
    </div>` : ''}
    <p class="compte" id="m-compte" role="status" aria-live="polite"></p>
    <div class="m-manches" id="m-manches">
      ${c.manches.map((m) => `<article class="carte-manche" data-manche="${esc(m.id)}">
        <header class="mp-tete"><h2 class="m-titre-manche">${esc(nomManche(m))}</h2><span>${m.classement.length} pilote${m.classement.length > 1 ? 's' : ''}</span></header>
        ${tableManche(m, c.lignes, 'arrivee', `accueil/manche/${m.id}`)}
        <a class="lien-fleche" href="#accueil/manche/${esc(m.id)}">Secteurs et passages ${ICONES.fleche}</a>
      </article>`).join('')}
    </div>
    ${aMoi ? `<section class="bloc m-gerer">
      <h2>Ta course</h2>
      <p class="petit doux">Importée depuis ${c.fichier ? `« ${esc(c.fichier)} »` : 'un fichier'}. Une erreur dans les temps ? Supprime la course, corrige le fichier et importe-le à nouveau.</p>
      <button type="button" class="bouton bouton-danger" data-supprimer>${ICONES.poubelle} Supprimer cette course</button>
      <p class="message" id="m-message-supprimer" role="alert"></p>
    </section>` : ''}`;

  // Filtrer : catégorie + pilote cherché (une plaque : « 021 » = « 21 »)
  const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const cMoi = () => Boolean(moi) && memePlaque(etat.recherche.trim(), moi);
  const filtrer = () => {
    const brut = etat.recherche.trim();
    const q = sansAccents(brut);
    let vues = 0;
    c.manches.forEach((m) => {
      const carte = zone.querySelector(`[data-manche="${m.id}"]`);
      const bonneCat = !etat.categorie || m.categorie === etat.categorie;
      const trouve = (p) => Boolean(q) && (memePlaque(p.plaque, brut) || sansAccents(p.pilote).includes(q));
      const visible = bonneCat && (!q || m.classement.some(trouve));
      carte.hidden = !visible;
      carte.querySelectorAll('tbody tr').forEach((tr, k) => tr.classList.toggle('m-trouve', trouve(m.classement[k])));
      if (visible) vues++;
    });
    const compte = zone.querySelector('#m-compte');
    compte.textContent = q || etat.categorie
      ? (vues ? `${vues} manche${vues > 1 ? 's' : ''} trouvée${vues > 1 ? 's' : ''}.` : 'Aucune manche ne correspond.')
      : '';
    zone.querySelector('[data-moi]')?.setAttribute('aria-pressed', String(cMoi()));
  };
  const champ = zone.querySelector('#m-cherche-pilote');
  champ.addEventListener('input', () => { etat.recherche = champ.value; filtrer(); });
  zone.querySelector('[data-moi]')?.addEventListener('click', () => {
    etat.recherche = cMoi() ? '' : moi;
    champ.value = etat.recherche;
    filtrer();
  });
  zone.querySelectorAll('[data-categorie]').forEach((b) => b.addEventListener('click', () => {
    etat.categorie = b.dataset.categorie;
    zone.querySelectorAll('[data-categorie]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    filtrer();
  }));
  filtrer();

  // Supprimer (seulement l'organisateur de la course)
  const bouton = zone.querySelector('[data-supprimer]');
  bouton?.addEventListener('click', async () => {
    const ok = await demander(bouton, {
      texte: `La course « ${esc(c.nom)} » et tous ses temps (${c.manches.length} manche${c.manches.length > 1 ? 's' : ''}) seront effacés pour tout le monde. On ne peut pas revenir en arrière.`,
      oui: 'Oui, supprimer',
      classeOui: 'bouton-danger',
    });
    if (!ok) return;
    bouton.disabled = true;
    const { error } = await ctx.supabase.from('courses').delete().eq('id', c.id);
    bouton.disabled = false;
    if (j !== jeton) return;
    const message = zone.querySelector('#m-message-supprimer');
    if (error) {
      message.textContent = messageErreur(error); message.className = 'message erreur';
      window.vibrer?.('erreur');
      return;
    }
    window.vibrer?.('fort');
    oublierTout();
    remplacer('#accueil');   // la page de la course n'existe plus : on ne la laisse pas dans l'historique
  });
}

// ---------------------------------------------------------------------------
// 4. Une manche
// ---------------------------------------------------------------------------

async function ecranManche(zone, j, id) {
  const retourAccueil = lienRetour('#accueil', 'Accueil');
  if (!ID_VALIDE.test(id)) { introuvable(zone, retourAccueil, 'Manche introuvable'); return; }
  zone.innerHTML = `${retourAccueil}<p class="chargement">Chargement…</p>`;
  let m;
  try { m = await manche(id); } catch (err) { if (j === jeton) erreurChargement(zone, err, retourAccueil); return; }
  if (j !== jeton) return;
  if (!m) { introuvable(zone, retourAccueil, 'Manche introuvable'); return; }
  titrePage(titreManche(m));
  const c = m.courses;
  const vainqueur = m.classement[0];
  const dessiner = () => {
    zone.innerHTML = `${lienRetour(`#accueil/course/${c.id}`, c.nom)}
      <h1 class="titre-ecran salut or-brillant">${esc(nomManche(m))}</h1>
      <p class="sous-titre">${esc(c.nom)} · ${esc(dateCourte(c.jour))}${c.lieu ? ` · ${esc(c.lieu)}` : ''}</p>
      ${vainqueur?.fini ? `<div class="m-vainqueur cadre-or">
        <span class="medaille m1">1</span>
        <span><strong>${esc(nomPilote(vainqueur))}</strong><span class="doux">Plaque ${esc(vainqueur.plaque)}${vainqueur.couloir ? ` · couloir ${vainqueur.couloir}` : ''}</span></span>
        <strong class="m-vainqueur-temps">${esc(texteTemps(vainqueur.final))}</strong>
      </div>` : ''}
      ${segmentsAffichage()}
      ${astuceAffichage(c.lignes)}
      ${tableManche(m, c.lignes, etat.affichage, `accueil/manche/${m.id}`)}
      <p class="petit doux m-note">Touche un pilote pour voir tous ses temps.</p>`;
    zone.querySelectorAll('[data-affichage]').forEach((b) => b.addEventListener('click', () => {
      if (etat.affichage === b.dataset.affichage) return;
      etat.affichage = b.dataset.affichage;
      const y = window.scrollY;
      dessiner();
      window.scrollTo(0, y);
      zone.querySelector(`[data-affichage="${etat.affichage}"]`)?.focus({ preventScroll: true });
      animer(zone.querySelector('.tableau-defile'), 'glisse');
    }));
    brancherLiens(zone);
    brancherRetour(zone);
  };
  dessiner();
}

// ---------------------------------------------------------------------------
// 5. La fiche d'un pilote dans une manche
// ---------------------------------------------------------------------------

async function ecranPilote(zone, j, idManche, idResultat) {
  const pasTrouve = () => {
    titrePage('Pilote introuvable');
    zone.innerHTML = lienRetour('#accueil', 'Accueil') + vide('Pilote introuvable dans cette manche.', '');
  };
  if (!ID_VALIDE.test(idManche) || !ID_VALIDE.test(idResultat)) { pasTrouve(); return; }
  zone.innerHTML = `${lienRetour(`#accueil/manche/${esc(idManche)}`, 'La manche')}<p class="chargement">Chargement…</p>`;
  let m;
  try { m = await manche(idManche); } catch (err) { if (j === jeton) erreurChargement(zone, err, lienRetour('#accueil', 'Accueil')); return; }
  if (j !== jeton) return;
  const k = m ? m.classement.findIndex((p) => p.id === idResultat) : -1;
  if (k < 0) { pasTrouve(); return; }
  titrePage(nomPilote(m.classement[k]));
  const c = m.courses;
  const p = m.classement[k];
  const avant = m.classement[k - 1];
  const apres = m.classement[k + 1];
  const secteursNoms = nomsSecteurs(c.lignes);
  const meilleurs = p.passages.filter((x) => x.meilleurSecteur).length;
  const derniereEcart = p.fini ? p.passages[p.passages.length - 1].ecart : null;

  zone.innerHTML = `${lienRetour(`#accueil/manche/${m.id}`, nomManche(m))}
    <div class="m-fiche-tete">
      <span class="plaque m-plaque-fiche">${esc(p.plaque)}</span>
      <div>
        <h1 class="titre-ecran">${esc(nomPilote(p))}</h1>
        <p class="sous-titre">${esc(nomManche(m))} · ${esc(c.nom)}<br>${esc(dateCourte(c.jour))}${p.couloir ? ` · couloir ${p.couloir}` : ''}</p>
      </div>
    </div>
    <div class="chiffres">
      <div class="${p.fini && p.place === 1 ? 'or' : ''}"><strong>${p.fini ? esc(textePlace(p.place)) : '—'}</strong><span>place sur ${m.classement.length}</span></div>
      <div><strong>${p.fini ? esc(texteTemps(p.final)) : '—'}</strong><span>temps</span></div>
      <div><strong>${p.fini ? (derniereEcart === 0 ? '—' : esc(texteEcart(derniereEcart))) : '—'}</strong><span>${derniereEcart === 0 ? 'il gagne' : 'écart au 1er'}</span></div>
      <div class="${meilleurs ? 'or' : ''}"><strong>${meilleurs}</strong><span>secteur${meilleurs > 1 ? 's' : ''} le${meilleurs > 1 ? 's' : ''} plus rapide${meilleurs > 1 ? 's' : ''}</span></div>
    </div>
    ${p.fini ? '' : `<p class="note">${p.derniere < 0 ? "Aucun temps enregistré pour ce pilote dans cette manche (chute au départ, ou transpondeur qui n'a pas marché)." : `Ce pilote n'a pas fini la manche : dernier passage à « ${esc(c.lignes[p.derniere])} » (chute ou abandon).`}</p>`}

    <section class="bloc">
      <h2>Place à chaque ligne</h2>
      <ol class="m-parcours" data-apparait>
        <li><span class="m-parcours-ligne">Grille</span><span class="m-parcours-place doux">${p.couloir ? `C${p.couloir}` : '·'}</span></li>
        ${p.passages.map((x, i) => `<li class="${x.place === 1 ? 'p1' : ''}"><span class="m-parcours-ligne">${esc(c.lignes[i])}</span><span class="m-parcours-place">${x.place == null ? '—' : esc(textePlace(x.place))}</span></li>`).join('')}
      </ol>
    </section>

    <section class="bloc">
      <h2>Ligne par ligne</h2>
      <div class="tableau-defile"><table class="t">
        <thead><tr><th>Ligne</th><th class="cel-num">Temps</th><th class="cel-num">Place</th><th class="cel-num">Écart</th></tr></thead>
        <tbody>${p.passages.map((x, i) => `<tr><th scope="row">${esc(c.lignes[i])}</th>
          <td class="cel-num">${esc(texteTemps(x.temps))}</td>
          <td class="cel-num ${x.place === 1 ? 'meilleur' : ''}">${esc(textePlace(x.place))}</td>
          <td class="cel-num doux">${esc(texteEcart(x.ecart))}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>

    <section class="bloc">
      <h2>Temps par secteur</h2>
      <p class="astuce">En or : le plus rapide de la manche sur ce secteur.</p>
      <div class="tableau-defile"><table class="t">
        <thead><tr><th>Secteur</th><th class="cel-num">Temps</th><th class="cel-num">Rang</th></tr></thead>
        <tbody>${p.passages.map((x, i) => `<tr><th scope="row">S${i + 1} <small class="doux">${esc(secteursNoms[i])}</small></th>
          <td class="cel-num ${x.meilleurSecteur ? 'meilleur' : ''}">${x.secteur == null ? '—' : x.secteur.toFixed(3)}</td>
          <td class="cel-num">${esc(textePlace(x.rangSecteur))}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>

    <nav class="m-voisins" aria-label="Autres pilotes de la manche">
      ${avant ? `<a class="bouton bouton-secondaire" href="#accueil/manche/${m.id}/${avant.id}">← ${esc(textePlace(avant.place))}</a>` : '<span></span>'}
      ${apres ? `<a class="bouton bouton-secondaire" href="#accueil/manche/${m.id}/${apres.id}">${esc(textePlace(apres.place))} →</a>` : '<span></span>'}
    </nav>`;
}

// ---------------------------------------------------------------------------
// 6. Importer un fichier (organisateurs validés)
// ---------------------------------------------------------------------------

function ecranImporter(zone, j) {
  titrePage('Importer des temps');
  const retour = lienRetour('#accueil', 'Accueil');
  if (!estOrganisateurValide()) {
    zone.innerHTML = retour + vide('Réservé aux organisateurs validés.', ctx.profil.type_compte === 'organisateur'
      ? "Ton compte organisateur attend d'être validé par l'équipe DBSpeed."
      : 'Seuls les organisateurs de courses peuvent importer des temps.');
    return;
  }
  const a = etat.importation;
  zone.innerHTML = `${retour}
    <h1 class="titre-ecran salut or-brillant">Importer des temps</h1>
    <p class="sous-titre">Choisis le fichier Excel (.xlsx) ou CSV de ta course : DBSpeed calcule tout seul les places, les écarts et les temps par secteur de chaque pilote.</p>
    <div class="m-depot ${a ? 'm-depot-petit' : ''}">
      <input type="file" id="m-fichier" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="cache">
      <label for="m-fichier" class="bouton ${a ? 'bouton-secondaire' : 'bouton-principal bouton-or'} touchable">${ICONES.fichier} ${a ? 'Choisir un autre fichier' : 'Choisir le fichier'}</label>
      ${a ? '' : `<details class="m-format">
        <summary>Comment doit être le fichier ?</summary>
        <p>Une ligne par pilote et par manche, avec ces colonnes (dans cet ordre de préférence) :</p>
        <p class="m-colonnes"><span>Manche</span><span>Plaque</span><span>Pilote</span><span>Couloir</span><span>Départ</span><span>Inter 1</span><span>Inter 2…</span><span>Arrivée</span></p>
        <ul>
          <li>Temps en secondes depuis la chute de la grille : <strong>36.254</strong> (ou 0:36.254).</li>
          <li>Case vide (ou DNF) : le pilote n'est pas passé sur la ligne (chute, abandon).</li>
          <li>La manche peut être un numéro (1, 2, 3…) ou un nom (« 1/4 finale A »).</li>
          <li>Colonne <strong>Catégorie</strong> facultative. Colonnes Pilote et Couloir facultatives.</li>
          <li>Si « Départ » est une heure (transpondeurs), DBSpeed compte les temps à partir de là.</li>
          <li>8 pilotes au maximum par manche.</li>
        </ul>
        <a class="lien-fleche" href="/app/manches/temps-exemple.xlsx" download>Télécharger un fichier d'exemple ${ICONES.fleche}</a>
      </details>`}
    </div>
    <p class="message" id="m-message-import" role="alert"></p>
    <div id="m-apercu">${a ? apercuHtml(a) : ''}</div>`;

  const champ = zone.querySelector('#m-fichier');
  champ.addEventListener('change', async () => {
    const fichier = champ.files?.[0];
    if (!fichier) return;
    const message = zone.querySelector('#m-message-import');
    message.innerHTML = '<span class="roue" aria-hidden="true"></span> Lecture du fichier…';
    message.className = 'message ok';
    const analyse = await lireFichierTemps(fichier);
    // on a quitté l'écran pendant la lecture : on ne touche plus à rien
    if (j !== jeton) return;
    etat.importation = {
      ...analyse,
      fichier: fichier.name.slice(0, 200),
      nom: fichier.name.replace(/\.(xlsx|csv)$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 120),
      jour: aujourdhui(),
      lieu: ctx.profil.club || '',
    };
    window.vibrer?.(analyse.erreurs.length ? 'erreur' : 'fort');
    ecranImporter(zone, j);
    brancherRetour(zone);
    animer(zone.querySelector('#m-apercu'), 'glisse');
    zone.querySelector('#m-apercu').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  if (a) brancherApercu(zone, j);
}

const MAX_APERCU = 20;   // l'aperçu montre les 20 premières manches (un gros fichier en a des centaines)

function apercuHtml(a) {
  if (a.erreurs.length) {
    return `<section class="m-erreurs">
      <h2>À corriger dans « ${esc(a.fichier)} »</h2>
      <p>Rien n'a été enregistré. Corrige ${a.erreurs.length > 1 ? 'ces points' : 'ce point'} dans le fichier, puis choisis-le à nouveau :</p>
      <ul>${a.erreurs.slice(0, 20).map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
      ${a.erreurs.length > 20 ? `<p>… et ${a.erreurs.length - 20} autre${a.erreurs.length - 20 > 1 ? 's' : ''}.</p>` : ''}
    </section>`;
  }
  const pilotes = compterPilotes(a.manches.map((m) => m.pilotes));
  const classees = a.manches.map((m) => ({ ...m, classement: calculerManche(m.pilotes) }));
  const abandons = classees.reduce((n, m) => n + m.classement.filter((p) => !p.fini).length, 0);
  const reste = classees.length - MAX_APERCU;
  return `
    <section class="bloc">
      <h2>Ce que DBSpeed a trouvé</h2>
      <div class="chiffres">
        <div class="or"><strong>${a.manches.length}</strong><span>manche${a.manches.length > 1 ? 's' : ''}</span></div>
        <div><strong>${pilotes}</strong><span>pilote${pilotes > 1 ? 's' : ''}</span></div>
        <div><strong>${a.lignes.length}</strong><span>ligne${a.lignes.length > 1 ? 's' : ''} de chrono</span></div>
        <div><strong>${abandons}</strong><span>non fini${abandons > 1 ? 's' : ''}</span></div>
      </div>
      <p class="m-colonnes"><span>Départ</span>${a.lignes.map((l) => `<span>${esc(l)}</span>`).join('')}</p>
      ${a.avertissements.length ? `<div class="note"><strong>À vérifier :</strong><ul>${a.avertissements.slice(0, 10).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${a.avertissements.length > 10 ? `<p>… et ${a.avertissements.length - 10} autre${a.avertissements.length - 10 > 1 ? 's' : ''}.</p>` : ''}</div>` : ''}
    </section>

    <form class="panneau" id="m-form-import" novalidate>
      <div class="champ">
        <label for="m-nom">Nom de la course</label>
        <input type="text" id="m-nom" maxlength="120" required value="${esc(a.nom)}" placeholder="Ex. Coupe régionale, manche 3">
      </div>
      <div class="champ">
        <label for="m-jour">Jour</label>
        <input type="date" id="m-jour" required value="${esc(a.jour)}">
      </div>
      <div class="champ">
        <label for="m-lieu">Lieu (facultatif)</label>
        <input type="text" id="m-lieu" maxlength="120" value="${esc(a.lieu)}" placeholder="Ex. Piste de Sarrians">
      </div>
      <button type="submit" class="bouton bouton-principal bouton-or">${ICONES.envoyer} Enregistrer la course</button>
      <p class="petit doux">Tout le monde verra ces résultats. Chaque pilote retrouvera ses manches grâce à sa plaque.</p>
      <p class="message" id="m-message-envoi" role="alert"></p>
    </form>

    <section class="bloc">
      <h2>Aperçu des résultats</h2>
      <div class="m-manches">
        ${classees.slice(0, MAX_APERCU).map((m) => `<article class="carte-manche">
          <header class="mp-tete"><h3 class="m-titre-manche">${esc(nomManche(m))}</h3><span>${m.classement.length} pilote${m.classement.length > 1 ? 's' : ''}</span></header>
          ${tableManche(m, a.lignes, 'arrivee', null)}
        </article>`).join('')}
      </div>
      ${reste > 0 ? `<p class="petit doux m-reste">… et ${reste} autre${reste > 1 ? 's' : ''} manche${reste > 1 ? 's' : ''}.</p>` : ''}
    </section>`;
}

function brancherApercu(zone, j) {
  const form = zone.querySelector('#m-form-import');
  if (!form) return;
  const a = etat.importation;
  // on garde ce qui est tapé (si on change d'écran et qu'on revient)
  form.addEventListener('input', () => {
    a.nom = form.querySelector('#m-nom').value;
    a.jour = form.querySelector('#m-jour').value;
    a.lieu = form.querySelector('#m-lieu').value;
  });
  const bouton = form.querySelector('button[type="submit"]');
  let confirme = false;   // « importer quand même » déjà répondu oui
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (bouton.disabled) return;
    const message = form.querySelector('#m-message-envoi');
    const erreur = (texte, champ) => {
      message.textContent = texte; message.className = 'message erreur';
      window.vibrer?.('erreur');
      champ?.focus();
    };
    const nom = form.querySelector('#m-nom').value.trim();
    const jour = form.querySelector('#m-jour').value;
    const lieu = form.querySelector('#m-lieu').value.trim();
    if (nom.length < 2) return erreur('Donne un nom à la course (2 lettres au moins).', form.querySelector('#m-nom'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return erreur('Choisis le jour de la course.', form.querySelector('#m-jour'));
    bouton.disabled = true;
    message.innerHTML = '<span class="roue" aria-hidden="true"></span> Enregistrement…';
    message.className = 'message ok';

    // Déjà importée ? (même nom, même jour) : on demande avant d'en faire un doublon
    if (!confirme) {
      const { data: deja, error: errDeja } = await ctx.supabase.from('courses').select('id').eq('nom', nom).eq('jour', jour).limit(1);
      if (j !== jeton) return;
      if (!errDeja && deja?.length) {
        message.textContent = ''; message.className = 'message';
        const ok = await demander(bouton, {
          texte: 'Une course avec ce nom et ce jour existe déjà. L’importer quand même ?',
          oui: 'Oui, importer',
        });
        if (j !== jeton) return;
        if (!ok) { bouton.disabled = false; return; }
        confirme = true;
        message.innerHTML = '<span class="roue" aria-hidden="true"></span> Enregistrement…';
        message.className = 'message ok';
      }
    }

    const { data, error } = await ctx.supabase.rpc('importer_course', {
      p_nom: nom, p_jour: jour, p_lieu: lieu || null, p_lignes: a.lignes, p_fichier: a.fichier,
      p_manches: a.manches.map((m) => ({ numero: m.numero, nom: m.nom ?? null, categorie: m.categorie, pilotes: m.pilotes })),
    });
    bouton.disabled = false;
    if (error) return erreur(messageErreur(error));
    window.vibrer?.('fort');
    etat.importation = null;
    oublierTout();
    // l'écran d'import est fini : la course le remplace dans l'historique
    remplacer(`#accueil/course/${data}`);
  });
}

// ---------------------------------------------------------------------------
// Revenir en arrière
// ---------------------------------------------------------------------------

// Le lien « Retour » : si la page d'avant est celle qu'il montre, on revient vraiment
// en arrière (le navigateur garde l'historique propre, et on retrouve l'endroit où on était)
function brancherRetour(zone) {
  zone.querySelectorAll('[data-retour]').forEach((lien) => {
    if (lien.dataset.retourBranche) return;
    lien.dataset.retourBranche = '1';
    lien.addEventListener('click', (e) => {
      const cible = (lien.getAttribute('href') || '').replace(/^#accueil\/?/, '');
      if (avantActuel === null || cible !== avantActuel) return;   // sinon : lien normal
      e.preventDefault();
      history.back();
    });
  });
}

// Le titre de l'écran reçoit le focus (lecteur d'écran, clavier), sans faire défiler
function focusTitre(zone) {
  const h1 = zone.querySelector('h1');
  if (!h1) return;
  h1.tabIndex = -1;
  h1.focus({ preventScroll: true });
}

// ---------------------------------------------------------------------------
// Entrée
// ---------------------------------------------------------------------------

// La page de l'onglet Accueil montrée par l'adresse (« course/… »), ou null pour un autre onglet
function routeDansAdresse() {
  let brut = location.hash.replace(/^#/, '');
  try { brut = decodeURIComponent(brut); } catch { /* adresse bizarre */ }
  const parties = brut.split('/').filter(Boolean);
  return parties[0] === 'accueil' || !parties.length ? parties.slice(1).join('/') : null;
}

// On note sans arrêt où on est dans la page (aussi quand on part vers un autre onglet).
// Quand l'adresse vient de changer (retour du téléphone), le navigateur fait défiler tout seul
// avant que la nouvelle page s'affiche : ce défilement-là ne compte pas pour l'ancienne page.
let zoneVue = null;
window.addEventListener('scroll', () => {
  if (indexActuel === null || !zoneVue || zoneVue.closest('[hidden]')) return;
  if (routeDansAdresse() !== routeAvant) return;
  positions.set(indexActuel, window.scrollY);
}, { passive: true });

export function afficherManches(zone, parties, contexte) {
  ctx = contexte;
  zoneVue = zone;
  const route = parties.join('/');
  if (route === routeAvant && !autreOnglet) return;
  const depuisOnglet = autreOnglet;
  autreOnglet = false;

  // Où en est-on dans l'historique ? Chaque page reçoit un numéro dans history.state.
  const etatHisto = history.state && typeof history.state === 'object' ? history.state : null;
  const dejaVue = etatHisto?.dbsManche != null && etatHisto.dbsRoute === route;
  // on retient où on était sur la page qu'on quitte (pas quand on la remplace)
  // (déjà noté par l'écouteur de défilement ; ici seulement si on vient de cliquer un lien,
  // car le navigateur n'a pas encore bougé la page)
  if (indexActuel !== null && !remplacement && !depuisOnglet && !dejaVue) positions.set(indexActuel, window.scrollY);
  let enArriere = false;
  let position = 0;
  if (dejaVue) {
    // page déjà vue : on y revient (bouton retour / avancer du téléphone, ou retour d'un autre onglet)
    // et on retrouve l'endroit où on était
    enArriere = depuisOnglet || etatHisto.dbsManche < (indexActuel ?? Infinity);
    position = positions.get(etatHisto.dbsManche) || 0;
    indexActuel = etatHisto.dbsManche;
    avantActuel = etatHisto.dbsAvant ?? null;
  } else {
    const avant = remplacement ? avantActuel : (depuisOnglet ? null : routeAvant);
    indexActuel = ++compteur;
    avantActuel = avant;
    try {
      history.replaceState({ ...(etatHisto || {}), dbsManche: indexActuel, dbsRoute: route, dbsAvant: avant }, '');
    } catch { /* historique plein : tant pis, on fera sans */ }
  }
  remplacement = false;
  routeAvant = route;

  const j = ++jeton;
  const [page, a, b] = parties;
  animer(zone, enArriere ? 'glisse-droite' : 'glisse-gauche');
  let fini;
  if (!page) fini = ecranAccueil(zone, j);
  else if (page === 'courses') fini = ecranCourses(zone, j);
  else if (page === 'course' && a) fini = ecranCourse(zone, j, a);
  else if (page === 'manche' && a && b) fini = ecranPilote(zone, j, a, b);
  else if (page === 'manche' && a) fini = ecranManche(zone, j, a);
  else if (page === 'importer') fini = ecranImporter(zone, j);
  else { remplacer('#accueil'); return; }
  window.scrollTo(0, position);
  Promise.resolve(fini).then(() => {
    if (j !== jeton) return;
    brancherLiens(zone);
    brancherRetour(zone);
    focusTitre(zone);
    // une fois la page remplie, on retrouve l'endroit où on était
    window.scrollTo(0, position);
  });
}

// À appeler quand on revient sur l'onglet Accueil depuis un autre onglet,
// ou quand le profil change (la plaque) : les données sont rechargées.
export function rafraichirManches() {
  oublierTout();
  autreOnglet = true;
}
