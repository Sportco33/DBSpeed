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
import { lireFichierTemps } from '/app/manches/excel.js';
import { calculerManche, texteTemps, texteEcart, textePlace } from '/app/manches/calcul.js';

let ctx = null;
let routeAvant = null;
let jeton = 0;                       // une page plus récente a été demandée : on abandonne l'ancienne
const positions = new Map();         // où on était dans chaque page (pour revenir au même endroit)
const cache = { courses: null, mesManches: null, course: new Map(), manche: new Map() };
const etat = { affichage: 'arrivee', recherche: '', categorie: '', importation: null };

const ICONES = {
  fichier: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  envoyer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5"/><path d="M5 14v5h14v-5"/></svg>',
  fleche: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  loupe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
  poubelle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
};

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const dateDe = (jour) => new Date(`${jour}T12:00:00`);
const dateLongue = (jour) => dateDe(jour).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const dateCourte = (jour) => { const d = dateDe(jour); return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`; };
const aujourdhui = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const nomManche = (m) => `Manche ${m.numero}${m.categorie ? ` · ${m.categorie}` : ''}`;
const nomPilote = (p) => p.pilote || `Plaque ${p.plaque}`;
const maPlaque = () => (ctx.profil.type_compte === 'pilote' ? (ctx.profil.plaque || '').trim() : '');
const estOrganisateurValide = () => ctx.profil.type_compte === 'organisateur' && ctx.profil.organisateur_valide;

// Les secteurs : S1 = départ → 1re ligne, S2 = 1re ligne → 2e ligne…
const nomsSecteurs = (lignes) => lignes.map((nom, i) => `${i === 0 ? 'Départ' : lignes[i - 1]} → ${nom}`);

// Place, avec une médaille pour le podium
function placeHtml(p) {
  if (!p.fini) return `<span class="m-abandon" title="N'a pas fini">${p.place}</span>`;
  return p.place <= 3 ? `<span class="medaille m${p.place}">${p.place}</span>` : String(p.place);
}

// Ce qui est écrit à la place du temps quand le pilote n'a pas fini
function finHtml(p, lignes) {
  if (p.fini) return texteTemps(p.final);
  if (p.derniere < 0) return '<span class="chute">Pas de temps</span>';
  return `<span class="chute">Arrêt après ${esc(lignes[p.derniere])}</span>`;
}

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------

async function dernieresCourses(limite = 10) {
  if (cache.courses && cache.courses.limite >= limite) return cache.courses.liste.slice(0, limite);
  const { data, error } = await ctx.supabase.from('courses')
    .select('id, nom, jour, lieu, lignes, organisateur, manches(count)')
    .order('jour', { ascending: false }).order('cree_le', { ascending: false })
    .limit(limite);
  if (error) throw error;
  cache.courses = { limite, liste: data };
  return data;
}

// Toutes les manches où ma plaque apparaît (avec les autres pilotes, pour calculer ma place)
async function mesManches() {
  const plaque = maPlaque();
  if (!plaque) return [];
  if (cache.mesManches) return cache.mesManches;
  const { data, error } = await ctx.supabase.from('resultats')
    .select('id, plaque, manches(id, numero, categorie, courses(id, nom, jour, lieu, lignes), resultats(id, plaque, pilote, couloir, temps))')
    .eq('plaque', plaque)
    .limit(200);
  if (error) throw error;
  cache.mesManches = data.filter((r) => r.manches?.courses).map((r) => {
    const m = r.manches;
    const classement = calculerManche(m.resultats);
    return { manche: m, course: m.courses, moi: classement.find((p) => p.id === r.id), total: classement.length };
  }).sort((a, b) => b.course.jour.localeCompare(a.course.jour) || b.manche.numero - a.manche.numero);
  return cache.mesManches;
}

async function course(id) {
  if (cache.course.has(id)) return cache.course.get(id);
  const { data, error } = await ctx.supabase.from('courses')
    .select('id, nom, jour, lieu, lignes, fichier, organisateur, manches(id, numero, categorie, resultats(id, plaque, pilote, couloir, temps))')
    .eq('id', id).maybeSingle();
  if (error) throw error;
  if (data) {
    data.manches.sort((a, b) => (a.categorie ?? '').localeCompare(b.categorie ?? '', 'fr') || a.numero - b.numero);
    for (const m of data.manches) m.classement = calculerManche(m.resultats);
  }
  cache.course.set(id, data);
  return data;
}

async function manche(id) {
  if (cache.manche.has(id)) return cache.manche.get(id);
  const { data, error } = await ctx.supabase.from('manches')
    .select('id, numero, categorie, course_id, courses(id, nom, jour, lieu, lignes), resultats(id, plaque, pilote, couloir, temps)')
    .eq('id', id).maybeSingle();
  if (error) throw error;
  if (data) data.classement = calculerManche(data.resultats);
  cache.manche.set(id, data);
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
  const lien = (p) => (lienBase ? ` data-lien="${esc(`${lienBase}/${p.id}`)}" class="touchable${p.plaque === maPlaque() ? ' m-moi' : ''}"` : p.plaque === maPlaque() ? ' class="m-moi"' : '');
  const pilote = (p) => `<td class="cel-pilote"><strong class="m-plaque">${esc(p.plaque)}</strong> ${esc(p.pilote || '')}</td>`;
  let tete;
  let corps;
  if (affichage === 'secteurs') {
    tete = `<th>Pl.</th><th>Pilote</th>${lignes.map((_, i) => `<th class="cel-num">S${i + 1}</th>`).join('')}`;
    corps = m.classement.map((p) => `<tr${lien(p)}><td class="cel-place">${placeHtml(p)}</td>${pilote(p)}
      ${p.passages.map((x) => `<td class="cel-num ${x.meilleurSecteur ? 'meilleur' : ''}">${x.secteur == null ? '—' : x.secteur.toFixed(3)}</td>`).join('')}</tr>`).join('');
  } else if (affichage === 'passages') {
    tete = `<th>Pl.</th><th>Pilote</th>${lignes.map((n) => `<th class="cel-num">${esc(n)}</th>`).join('')}`;
    corps = m.classement.map((p) => `<tr${lien(p)}><td class="cel-place">${placeHtml(p)}</td>${pilote(p)}
      ${p.passages.map((x) => `<td class="cel-num">${x.temps == null ? '—' : `${texteTemps(x.temps)}<small class="pos-mini ${x.place === 1 ? 'p1' : ''}">${textePlace(x.place)}</small>`}</td>`).join('')}</tr>`).join('');
  } else {
    tete = '<th>Pl.</th><th class="cel-num">Coul.</th><th>Pilote</th><th class="cel-num">Temps</th><th class="cel-num">Écart</th>';
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
  zone.innerHTML = `${retour || ''}${vide('Impossible de charger.', messageErreur(err))}`;
}

// ---------------------------------------------------------------------------
// 1. L'accueil
// ---------------------------------------------------------------------------

async function ecranAccueil(zone, j) {
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
    boite.innerHTML = `<div class="m-liste">${courses.value.map((c) => carteCourse(c, mesCourses.has(c.id) || c.organisateur === ctx.profil.id)).join('')}</div>
      <a class="lien-fleche" href="#accueil/courses">Toutes les courses ${ICONES.fleche}</a>`;
  }
}

// ---------------------------------------------------------------------------
// 2. Toutes les courses
// ---------------------------------------------------------------------------

async function ecranCourses(zone, j) {
  zone.innerHTML = `${lienRetour('#accueil', 'Accueil')}<h1 class="titre-ecran salut or-brillant">Toutes les courses</h1><p class="chargement">Chargement…</p>`;
  let liste;
  try { liste = await dernieresCourses(200); } catch (err) { if (j === jeton) erreurChargement(zone, err, lienRetour('#accueil', 'Accueil')); return; }
  if (j !== jeton) return;
  zone.innerHTML = `${lienRetour('#accueil', 'Accueil')}
    <h1 class="titre-ecran salut or-brillant">Toutes les courses</h1>
    <p class="sous-titre">${liste.length} course${liste.length > 1 ? 's' : ''}, de la plus récente à la plus ancienne.</p>
    <div class="recherche petite">${ICONES.loupe}
      <label for="m-filtre" class="cache">Chercher une course ou un lieu</label>
      <input type="search" id="m-filtre" placeholder="Une course, un lieu…" autocomplete="off" maxlength="60">
    </div>
    <div class="m-liste" id="m-toutes">${liste.map((c) => carteCourse(c, c.organisateur === ctx.profil.id)).join('') || vide('Pas encore de course.', '')}</div>`;
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
  const retour = lienRetour('#accueil', 'Accueil');
  zone.innerHTML = `${retour}<p class="chargement">Chargement…</p>`;
  let c;
  try { c = await course(id); } catch (err) { if (j === jeton) erreurChargement(zone, err, retour); return; }
  if (j !== jeton) return;
  if (!c) { zone.innerHTML = retour + vide('Course introuvable.', 'Elle a peut-être été supprimée par son organisateur.'); return; }

  const nbPilotes = new Set(c.manches.flatMap((m) => m.resultats.map((r) => r.plaque))).size;
  const abandons = c.manches.reduce((n, m) => n + m.classement.filter((p) => !p.fini).length, 0);
  const categories = [...new Set(c.manches.map((m) => m.categorie).filter(Boolean))];
  if (!categories.includes(etat.categorie)) etat.categorie = '';
  const moi = maPlaque();
  const jeRoule = moi && c.manches.some((m) => m.resultats.some((r) => r.plaque === moi));

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
    ${jeRoule ? `<button type="button" class="puce m-voir-moi" data-moi aria-pressed="${etat.recherche === moi}">Mes manches (plaque ${esc(moi)})</button>` : ''}
    ${categories.length > 1 ? `<div class="puces puces-defile" role="group" aria-label="Catégorie">
      ${[['', 'Toutes'], ...categories.map((x) => [x, x])].map(([v, t]) => `<button type="button" class="puce" data-categorie="${esc(v)}" aria-pressed="${etat.categorie === v}">${esc(t)}</button>`).join('')}
    </div>` : ''}
    <p class="compte" id="m-compte" role="status" aria-live="polite"></p>
    <div class="m-manches" id="m-manches">
      ${c.manches.map((m) => `<article class="carte-manche" data-manche="${esc(m.id)}">
        <header class="mp-tete"><strong>${esc(nomManche(m))}</strong><span>${m.classement.length} pilote${m.classement.length > 1 ? 's' : ''}</span></header>
        ${tableManche(m, c.lignes, 'arrivee', `accueil/manche/${m.id}`)}
        <a class="lien-fleche" href="#accueil/manche/${esc(m.id)}">Secteurs et passages ${ICONES.fleche}</a>
      </article>`).join('')}
    </div>
    ${c.organisateur === ctx.profil.id ? `<section class="bloc m-gerer">
      <h2>Ta course</h2>
      <p class="petit doux">Importée depuis ${c.fichier ? `« ${esc(c.fichier)} »` : 'un fichier'}. Une erreur dans les temps ? Supprime la course, corrige le fichier et importe-le à nouveau.</p>
      <button type="button" class="bouton bouton-danger" data-supprimer>${ICONES.poubelle} Supprimer cette course</button>
      <p class="message" id="m-message-supprimer" role="alert"></p>
    </section>` : ''}`;

  // Filtrer : catégorie + pilote cherché
  const sansAccents = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtrer = () => {
    const q = sansAccents(etat.recherche.trim());
    let vues = 0;
    c.manches.forEach((m) => {
      const carte = zone.querySelector(`[data-manche="${m.id}"]`);
      const bonneCat = !etat.categorie || m.categorie === etat.categorie;
      const trouve = (p) => q && (sansAccents(p.plaque) === q || sansAccents(p.pilote).includes(q));
      const visible = bonneCat && (!q || m.classement.some(trouve));
      carte.hidden = !visible;
      carte.querySelectorAll('tbody tr').forEach((tr, k) => tr.classList.toggle('m-trouve', Boolean(trouve(m.classement[k]))));
      if (visible) vues++;
    });
    const compte = zone.querySelector('#m-compte');
    compte.textContent = q || etat.categorie
      ? (vues ? `${vues} manche${vues > 1 ? 's' : ''} trouvée${vues > 1 ? 's' : ''}.` : 'Aucune manche ne correspond.')
      : '';
    zone.querySelector('[data-moi]')?.setAttribute('aria-pressed', String(Boolean(moi) && etat.recherche === moi));
  };
  const champ = zone.querySelector('#m-cherche-pilote');
  champ.addEventListener('input', () => { etat.recherche = champ.value; filtrer(); });
  zone.querySelector('[data-moi]')?.addEventListener('click', () => {
    etat.recherche = etat.recherche === moi ? '' : moi;
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
    const message = zone.querySelector('#m-message-supprimer');
    if (error) {
      message.textContent = messageErreur(error); message.className = 'message erreur';
      window.vibrer?.('erreur');
      return;
    }
    window.vibrer?.('fort');
    oublierTout();
    location.hash = 'accueil';
  });
}

