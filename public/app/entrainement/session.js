// DBSpeed — sessions d'entraînement en groupe (dans l'onglet Entraînement)
// Écrans (adresse après #entrainement) :
//   /sessions            → mes sessions : invitations, en cours, historique ; créer ; rejoindre avec un code
//   /session/nouvelle    → créer une session (nom, piste, jour, amis à inviter)
//   /session/exemple     → une session d'exemple qui se joue toute seule (pilotes imaginaires)
//   /session/ID          → la session : Direct (classement en direct), Secteurs (qui est devant), Historique
//   /rejoindre/CODE      → rejoindre avec le lien reçu
// Couleurs comme en F1 : violet = meilleur du groupe, vert = le pilote s'améliore, rouge = moins bien que son meilleur.
import { messageErreur } from '/app/supabase.js';
import { esc, lienRetour, vide, puces, surChoix, secteurs, demander } from '/app/outils.js';
import { outilsEntrainement as O } from '/app/entrainement/vue.js';

const { temps, ecartTexte, prenom, dateLongue, dateCourte, nomsLignes, ICONES } = O;

const ICONES_S = {
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  lien: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  partager: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/></svg>',
  drapeau: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V3.5"/><path d="M5 4h13l-2.5 4.5L18 13H5"/></svg>',
  eclair: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  couronne: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>',
  chrono: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5M12 2.5V6"/></svg>',
  sortie: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
};

// ---------------------------------------------------------------------------
// État de l'écran
// ---------------------------------------------------------------------------
const memoire = { vue: 'direct', podiumVu: new Set(), nouvelle: null, piste: null };
let ctx = null;
let minuteur = null;        // demande les nouveaux tours toutes les quelques secondes
let moteurExemple = null;   // session d'exemple : un tour arrive toutes les 2 secondes
let ecouteVisibilite = null;

export function arreterSession() {
  clearInterval(minuteur);
  minuteur = null;
  clearInterval(moteurExemple);
  moteurExemple = null;
  if (ecouteVisibilite) document.removeEventListener('visibilitychange', ecouteVisibilite);
  ecouteVisibilite = null;
  document.querySelector('.s-toasts')?.remove();
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------
export async function afficherSessions(zone, chemin, contexte, estValide) {
  ctx = contexte;
  const [type, cible] = chemin;
  const estPilote = ctx.profil?.type_compte === 'pilote';
  if (!estPilote) {
    zone.innerHTML = `${lienRetour('#entrainement', 'Entraînement')}
      <h1 class="titre-ecran">Sessions de groupe</h1>
      ${vide('Réservé aux pilotes.', 'Les sessions de groupe servent à comparer les chronos des pilotes qui roulent ensemble. Ton compte n\'est pas un compte pilote.')}`;
    return;
  }
  if (type === 'sessions') return ecranListe(zone, estValide);
  if (type === 'rejoindre') return ecranRejoindre(zone, cible || '', estValide);
  if (cible === 'nouvelle') return ecranNouvelle(zone, estValide);
  if (cible === 'exemple') return ecranSession(zone, 'exemple', estValide);
  if (cible) return ecranSession(zone, cible, estValide);
  return ecranListe(zone, estValide);
}

// ---------------------------------------------------------------------------
// Petits outils
// ---------------------------------------------------------------------------
const calme = () => O.calme();
const nb = (n, mot, pluriel = `${mot}s`) => `${n} ${n > 1 ? pluriel : mot}`;
const initiales = (nom) => (nom || '?').trim().split(/\s+/).slice(0, 2).map((m) => m[0]).join('').toUpperCase();
const nomCourt = (m) => (m.est_moi ? 'Toi' : prenom(m.nom));
function plaque(m, classe = '') {
  return `<span class="s-plaque ${classe}" style="--c:var(--p${m.couleur ?? 0})" aria-hidden="true">${esc(m.plaque || initiales(m.nom))}</span>`;
}
function heureCourte(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function dire(zone, texte, genre = 'erreur') {
  const m = zone.querySelector('[data-message]');
  if (!m) return;
  m.textContent = texte;
  m.className = `message ${genre}`;
  if (texte) window.vibrer?.(genre === 'erreur' ? 'erreur' : 'fort');
}
function nomSession(s) {
  return s.nom || `Session du ${dateCourte(s.jour)}`;
}
function segments(nom, options, actif) {
  return `<div class="segments s-segments" role="group" aria-label="${esc(nom)}">${options.map(([valeur, texte]) =>
    `<button type="button" data-valeur="${esc(valeur)}" aria-pressed="${valeur === actif}">${texte}</button>`).join('')}</div>`;
}
function lienInvitation(code) {
  return `${location.origin}/app/accueil.html#entrainement/rejoindre/${code}`;
}

// Feux de départ (5 rouges qui s'allument, puis tout s'éteint : GO !)
function feuxDeDepart() {
  if (calme()) return Promise.resolve();
  return new Promise((fini) => {
    const f = document.createElement('div');
    f.className = 's-feux';
    f.setAttribute('aria-hidden', 'true');
    f.innerHTML = `<div class="s-feux-rang">${'<span></span>'.repeat(5)}</div><p class="s-go">GO !</p>`;
    document.body.append(f);
    const feux = f.querySelectorAll('.s-feux-rang span');
    feux.forEach((s, i) => setTimeout(() => { s.classList.add('on'); window.vibrer?.('leger'); }, 180 + i * 220));
    setTimeout(() => { f.classList.add('go'); window.vibrer?.('fort'); }, 180 + 5 * 220 + 250);
    setTimeout(() => { f.classList.add('fin'); fini(); }, 180 + 5 * 220 + 900);
    setTimeout(() => f.remove(), 180 + 5 * 220 + 1300);
  });
}

// Confettis (or et violet) : quand quelqu'un bat le meilleur tour, et au podium
function confettis(nombre = 36) {
  if (calme()) return;
  const boite = document.createElement('div');
  boite.className = 's-confettis';
  boite.setAttribute('aria-hidden', 'true');
  const couleurs = ['var(--or-300)', 'var(--f1-violet)', 'var(--or-50)', 'var(--or-500)', 'var(--f1-vert)'];
  for (let i = 0; i < nombre; i += 1) {
    const c = document.createElement('i');
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = couleurs[i % couleurs.length];
    c.style.width = `${6 + Math.random() * 6}px`;
    c.style.height = `${8 + Math.random() * 8}px`;
    boite.append(c);
    const derive = (Math.random() - 0.5) * 160;
    c.animate([
      { transform: 'translate(0, -20px) rotate(0deg)', opacity: 1 },
      { transform: `translate(${derive}px, ${window.innerHeight * (0.6 + Math.random() * 0.5)}px) rotate(${360 + Math.random() * 540}deg)`, opacity: 0.9, offset: 0.85 },
      { transform: `translate(${derive * 1.1}px, ${window.innerHeight * 1.1}px) rotate(900deg)`, opacity: 0 },
    ], { duration: 1600 + Math.random() * 1200, delay: Math.random() * 300, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
  }
  document.body.append(boite);
  setTimeout(() => boite.remove(), 3400);
}

// Petite annonce en haut de l'écran (nouveau tour, meilleur secteur…)
function annoncer(html, genre = '') {
  let boite = document.querySelector('.s-toasts');
  if (!boite) {
    boite = document.createElement('div');
    boite.className = 's-toasts';
    boite.setAttribute('aria-live', 'polite');
    document.body.append(boite);
  }
  const t = document.createElement('div');
  t.className = `s-toast ${genre}`;
  t.innerHTML = html;
  boite.append(t);
  while (boite.children.length > 3) boite.firstElementChild.remove();
  setTimeout(() => t.classList.add('part'), 3200);
  setTimeout(() => t.remove(), 3600);
}

// ===========================================================================
// Calcul : couleurs F1, classement, secteurs, badges
// ===========================================================================
// Pour chaque tour, dans l'ordre où ils ont été faits, chaque secteur est :
//   violet : meilleur temps du groupe sur ce secteur (à ce moment-là)
//   vert   : le pilote bat son propre meilleur temps sur ce secteur
//   rouge  : moins bien que son meilleur
export function analyser(d) {
  const piste = d.session.piste;
  const nbS = Math.max(1, (piste?.lignes?.length || 2) - 1, ...d.tours.map((t) => t.temps.length));
  const pilotes = new Map();
  for (const m of d.membres) {
    if (m.invite) continue;
    pilotes.set(m.id, {
      ...m, tours: [], meilleur: null, meilleurTour: null, premier: null, dernier: null,
      meilleursS: Array(nbS).fill(null), violets: 0, chutes: 0,
    });
  }
  const bestS = Array(nbS).fill(null);
  let bestTour = null;
  let bestTourPilote = null;
  const tours = d.tours
    .filter((t) => pilotes.has(t.pilote))
    .map((t) => ({ ...t, temps: t.temps.map((v) => (v == null ? null : Number(v))), temps_final: t.temps_final == null ? null : Number(t.temps_final) }))
    .sort((a, b) => (a.heure < b.heure ? -1 : a.heure > b.heure ? 1 : a.numero - b.numero));

  for (const t of tours) {
    const p = pilotes.get(t.pilote);
    t.s = secteurs(t.temps);
    t.couleurs = t.s.map((v, i) => {
      if (v == null) return null;
      if (bestS[i] == null || v < bestS[i]) {
        bestS[i] = v;
        p.meilleursS[i] = v;
        return 'violet';
      }
      if (p.meilleursS[i] == null || v < p.meilleursS[i]) {
        p.meilleursS[i] = v;
        return 'vert';
      }
      return 'rouge';
    });
    if (t.temps_final != null) {
      if (bestTour == null || t.temps_final < bestTour) { bestTour = t.temps_final; bestTourPilote = p.id; t.couleurFinale = 'violet'; }
      else if (p.meilleur == null || t.temps_final < p.meilleur) t.couleurFinale = 'vert';
      else t.couleurFinale = 'rouge';
      if (p.meilleur == null || t.temps_final < p.meilleur) { p.meilleur = t.temps_final; p.meilleurTour = t; }
      if (p.premier == null) p.premier = t.temps_final;
    } else {
      t.couleurFinale = null;
      p.chutes += 1;
    }
    p.tours.push(t);
    t.rang = p.tours.length; // « Tour 3 » = le 3e tour du pilote dans la session
    p.dernier = t;
  }

  // qui a le meilleur temps de chaque secteur, maintenant
  const detenteurs = bestS.map((v, i) => {
    if (v == null) return null;
    const p = [...pilotes.values()].find((x) => x.meilleursS[i] === v);
    if (p) p.violets += 1;
    return p?.id || null;
  });
  for (const p of pilotes.values()) {
    p.ideal = p.meilleursS.every((v) => v != null) ? Math.round(p.meilleursS.reduce((a, v) => a + v, 0) * 1000) / 1000 : null;
    const finis = p.tours.filter((t) => t.temps_final != null).map((t) => t.temps_final);
    p.nbFinis = finis.length;
    p.moyenne = finis.length ? finis.reduce((a, v) => a + v, 0) / finis.length : null;
    p.ecartType = finis.length >= 3 ? Math.sqrt(finis.reduce((a, v) => a + (v - p.moyenne) ** 2, 0) / finis.length) : null;
  }
  const classement = [...pilotes.values()].sort((a, b) =>
    (a.meilleur == null) - (b.meilleur == null) || (a.meilleur ?? 0) - (b.meilleur ?? 0) || b.tours.length - a.tours.length);
  classement.forEach((p, i) => {
    p.position = p.meilleur == null ? null : i + 1;
    p.ecart = p.meilleur == null || bestTour == null ? null : p.meilleur - bestTour;
  });

  // badges de fin de session
  const avec = (f) => classement.filter(f);
  const max = (liste, f) => liste.reduce((m, p) => (m == null || f(p) > f(m) ? p : m), null);
  const min = (liste, f) => liste.reduce((m, p) => (m == null || f(p) < f(m) ? p : m), null);
  const badges = [];
  const roi = max(avec((p) => p.violets > 0), (p) => p.violets);
  if (roi) badges.push({ cle: 'roi', titre: 'Roi des secteurs', texte: `${nb(roi.violets, 'secteur')} en violet`, pilote: roi });
  const progres = max(avec((p) => p.premier != null && p.meilleur != null && p.premier - p.meilleur > 0.0005), (p) => p.premier - p.meilleur);
  if (progres) badges.push({ cle: 'progres', titre: 'Plus gros progrès', texte: `${(progres.premier - progres.meilleur).toFixed(3)} s gagnées depuis son 1er tour`, pilote: progres });
  const regulier = min(avec((p) => p.ecartType != null), (p) => p.ecartType);
  if (regulier) badges.push({ cle: 'regulier', titre: 'Le plus régulier', texte: `± ${regulier.ecartType.toFixed(3)} s d'un tour à l'autre`, pilote: regulier });
  const endurant = max(avec((p) => p.tours.length > 0), (p) => p.tours.length);
  if (endurant && classement.length > 1) badges.push({ cle: 'endurant', titre: 'Le plus endurant', texte: nb(endurant.tours.length, 'tour'), pilote: endurant });

  // les badges, c'est pour se comparer : seulement à partir de 2 pilotes qui ont roulé
  const ontRoule = classement.filter((p) => p.tours.length > 0).length;
  return { piste, nbS, pilotes, classement, tours, bestS, bestTour, bestTourPilote, detenteurs, badges: ontRoule > 1 ? badges : [] };
}

// ===========================================================================
// 1. Mes sessions
// ===========================================================================
async function ecranListe(zone, estValide) {
  const { data, error } = await ctx.supabase.rpc('mes_sessions');
  if (!estValide()) return;
  if (error) {
    zone.innerHTML = `${lienRetour('#entrainement', 'Entraînement')}${vide('Impossible de charger tes sessions.', messageErreur(error))}`;
    return;
  }
  const invitations = data.filter((s) => s.invite);
  const enCours = data.filter((s) => !s.invite && !s.terminee);
  const finies = data.filter((s) => !s.invite && s.terminee);

  const carte = (s, k) => `<a class="s-carte ${s.terminee ? 'finie' : ''}" href="#entrainement/session/${s.id}" style="--k:${k}">
      <span class="s-carte-haut">
        <strong>${esc(nomSession(s))}</strong>
        ${s.terminee ? '<span class="badge-statut statut-terminee">Terminée</span>'
          : s.jour === O.isoAujourdHui() ? '<span class="badge-statut statut-direct">En direct</span>'
            : '<span class="badge-statut statut-avenir">Ouverte</span>'}
      </span>
      <span class="s-carte-info">${esc(s.piste_nom)} · ${esc(dateCourte(s.jour))}</span>
      <span class="s-carte-chiffres">
        <span>${ICONES.amis}${nb(s.nb_membres, 'pilote')}</span>
        <span>${ICONES_S.chrono}${nb(s.nb_tours, 'tour')}</span>
        ${s.meilleur != null ? `<span class="or">${ICONES.coupe}${temps(s.meilleur)} <small>${esc(prenom(s.meilleur_nom))}</small></span>` : ''}
      </span>
    </a>`;

  zone.innerHTML = `${lienRetour('#entrainement', 'Entraînement')}
    <h1 class="titre-ecran or-brillant">Sessions de groupe</h1>
    <p class="sous-titre">Roulez ensemble et comparez vos chronos en direct, secteur par secteur.</p>

    <a class="bouton bouton-or bouton-principal" href="#entrainement/session/nouvelle">${ICONES_S.plus} Créer une session</a>

    <form class="s-code" data-code novalidate>
      <label for="s-code">Tu as un code ?</label>
      <div class="s-code-ligne">
        <input type="text" id="s-code" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="10" placeholder="Ex. 7F3A9C21B0">
        <button type="submit" class="bouton bouton-secondaire">Rejoindre</button>
      </div>
    </form>
    <p class="message" role="status" data-message></p>

    ${invitations.length ? `<h2>Invitations</h2><div class="s-liste">${invitations.map((s, k) => `
      <div class="s-carte invitation" style="--k:${k}">
        <span class="s-carte-haut"><strong>${esc(nomSession(s))}</strong><span class="badge-statut statut-direct">Invitation</span></span>
        <span class="s-carte-info">${esc(prenom(s.createur_nom))} t'invite · ${esc(s.piste_nom)} · ${esc(dateCourte(s.jour))}</span>
        <span class="question-boutons">
          <button type="button" class="bouton bouton-secondaire" data-refuser="${s.id}">Refuser</button>
          <button type="button" class="bouton bouton-or bouton-principal" data-accepter="${s.id}">Accepter</button>
        </span>
      </div>`).join('')}</div>` : ''}

    <h2>En cours</h2>
    ${enCours.length ? `<div class="s-liste">${enCours.map(carte).join('')}</div>`
      : vide('Aucune session en cours.', 'Crée une session et invite tes amis, ou demande-leur leur lien.')}

    <a class="carte-lien s-essayer" href="#entrainement/session/exemple">
      <span class="carte-lien-icone">${ICONES_S.eclair}</span>
      <span class="carte-lien-texte"><strong>Voir une session d'exemple</strong><small>4 pilotes imaginaires qui roulent devant toi, en direct</small></span>
      ${ICONES.fleche}
    </a>

    ${finies.length ? `<h2>Historique</h2><div class="s-liste">${finies.map(carte).join('')}</div>` : ''}`;

  // Rejoindre avec un code
  zone.querySelector('[data-code]').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = zone.querySelector('#s-code').value.replace(/\s+/g, '').toUpperCase();
    if (!/^[0-9A-F]{10}$/.test(code)) return dire(zone, 'Le code fait 10 caractères (chiffres et lettres de A à F).');
    location.hash = `entrainement/rejoindre/${code}`;
  });
  // Répondre aux invitations
  const repondre = async (b, id, oui) => {
    b.disabled = true;
    const { error: err } = await ctx.supabase.rpc('repondre_invitation_session', { p_session: id, p_accepter: oui });
    if (err) { b.disabled = false; return dire(zone, messageErreur(err)); }
    window.vibrer?.('fort');
    if (oui) { memoire.nouvelle = id; location.hash = `entrainement/session/${id}`; }
    else ecranListe(zone, estValide);
  };
  zone.querySelectorAll('[data-accepter]').forEach((b) => b.addEventListener('click', () => repondre(b, b.dataset.accepter, true)));
  zone.querySelectorAll('[data-refuser]').forEach((b) => b.addEventListener('click', () => repondre(b, b.dataset.refuser, false)));
}

// ===========================================================================
// 2. Créer une session
// ===========================================================================
async function ecranNouvelle(zone, estValide) {
  let lesPistes;
  let amis = [];
  try {
    const [p, a] = await Promise.all([O.pistes(), ctx.supabase.rpc('mes_amis')]);
    lesPistes = [...p.values()];
    amis = (a.data || []).filter((x) => x.statut === 'ami');
  } catch (err) {
    if (estValide()) zone.innerHTML = `${lienRetour('#entrainement/sessions', 'Sessions')}${vide('Impossible de charger.', messageErreur(err))}`;
    return;
  }
  if (!estValide()) return;
  lesPistes.sort((a, b) => (a.exemple - b.exemple) || a.nom.localeCompare(b.nom));
  if (!lesPistes.length) {
    zone.innerHTML = `${lienRetour('#entrainement/sessions', 'Sessions')}<h1 class="titre-ecran">Nouvelle session</h1>${vide('Pas encore de piste.', 'Les pistes arriveront avec les premiers temps importés.')}`;
    return;
  }
  const piste = lesPistes.find((p) => p.id === memoire.piste) || lesPistes[0];
  const aujourdHui = O.isoAujourdHui();

  zone.innerHTML = `${lienRetour('#entrainement/sessions', 'Sessions')}
    <h1 class="titre-ecran">Nouvelle session</h1>
    <p class="sous-titre">Choisis la piste et le jour, puis invite ta bande.</p>
    <form data-nouvelle novalidate>
      <div class="champ">
        <label for="s-nom-session">Nom de la session <span class="doux">(facultatif)</span></label>
        <input type="text" id="s-nom-session" maxlength="60" placeholder="Ex. Mardi soir entre potes" autocomplete="off">
      </div>
      <div class="champ">
        <span class="champ-titre">Piste</span>
        ${puces('Piste', lesPistes.map((p) => [p.id, p.nom]), piste.id, 'puces-defile s-puces-piste')}
        <div data-apercu-piste></div>
      </div>
      <div class="champ">
        <label for="s-jour">Jour</label>
        <input type="date" id="s-jour" value="${aujourdHui}">
      </div>
      <div class="champ">
        <span class="champ-titre">Inviter des amis</span>
        ${amis.length ? `<ul class="s-choix-amis">${amis.map((a, k) => `
          <li style="--k:${k}"><label class="s-ami touchable">
            <input type="checkbox" value="${esc(a.id)}">
            <span class="plaque-petite">${esc(a.plaque || '?')}</span>
            <span class="ami-texte"><strong>${esc(a.nom || 'Pilote')}</strong><small>${esc(a.club || 'Pilote')}</small></span>
            <span class="s-coche" aria-hidden="true"></span>
          </label></li>`).join('')}</ul>`
          : '<p class="note">Tu n\'as pas encore d\'amis dans l\'appli. Pas grave : juste après, tu pourras <strong>envoyer un lien</strong> à qui tu veux.</p>'}
      </div>
      <p class="message" role="status" data-message></p>
      <button type="submit" class="bouton bouton-or bouton-principal">${ICONES_S.drapeau} Créer la session</button>
    </form>`;

  const apercu = zone.querySelector('[data-apercu-piste]');
  let choisie = piste;
  const montrerPiste = () => {
    apercu.innerHTML = O.svgTrace(choisie, { classe: 'trace-mini' });
    O.preparerTrace(apercu.querySelector('[data-trace]'), choisie);
  };
  surChoix(zone.querySelector('.s-puces-piste'), (v) => { choisie = lesPistes.find((p) => p.id === v); memoire.piste = v; montrerPiste(); });
  montrerPiste();

  zone.querySelector('[data-nouvelle]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bouton = e.submitter || zone.querySelector('[data-nouvelle] button[type="submit"]');
    const jour = zone.querySelector('#s-jour').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return dire(zone, 'Choisis un jour.');
    const invites = [...zone.querySelectorAll('.s-choix-amis input:checked')].map((c) => c.value);
    bouton.disabled = true;
    const { data, error } = await ctx.supabase.rpc('creer_session', {
      p_piste: choisie.id, p_jour: jour, p_nom: zone.querySelector('#s-nom-session').value, p_invites: invites,
    });
    bouton.disabled = false;
    if (error) return dire(zone, messageErreur(error));
    window.vibrer?.('fort');
    memoire.nouvelle = data;
    // on remplace l'écran « créer » : le bouton Retour de la session ramène à la liste
    history.replaceState(null, '', `${location.pathname}#entrainement/sessions`);
    location.hash = `entrainement/session/${data}`;
  });
}

// ===========================================================================
// 3. Rejoindre avec un lien
// ===========================================================================
async function ecranRejoindre(zone, code, estValide) {
  const propre = String(code).replace(/\s+/g, '').toUpperCase();
  const { data, error } = /^[0-9A-F]{10}$/.test(propre)
    ? await ctx.supabase.rpc('apercu_session', { p_code: propre })
    : { data: [], error: null };
  if (!estValide()) return;
  const s = data?.[0];
  if (error || !s) {
    zone.innerHTML = `${lienRetour('#entrainement/sessions', 'Sessions')}
      <h1 class="titre-ecran">Rejoindre</h1>
      ${vide('Ce lien ne marche pas.', error ? messageErreur(error) : 'La session a peut-être été supprimée. Demande un nouveau lien.')}`;
    return;
  }
  if (s.deja_membre) {
    history.replaceState(null, '', `${location.pathname}#entrainement/session/${s.id}`);
    return ecranSession(zone, s.id, estValide);
  }
  zone.innerHTML = `${lienRetour('#entrainement/sessions', 'Sessions')}
    <div class="s-invite-carte marbre-bordeaux cadre-or">
      <p class="s-invite-sur">${esc(prenom(s.createur_nom))} t'invite à rouler !</p>
      <h1 class="s-titre">${esc(s.nom || 'Session de groupe')}</h1>
      <p class="s-invite-info">${ICONES.lieu}${esc(s.piste_nom)}</p>
      <p class="s-invite-info">${ICONES_S.chrono}${esc(dateLongue(s.jour))}</p>
      <p class="s-invite-info">${ICONES.amis}${nb(s.nb_membres, 'pilote')} déjà dedans</p>
    </div>
    <p class="message" role="status" data-message></p>
    ${s.terminee ? vide('Cette session est terminée.', 'Demande à ton ami de créer une nouvelle session.')
      : `<button type="button" class="bouton bouton-or bouton-principal" data-rejoindre>${ICONES_S.drapeau} Rejoindre la session</button>
         <p class="astuce s-centre">Tout le groupe verra tes temps sur cette piste ce jour-là, et toi les leurs.</p>`}`;
  zone.querySelector('[data-rejoindre]')?.addEventListener('click', async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    const { data: id, error: err } = await ctx.supabase.rpc('rejoindre_session', { p_code: propre });
    b.disabled = false;
    if (err) return dire(zone, messageErreur(err));
    window.vibrer?.('fort');
    memoire.nouvelle = id;
    history.replaceState(null, '', `${location.pathname}#entrainement/sessions`);
    location.hash = `entrainement/session/${id}`;
  });
}