// ---------------------------------------------------------------------------
// 4. Une manche
// ---------------------------------------------------------------------------

async function ecranManche(zone, j, id) {
  zone.innerHTML = `${lienRetour('#accueil', 'Accueil')}<p class="chargement">Chargement…</p>`;
  let m;
  try { m = await manche(id); } catch (err) { if (j === jeton) erreurChargement(zone, err, lienRetour('#accueil', 'Accueil')); return; }
  if (j !== jeton) return;
  if (!m) { zone.innerHTML = lienRetour('#accueil', 'Accueil') + vide('Manche introuvable.', 'Elle a peut-être été supprimée par son organisateur.'); return; }
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
      animer(zone.querySelector('.tableau-defile'), 'glisse');
    }));
    brancherLiens(zone);
  };
  dessiner();
}

// ---------------------------------------------------------------------------
// 5. La fiche d'un pilote dans une manche
// ---------------------------------------------------------------------------

async function ecranPilote(zone, j, idManche, idResultat) {
  zone.innerHTML = `${lienRetour(`#accueil/manche/${esc(idManche)}`, 'La manche')}<p class="chargement">Chargement…</p>`;
  let m;
  try { m = await manche(idManche); } catch (err) { if (j === jeton) erreurChargement(zone, err, lienRetour('#accueil', 'Accueil')); return; }
  if (j !== jeton) return;
  const k = m ? m.classement.findIndex((p) => p.id === idResultat) : -1;
  if (k < 0) { zone.innerHTML = lienRetour('#accueil', 'Accueil') + vide('Pilote introuvable dans cette manche.', ''); return; }
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

function ecranImporter(zone) {
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
    etat.importation = {
      ...analyse,
      fichier: fichier.name.slice(0, 200),
      nom: fichier.name.replace(/\.(xlsx|csv)$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 120),
      jour: aujourdhui(),
      lieu: ctx.profil.club || '',
    };
    window.vibrer?.(analyse.erreurs.length ? 'erreur' : 'fort');
    ecranImporter(zone);
    animer(zone.querySelector('#m-apercu'), 'glisse');
    zone.querySelector('#m-apercu').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  if (a) brancherApercu(zone);
}

function apercuHtml(a) {
  if (a.erreurs.length) {
    return `<section class="m-erreurs">
      <h2>À corriger dans « ${esc(a.fichier)} »</h2>
      <p>Rien n'a été enregistré. Corrige ${a.erreurs.length > 1 ? 'ces points' : 'ce point'} dans le fichier, puis choisis-le à nouveau :</p>
      <ul>${a.erreurs.slice(0, 20).map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
      ${a.erreurs.length > 20 ? `<p>… et ${a.erreurs.length - 20} autre${a.erreurs.length - 20 > 1 ? 's' : ''}.</p>` : ''}
    </section>`;
  }
  const pilotes = a.manches.reduce((n, m) => n + m.pilotes.length, 0);
  const classees = a.manches.map((m) => ({ ...m, classement: calculerManche(m.pilotes) }));
  const abandons = classees.reduce((n, m) => n + m.classement.filter((p) => !p.fini).length, 0);
  return `
    <section class="bloc">
      <h2>Ce que DBSpeed a trouvé</h2>
      <div class="chiffres">
        <div class="or"><strong>${a.manches.length}</strong><span>manche${a.manches.length > 1 ? 's' : ''}</span></div>
        <div><strong>${pilotes}</strong><span>passage${pilotes > 1 ? 's' : ''} de pilote</span></div>
        <div><strong>${a.lignes.length}</strong><span>ligne${a.lignes.length > 1 ? 's' : ''} de chrono</span></div>
        <div><strong>${abandons}</strong><span>non fini${abandons > 1 ? 's' : ''}</span></div>
      </div>
      <p class="m-colonnes"><span>Départ</span>${a.lignes.map((l) => `<span>${esc(l)}</span>`).join('')}</p>
      ${a.avertissements.length ? `<div class="note"><strong>À vérifier :</strong><ul>${a.avertissements.slice(0, 10).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
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
        ${classees.map((m) => `<article class="carte-manche">
          <header class="mp-tete"><strong>${esc(nomManche(m))}</strong><span>${m.classement.length} pilote${m.classement.length > 1 ? 's' : ''}</span></header>
          ${tableManche(m, a.lignes, 'arrivee', null)}
        </article>`).join('')}
      </div>
    </section>`;
}

function brancherApercu(zone) {
  const form = zone.querySelector('#m-form-import');
  if (!form) return;
  const a = etat.importation;
  // on garde ce qui est tapé (si on change d'écran et qu'on revient)
  form.addEventListener('input', () => {
    a.nom = form.querySelector('#m-nom').value;
    a.jour = form.querySelector('#m-jour').value;
    a.lieu = form.querySelector('#m-lieu').value;
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
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
    const bouton = form.querySelector('button[type="submit"]');
    bouton.disabled = true;
    message.innerHTML = '<span class="roue" aria-hidden="true"></span> Enregistrement…';
    message.className = 'message ok';
    const { data, error } = await ctx.supabase.rpc('importer_course', {
      p_nom: nom, p_jour: jour, p_lieu: lieu || null, p_lignes: a.lignes, p_fichier: a.fichier,
      p_manches: a.manches.map((m) => ({ numero: m.numero, categorie: m.categorie, pilotes: m.pilotes })),
    });
    bouton.disabled = false;
    if (error) return erreur(messageErreur(error));
    window.vibrer?.('fort');
    etat.importation = null;
    oublierTout();
    location.hash = `accueil/course/${data}`;
  });
}

// ---------------------------------------------------------------------------
// Entrée
// ---------------------------------------------------------------------------

export function afficherManches(zone, parties, contexte) {
  ctx = contexte;
  const route = parties.join('/');
  if (route === routeAvant) return;
  // on retient où on était sur la page qu'on quitte
  if (routeAvant !== null) positions.set(routeAvant, window.scrollY);
  const enArriere = routeAvant !== null && (routeAvant.startsWith(route) || route === '');
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
  else if (page === 'importer') fini = ecranImporter(zone);
  else { location.replace('#accueil'); return; }
  Promise.resolve(fini).then(() => {
    if (j !== jeton) return;
    brancherLiens(zone);
    window.scrollTo(0, enArriere ? positions.get(route) || 0 : 0);
  });
  window.scrollTo(0, enArriere ? positions.get(route) || 0 : 0);
}

// À appeler quand on revient sur l'onglet Accueil depuis un autre onglet
export function rafraichirManches() {
  routeAvant = null;
}