// ===========================================================================
// 4. La session (Direct / Secteurs / Historique)
// ===========================================================================

// --- Session d'exemple : des pilotes imaginaires qui roulent tout seuls ---
function moteurDemo(piste, profil) {
  const membres = [
    { id: 'moi', nom: profil?.nom || 'Toi', plaque: profil?.plaque || '', couleur: 0, est_moi: true, est_createur: true },
    { id: 'max', nom: 'Max (exemple)', plaque: '12', couleur: 1 },
    { id: 'lina', nom: 'Lina (exemple)', plaque: '5', couleur: 4 },
    { id: 'tom', nom: 'Tom (exemple)', plaque: '88', couleur: 2 },
  ];
  const rythme = { moi: 35.3, max: 34.9, lina: 35.6, tom: 36.2 };
  const pos = (piste.lignes || []).slice(1).map((l) => Number(l.pos));
  const d = {
    session: { id: 'exemple', nom: 'Session d\'exemple', jour: O.isoAujourdHui(), code: null, terminee: false, est_createur: true, piste, exemple: true },
    membres,
    tours: [],
  };
  const TOURS = 6;
  let horloge = Date.now();
  function unTour() {
    const compte = (id) => d.tours.filter((t) => t.pilote === id).length;
    const restants = membres.filter((m) => compte(m.id) < TOURS);
    if (!restants.length) return false;
    const moins = Math.min(...restants.map((m) => compte(m.id)));
    const choix = restants.filter((m) => compte(m.id) === moins);
    const m = choix[Math.floor(Math.random() * choix.length)];
    rythme[m.id] *= 0.996 + Math.random() * 0.004;               // chacun progresse un peu
    const total = rythme[m.id] * (1 + (Math.random() - 0.5) * 0.025);
    let cumul = 0;
    let t = pos.map((p, i) => {
      cumul += total * (p - (pos[i - 1] || 0)) * (1 + (Math.random() - 0.5) * 0.07);
      return Math.round(cumul * 1000) / 1000;
    });
    if (Math.random() < 0.06 && t.length > 1) {
      const c = 1 + Math.floor(Math.random() * (t.length - 1));
      t = t.map((v, i) => (i < c ? v : null));
    }
    horloge += 40000;
    d.tours.push({ id: `ex-${d.tours.length}`, pilote: m.id, numero: compte(m.id) + 1, temps: t, temps_final: t[t.length - 1], exemple: true, heure: new Date(horloge).toISOString() });
    return true;
  }
  return { d, unTour, finir() { d.session.terminee = true; } };
}

async function ecranSession(zone, id, estValide) {
  const exemple = id === 'exemple';
  const st = {
    id, exemple, vue: memoire.vue, filtre: 'tous', vus: new Set(), d: null, a: null, demo: null, amis: null,
  };

  // --- charger ---
  async function charger() {
    if (exemple) return st.demo.d;
    const { data, error } = await ctx.supabase.rpc('session_detail', { p_session: id });
    if (error) throw error;
    return data;
  }
  try {
    if (exemple) {
      const p = await O.pistes();
      const piste = [...p.values()].find((x) => x.exemple) || [...p.values()][0];
      if (!piste) throw new Error('Pas encore de piste.');
      st.demo = moteurDemo(piste, ctx.profil);
    }
    st.d = await charger();
  } catch (err) {
    if (estValide()) {
      zone.innerHTML = `${lienRetour('#entrainement/sessions', 'Sessions')}${vide('Impossible d\'ouvrir cette session.', messageErreur(err))}`;
    }
    return;
  }
  if (!estValide()) return;
  st.a = analyser(st.d);
  st.d.tours.forEach((t) => st.vus.add(t.id));

  const s = st.d.session;
  const enDirect = !s.terminee && s.jour === O.isoAujourdHui();
  zone.innerHTML = `${lienRetour('#entrainement/sessions', 'Sessions')}
    <section class="s-hero marbre-bordeaux cadre-or">
      <div class="s-hero-haut">
        <span data-statut></span>
        <span class="s-hero-date">${esc(dateLongue(s.jour))}</span>
      </div>
      <h1 class="s-titre">${esc(nomSession(s))}</h1>
      <p class="s-hero-piste">${ICONES.lieu}${esc(s.piste.nom)}</p>
      <div class="s-avatars" data-avatars></div>
      <div class="s-hero-chiffres" data-chiffres></div>
    </section>

    ${exemple ? '<p class="note">Session d\'exemple : Max, Lina et Tom sont imaginaires. Un tour arrive toutes les 2 secondes.</p>' : ''}
    <div data-inviter-zone></div>

    ${segments('Vue', [['direct', `${ICONES_S.chrono}<span>Direct</span>`], ['secteurs', `${ICONES_S.couronne}<span>Secteurs</span>`], ['historique', `${ICONES_S.drapeau}<span>Historique</span>`]], st.vue)}
    <div class="s-legende" aria-label="Couleurs des temps">
      <span><i class="f1-violet"></i>Meilleur du groupe</span>
      <span><i class="f1-vert"></i>Il s'améliore</span>
      <span><i class="f1-rouge"></i>Moins bien que son meilleur</span>
    </div>
    <div class="s-vue" data-vue></div>
    <p class="message" role="status" data-message></p>
    <div class="s-pied" data-pied></div>`;

  const vueEl = zone.querySelector('[data-vue]');

  // ---------- En-tête ----------
  function majEntete() {
    const a = st.a;
    const ss = st.d.session;
    const direct = !ss.terminee && ss.jour === O.isoAujourdHui();
    zone.querySelector('[data-statut]').innerHTML = ss.terminee ? '<span class="badge-statut statut-terminee">Terminée</span>'
      : direct ? '<span class="badge-statut statut-direct">En direct</span>' : '<span class="badge-statut statut-avenir">Ouverte</span>';
    const membres = st.d.membres;
    zone.querySelector('[data-avatars]').innerHTML = membres.map((m) =>
      `<span class="s-avatar ${m.invite ? 'invite' : ''}" title="${esc(m.nom || '')}${m.invite ? ' (invité)' : ''}">${plaque(m)}<small>${esc(nomCourt(m))}</small></span>`).join('');
    const leader = a.bestTourPilote ? a.pilotes.get(a.bestTourPilote) : null;
    zone.querySelector('[data-chiffres]').innerHTML = `
      <div><strong>${a.pilotes.size}</strong><span>${a.pilotes.size > 1 ? 'pilotes' : 'pilote'}</span></div>
      <div><strong>${a.tours.length}</strong><span>${a.tours.length > 1 ? 'tours' : 'tour'}</span></div>
      <div class="or"><strong>${temps(a.bestTour)}</strong><span>${leader ? `meilleur · ${esc(nomCourt(leader))}` : 'meilleur tour'}</span></div>`;
  }

  // ---------- Inviter / partager ----------
  function majInviter() {
    const boite = zone.querySelector('[data-inviter-zone]');
    if (exemple || st.d.session.terminee) { boite.innerHTML = ''; return; }
    boite.innerHTML = `<div class="s-boutons-haut">
        <button type="button" class="bouton bouton-secondaire" data-partager>${ICONES_S.partager} Envoyer le lien</button>
        <button type="button" class="bouton bouton-secondaire" data-ouvrir-inviter aria-expanded="false">${ICONES.amis} Inviter des amis</button>
      </div>
      <div class="s-inviter" data-inviter hidden></div>`;
    boite.querySelector('[data-partager]').addEventListener('click', partager);
    boite.querySelector('[data-ouvrir-inviter]').addEventListener('click', (e) => basculerInviter(e.currentTarget));
  }
  async function partager() {
    const code = st.d.session.code;
    const url = lienInvitation(code);
    const texte = `Viens rouler avec moi sur ${st.d.session.piste.nom} ! On compare nos chronos secteur par secteur sur DBSpeed.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Session DBSpeed', text: texte, url });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;   // la personne a fermé le menu de partage
    }
    try {
      await navigator.clipboard.writeText(url);
      dire(zone, `Lien copié ! Colle-le dans un message à tes amis. (Code : ${code})`, 'ok');
    } catch {
      dire(zone, `Envoie ce lien à tes amis : ${url}`, 'ok');
    }
  }
  async function basculerInviter(bouton) {
    const panneau = zone.querySelector('[data-inviter]');
    const ouvrir = panneau.hidden;
    bouton.setAttribute('aria-expanded', ouvrir);
    if (ouvrir) {
      panneau.innerHTML = '<p class="chargement">Chargement…</p>';
      window.montrer ? window.montrer(panneau, true) : (panneau.hidden = false);
      const { data, error } = await ctx.supabase.rpc('mes_amis');
      if (error) { panneau.innerHTML = vide('Impossible de charger tes amis.', messageErreur(error)); return; }
      const dedans = new Set(st.d.membres.map((m) => m.id));
      const libres = data.filter((a) => a.statut === 'ami' && !dedans.has(a.id));
      panneau.innerHTML = `
        <p class="s-code-gros">Code de la session : <strong>${esc(st.d.session.code)}</strong></p>
        ${libres.length ? `<ul class="amis-liste">${libres.map((a, k) => `<li class="ami" style="--k:${k}">
            <span class="plaque-petite">${esc(a.plaque || '?')}</span>
            <span class="ami-texte"><strong>${esc(a.nom || 'Pilote')}</strong><small>${esc(a.club || 'Pilote')}</small></span>
            <span class="ami-actions"><button type="button" class="oui" data-inviter-ami="${esc(a.id)}">Inviter</button></span>
          </li>`).join('')}</ul>`
          : `<p class="astuce">${data.some((a) => a.statut === 'ami') ? 'Tous tes amis sont déjà dans la session.' : 'Tu n\'as pas encore d\'amis dans l\'appli (ajoute-les dans Mon profil). Tu peux aussi envoyer le lien.'}</p>`}`;
      panneau.querySelectorAll('[data-inviter-ami]').forEach((b) => b.addEventListener('click', async () => {
        b.disabled = true;
        const { error: err } = await ctx.supabase.rpc('inviter_session', { p_session: id, p_pilotes: [b.dataset.inviterAmi] });
        if (err) { b.disabled = false; return dire(zone, messageErreur(err)); }
        window.vibrer?.('fort');
        b.textContent = 'Invité ✓';
        b.classList.remove('oui');
        await rafraichir();
      }));
    } else {
      window.montrer ? window.montrer(panneau, false) : (panneau.hidden = true);
    }
  }

  // ---------- Les 3 vues ----------
  function dessinerVue(changement = false) {
    // place de chaque ligne du classement avant le changement (pour les faire glisser à leur nouvelle place)
    const avant = new Map();
    vueEl.querySelectorAll('[data-rang-pilote]').forEach((el) => avant.set(el.dataset.rangPilote, el.getBoundingClientRect().top));
    if (st.vue === 'secteurs') vueSecteurs();
    else if (st.vue === 'historique') vueHistorique();
    else vueDirect();
    if (changement && !calme()) {
      vueEl.querySelectorAll('[data-rang-pilote]').forEach((el) => {
        const haut = avant.get(el.dataset.rangPilote);
        if (haut == null) return;
        const dy = haut - el.getBoundingClientRect().top;
        if (Math.abs(dy) < 1) return;
        el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
        if (dy > 0) el.classList.add('monte');
      });
    }
  }

  function chipsSecteurs(t, { petit = false } = {}) {
    return `<span class="f1-secteurs ${petit ? 'petit' : ''}">${t.s.map((v, i) =>
      `<span class="f1 f1-${t.couleurs[i] || 'vide'}" title="Secteur ${i + 1}"><small>S${i + 1}</small>${v == null ? '—' : v.toFixed(petit ? 2 : 3)}</span>`).join('')}</span>`;
  }

  function vueDirect() {
    const a = st.a;
    const fini = st.d.session.terminee;
    let html = '';
    if (fini && a.classement.some((p) => p.meilleur != null)) html += podium(a);
    if (!a.tours.length) {
      html += vide('Pas encore de tour.', exemple ? 'Les pilotes s\'élancent…'
        : 'Les tours de chaque pilote arrivent ici dès qu\'ils sont enregistrés (transpondeur ou fichier). En attendant, tu peux simuler tes tours en bas.');
    }
    html += `<ol class="s-tour-de-controle">${a.classement.map((p) => {
      const d = p.dernier;
      return `<li class="s-ligne ${p.est_moi ? 'moi' : ''}" data-rang-pilote="${esc(p.id)}" data-filtrer="${esc(p.id)}" style="--c:var(--p${p.couleur})" tabindex="0" role="button" aria-label="Voir les tours de ${esc(p.nom || 'ce pilote')}">
        <span class="s-pos ${p.position === 1 ? 'p1' : ''}">${p.position ?? '–'}</span>
        ${plaque(p)}
        <span class="s-pilote-nom"><strong>${esc(nomCourt(p))}</strong><small>${nb(p.tours.length, 'tour')}${p.chutes ? ` · ${nb(p.chutes, 'chute')}` : ''}${p.violets ? ` · <b class="txt-violet">${p.violets} violet${p.violets > 1 ? 's' : ''}</b>` : ''}</small></span>
        <span class="s-chrono"><strong class="${p.meilleur != null && p.meilleur === a.bestTour ? 'txt-violet' : ''}">${temps(p.meilleur)}</strong><small>${p.position === 1 ? 'en tête' : p.ecart == null ? '' : `+${p.ecart.toFixed(3)}`}</small></span>
        ${d ? `<span class="s-dernier"><span class="s-dernier-titre">Dernier tour <b class="txt-${d.couleurFinale || 'rouge'}">${d.temps_final != null ? temps(d.temps_final) : 'chute'}</b></span>${chipsSecteurs(d, { petit: true })}</span>`
          : '<span class="s-dernier vide-dernier">Pas encore roulé</span>'}
      </li>`;
    }).join('')}</ol>`;
    const invites = st.d.membres.filter((m) => m.invite);
    if (invites.length) html += `<p class="astuce">En attente : ${invites.map((m) => esc(prenom(m.nom))).join(', ')} (invité${invites.length > 1 ? 's' : ''}).</p>`;
    vueEl.innerHTML = html;
    vueEl.querySelectorAll('[data-filtrer]').forEach((el) => {
      const ouvrir = () => { st.filtre = el.dataset.filtrer; choisirVue('historique'); };
      el.addEventListener('click', ouvrir);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } });
    });
    if (fini && !memoire.podiumVu.has(st.id) && a.classement.some((p) => p.meilleur != null)) {
      memoire.podiumVu.add(st.id);
      setTimeout(() => confettis(60), 450);
    }
  }

  function podium(a) {
    const top = a.classement.filter((p) => p.meilleur != null).slice(0, 3);
    const ordre = [top[1], top[0], top[2]];   // 2e à gauche, 1er au milieu, 3e à droite
    return `<section class="s-podium" aria-label="Podium">
      <h2 class="or-brillant">Podium</h2>
      <div class="s-marches">${ordre.map((p, k) => (p ? `<div class="s-marche m${p.position}" style="--c:var(--p${p.couleur}); --k:${k}">
          ${plaque(p, 'grande')}
          <strong>${esc(nomCourt(p))}</strong>
          <span class="s-marche-temps">${temps(p.meilleur)}</span>
          <span class="s-marche-bloc"><b>${p.position}</b></span>
        </div>` : '<div class="s-marche vide"></div>')).join('')}</div>
      ${a.badges.length ? `<div class="s-badges">${a.badges.map((b, k) => `<div class="s-badge b-${b.cle}" style="--c:var(--p${b.pilote.couleur}); --k:${k}">
          <span class="s-badge-icone" aria-hidden="true">${b.cle === 'roi' ? ICONES_S.couronne : b.cle === 'progres' ? ICONES_S.eclair : b.cle === 'regulier' ? ICONES_S.chrono : ICONES_S.drapeau}</span>
          <span><strong>${esc(b.titre)}</strong><small>${esc(nomCourt(b.pilote))} · ${esc(b.texte)}</small></span>
        </div>`).join('')}</div>` : ''}
    </section>`;
  }

  function vueSecteurs() {
    const a = st.a;
    const noms = ['Départ', ...nomsLignes(a.piste, a.nbS)];
    const moi = [...a.pilotes.values()].find((p) => p.est_moi);
    let html = `<div class="piste-carte marbre-bordeaux cadre-or s-carte-territoires">
        <p class="s-mini-titre">Qui domine chaque secteur</p>
        ${O.svgTrace(a.piste, { classe: 's-trace-territoires' })}
        <div class="s-territoires-legende">${a.detenteurs.map((pid, i) => {
          const p = pid ? a.pilotes.get(pid) : null;
          return `<span style="--c:${p ? `var(--p${p.couleur})` : 'var(--texte-pale)'}"><i></i>S${i + 1} ${p ? esc(nomCourt(p)) : '—'}</span>`;
        }).join('')}</div>
      </div>`;

    html += a.bestS.map((best, i) => {
      const lignes = [...a.pilotes.values()]
        .filter((p) => p.meilleursS[i] != null)
        .sort((x, y) => x.meilleursS[i] - y.meilleursS[i]);
      const pire = lignes.length ? lignes[lignes.length - 1].meilleursS[i] : 0;
      return `<section class="s-secteur" style="--k:${i}">
        <header><span class="s-secteur-nom">S${i + 1}</span><span class="s-secteur-de">${esc(noms[i])} → ${esc(noms[i + 1])}</span></header>
        ${lignes.length ? `<ol>${lignes.map((p, k) => {
          const ecart = p.meilleursS[i] - best;
          const largeur = pire > best ? 100 - 70 * ((p.meilleursS[i] - best) / (pire - best)) : 100;
          return `<li class="${k === 0 ? 'devant' : ''}" style="--c:var(--p${p.couleur})">
            <span class="s-secteur-place">${k === 0 ? ICONES_S.couronne : k + 1}</span>
            <span class="s-secteur-pilote">${esc(nomCourt(p))}</span>
            <span class="s-secteur-barre"><i style="width:${largeur.toFixed(1)}%"></i></span>
            <span class="s-secteur-temps ${k === 0 ? 'txt-violet' : ''}">${p.meilleursS[i].toFixed(3)}<small>${k === 0 ? '' : `+${ecart.toFixed(3)}`}</small></span>
          </li>`;
        }).join('')}</ol>` : '<p class="astuce">Personne n\'a encore passé ce secteur.</p>'}
      </section>`;
    }).join('');

    // tour idéal : la somme de ses meilleurs secteurs
    const ideaux = [...a.pilotes.values()].filter((p) => p.ideal != null && p.meilleur != null);
    if (ideaux.length) {
      html += `<h2>Tour idéal</h2>
        <p class="astuce">Si tu enchaînais tes meilleurs secteurs dans le même tour.</p>
        ${moi?.ideal != null && moi.meilleur != null && moi.meilleur - moi.ideal > 0.0005
          ? `<p class="s-ideal-moi">Tu peux encore gagner <strong>${(moi.meilleur - moi.ideal).toFixed(3)} s</strong> !</p>` : ''}
        <div class="tableau-defile"><table class="t compacte">
          <thead><tr><th>Pilote</th><th class="cel-num">Meilleur</th><th class="cel-num">Idéal</th><th class="cel-num">À gagner</th></tr></thead>
          <tbody>${ideaux.sort((x, y) => x.ideal - y.ideal).map((p) => `<tr class="${p.est_moi ? 'passe' : ''}">
            <th scope="row"><span class="s-point" style="--c:var(--p${p.couleur})"></span>${esc(nomCourt(p))}</th>
            <td class="cel-num">${temps(p.meilleur)}</td>
            <td class="cel-num"><strong>${temps(p.ideal)}</strong></td>
            <td class="cel-num doux">${(p.meilleur - p.ideal).toFixed(3)}</td>
          </tr>`).join('')}</tbody>
        </table></div>`;
    }
    vueEl.innerHTML = html;

    // les secteurs du tracé prennent la couleur du pilote qui les domine
    const fig = vueEl.querySelector('[data-trace]');
    O.preparerTrace(fig, a.piste);
    const svg = fig.querySelector('svg');
    const d = svg.querySelector('.t-terre').getAttribute('d');
    const chemin = svg.querySelector('.t-terre');
    const ns = 'http://www.w3.org/2000/svg';
    const groupe = svg.querySelector('.t-secteurs');
    a.detenteurs.forEach((pid, i) => {
      const debut = fig._lignes[i];
      const fin = fig._lignes[i + 1];
      if (debut == null || fin == null) return;
      const p = pid ? a.pilotes.get(pid) : null;
      const c = document.createElementNS(ns, 'path');
      c.setAttribute('d', d);
      c.setAttribute('class', `s-territoire ${p ? '' : 'libre'}`);
      if (p) c.style.stroke = `var(--p${p.couleur})`;
      c.style.strokeDasharray = `0 ${debut} ${Math.max(0, fin - debut - 3)} ${fig._L}`;
      c.style.setProperty('--i', i);
      groupe.append(c);
      // étiquette S1, S2… au milieu du secteur
      const m = chemin.getPointAtLength((debut + fin) / 2);
      // le groupe extérieur place l'étiquette, l'intérieur s'anime (sinon l'animation écraserait la position)
      const place = document.createElementNS(ns, 'g');
      place.setAttribute('transform', `translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})`);
      const g = document.createElementNS(ns, 'g');
      g.setAttribute('class', 's-territoire-etiquette');
      g.style.setProperty('--i', i);
      const rond = document.createElementNS(ns, 'circle');
      rond.setAttribute('r', '10');
      rond.style.fill = p ? `var(--p${p.couleur})` : 'var(--carte-2)';
      const texte = document.createElementNS(ns, 'text');
      texte.setAttribute('text-anchor', 'middle');
      texte.setAttribute('dy', '3.5');
      texte.textContent = `S${i + 1}`;
      g.append(rond, texte);
      place.append(g);
      svg.append(place);
    });
  }

  function vueHistorique() {
    const a = st.a;
    const pil = [...a.pilotes.values()];
    if (st.filtre !== 'tous' && !a.pilotes.has(st.filtre)) st.filtre = 'tous';
    const liste = a.tours.filter((t) => st.filtre === 'tous' || t.pilote === st.filtre).slice().reverse();
    vueEl.innerHTML = `
      ${puces('Pilote', [['tous', 'Tous'], ...pil.map((p) => [p.id, nomCourt(p)])], st.filtre, 'puces-defile s-puces-filtre')}
      ${liste.length ? `<ol class="s-fil">${liste.map((t, k) => {
        const p = a.pilotes.get(t.pilote);
        const lienPerso = p.est_moi && !exemple;
        return `<li class="s-fil-tour ${st.nouveaux?.has(t.id) ? 'nouveau' : ''}" style="--c:var(--p${p.couleur}); --k:${Math.min(k, 12)}">
          ${plaque(p)}
          <span class="s-fil-corps">
            <span class="s-fil-haut">
              <span><strong>${esc(nomCourt(p))}</strong> · Tour ${t.rang}${t.exemple && !exemple ? ' <span class="s-ex">exemple</span>' : ''}</span>
              <span class="s-fil-heure">${heureCourte(t.heure)}</span>
            </span>
            <span class="s-fil-temps txt-${t.couleurFinale || 'rouge'}">${t.temps_final != null ? temps(t.temps_final)
              : `<span class="chute">Chute</span> <small>${esc(O.arretApres(a.piste, t.temps))}</small>`}
              ${t.couleurFinale === 'violet' ? '<span class="s-etiquette-violet">Meilleur tour</span>' : t.couleurFinale === 'vert' ? '<span class="s-etiquette-vert">Record perso</span>' : ''}</span>
            ${chipsSecteurs(t)}
            ${lienPerso ? `<a class="lien-fleche" href="#entrainement/tour/${t.id}">Tous les intermédiaires ${ICONES.fleche}</a>` : ''}
          </span>
        </li>`;
      }).join('')}</ol>` : vide('Pas encore de tour.', 'Les tours apparaîtront ici, du plus récent au plus ancien.')}`;
    surChoix(vueEl.querySelector('.s-puces-filtre'), (v) => { st.filtre = v; vueHistorique(); });
  }

  function choisirVue(v) {
    st.vue = v;
    memoire.vue = v;
    zone.querySelectorAll('.s-segments button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.valeur === v));
    dessinerVue();
    if (!calme()) vueEl.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  surChoix(zone.querySelector('.s-segments'), choisirVue);

  // ---------- Pied : simuler, terminer, quitter ----------
  function majPied() {
    const pied = zone.querySelector('[data-pied]');
    const ss = st.d.session;
    if (exemple) {
      pied.innerHTML = `<button type="button" class="bouton bouton-secondaire" data-rejouer-demo>${ICONES.rejouer} Recommencer l'exemple</button>`;
      pied.querySelector('[data-rejouer-demo]').addEventListener('click', () => {
        arreterSession();
        ecranSession(zone, 'exemple', estValide);
      });
      return;
    }
    pied.innerHTML = `
      ${ss.terminee ? '' : `<button type="button" class="bouton bouton-secondaire" data-simuler>${ICONES_S.eclair} Simuler 3 tours pour moi</button>
        <p class="astuce s-centre">En attendant les transpondeurs : des temps d'exemple, rien que pour toi (jamais publiés). Chaque ami peut le faire sur son téléphone.</p>`}
      ${ss.est_createur
        ? `<button type="button" class="bouton ${ss.terminee ? 'bouton-secondaire' : 'bouton-or bouton-principal'}" data-terminer>${ss.terminee ? 'Rouvrir la session' : `${ICONES_S.drapeau} Terminer et voir le podium`}</button>
           <button type="button" class="lien-simple lien-danger" data-supprimer>${ICONES.poubelle} Supprimer la session</button>`
        : `<button type="button" class="lien-simple lien-danger" data-quitter>${ICONES_S.sortie} Quitter la session</button>`}`;
    pied.querySelector('[data-simuler]')?.addEventListener('click', async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      const { error } = await ctx.supabase.rpc('ajouter_tours_exemple_session', { p_session: id, p_nb: 3 });
      b.disabled = false;
      if (error) return dire(zone, messageErreur(error));
      dire(zone, '');
      await rafraichir();
    });
    pied.querySelector('[data-terminer]')?.addEventListener('click', async (e) => {
      const b = e.currentTarget;
      const terminer = !ss.terminee;
      if (terminer) {
        const ok = await demander(b, { texte: 'Terminer la session ? Le podium s\'affiche pour tout le groupe et plus personne ne peut la rejoindre.', oui: 'Terminer' });
        if (!ok) return;
      }
      b.disabled = true;
      const { error } = await ctx.supabase.rpc('terminer_session', { p_session: id, p_terminee: terminer });
      b.disabled = false;
      if (error) return dire(zone, messageErreur(error));
      window.vibrer?.('fort');
      if (terminer) { st.vue = 'direct'; memoire.vue = 'direct'; zone.querySelectorAll('.s-segments button').forEach((x) => x.setAttribute('aria-pressed', x.dataset.valeur === 'direct')); window.scrollTo({ top: 0, behavior: calme() ? 'auto' : 'smooth' }); }
      await rafraichir(true);
    });
    pied.querySelector('[data-supprimer]')?.addEventListener('click', async (e) => {
      const ok = await demander(e.currentTarget, { texte: 'Supprimer la session pour tout le groupe ? Les tours de chacun restent dans son calendrier.', oui: 'Supprimer', classeOui: 'bouton-danger' });
      if (!ok) return;
      const { error } = await ctx.supabase.rpc('supprimer_session', { p_session: id });
      if (error) return dire(zone, messageErreur(error));
      window.vibrer?.('fort');
      location.hash = 'entrainement/sessions';
    });
    pied.querySelector('[data-quitter]')?.addEventListener('click', async (e) => {
      const ok = await demander(e.currentTarget, { texte: 'Quitter la session ? Le groupe ne verra plus tes temps ici.', oui: 'Quitter', classeOui: 'bouton-danger' });
      if (!ok) return;
      const { error } = await ctx.supabase.rpc('quitter_session', { p_session: id });
      if (error) return dire(zone, messageErreur(error));
      window.vibrer?.('fort');
      location.hash = 'entrainement/sessions';
    });
  }

  // ---------- Nouveaux tours : annonces, couleurs, classement qui bouge ----------
  function annoncerNouveaux(nouveaux) {
    const a = st.a;
    const liste = a.tours.filter((t) => nouveaux.has(t.id));
    let violetTour = false;
    for (const t of liste.slice(-2)) {
      const p = a.pilotes.get(t.pilote);
      if (!p) continue;
      const violets = t.couleurs.map((c, i) => (c === 'violet' ? `S${i + 1}` : null)).filter(Boolean);
      const titre = t.couleurFinale === 'violet' ? 'Meilleur tour du groupe !'
        : t.couleurFinale === 'vert' ? 'Record perso !'
          : t.temps_final == null ? 'Chute' : violets.length ? `Meilleur ${violets.join(' + ')} !` : `Tour ${t.rang}`;
      annoncer(`<span class="s-toast-plaque" style="--c:var(--p${p.couleur})">${esc(p.plaque || initiales(p.nom))}</span>
        <span class="s-toast-texte"><strong>${esc(nomCourt(p))} · ${esc(titre)}</strong>
        <span><b class="txt-${t.couleurFinale || 'rouge'}">${t.temps_final != null ? temps(t.temps_final) : '—'}</b> ${t.couleurs.map((c) => `<i class="f1-${c || 'vide'}"></i>`).join('')}</span></span>`,
      t.couleurFinale === 'violet' || violets.length ? 'violet' : '');
      if (t.couleurFinale === 'violet') violetTour = true;
    }
    window.vibrer?.(violetTour ? 'fort' : 'leger');
    if (violetTour) confettis(40);
  }

  async function rafraichir(force = false) {
    let d;
    try {
      d = await charger();
    } catch (err) {
      if (force) dire(zone, messageErreur(err));
      return;
    }
    if (!zone.isConnected || !estValide()) return;
    const nouveaux = new Set(d.tours.filter((t) => !st.vus.has(t.id)).map((t) => t.id));
    const avantMembres = JSON.stringify(st.d.membres.map((m) => [m.id, m.invite]));
    const avantTermine = st.d.session.terminee;
    if (!force && !nouveaux.size && avantMembres === JSON.stringify(d.membres.map((m) => [m.id, m.invite])) && avantTermine === d.session.terminee) return;
    st.d = d;
    st.a = analyser(d);
    d.tours.forEach((t) => st.vus.add(t.id));
    st.nouveaux = nouveaux;
    majEntete();
    if (avantTermine !== d.session.terminee) { majInviter(); majPied(); }
    dessinerVue(true);
    if (nouveaux.size) annoncerNouveaux(nouveaux);
  }

  majEntete();
  majInviter();
  majPied();
  dessinerVue();

  // ---------- Démarrage : feux de départ pour une nouvelle session ----------
  const nouvelle = memoire.nouvelle === id || exemple;
  memoire.nouvelle = null;
  if (nouvelle) feuxDeDepart();
  // tout juste créée et personne d'autre dedans : on ouvre le panneau « inviter »
  if (nouvelle && !exemple && !st.d.session.terminee && st.d.membres.length === 1) {
    setTimeout(() => zone.querySelector('[data-ouvrir-inviter]')?.click(), calme() ? 0 : 1500);
  }

  // ---------- Mise à jour en direct ----------
  if (exemple) {
    let fin = false;
    moteurExemple = setInterval(() => {
      if (!zone.isConnected || document.getElementById('onglet-entrainement')?.hidden) { arreterSession(); return; }
      if (fin) return;
      if (!st.demo.unTour()) {
        fin = true;
        st.demo.finir();
        st.vue = 'direct';
        zone.querySelectorAll('.s-segments button').forEach((x) => x.setAttribute('aria-pressed', x.dataset.valeur === 'direct'));
      }
      rafraichir(true);
    }, calme() ? 1200 : 2000);
    return;
  }
  if (!st.d.session.terminee) {
    minuteur = setInterval(() => {
      if (!zone.isConnected || document.getElementById('onglet-entrainement')?.hidden) { arreterSession(); return; }
      if (document.visibilityState !== 'visible') return;
      rafraichir();
    }, 5000);
    ecouteVisibilite = () => { if (document.visibilityState === 'visible' && zone.isConnected) rafraichir(); };
    document.addEventListener('visibilitychange', ecouteVisibilite);
  }
}
