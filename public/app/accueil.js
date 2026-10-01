// Espace connecté : onglets Accueil, Entraînement, Compétition, Mon profil (en bas de l'écran).
import {
  supabase, configOk, TYPES, CATEGORIES, messageErreur, erreurDansAdresse, typeRetenu,
} from '/app/supabase.js';
import { lancerTuto } from '/app/tuto.js';
import { idValide } from '/app/lieux-osm.js';

// Chaque onglet a son code à part, chargé seulement la première fois qu'on l'ouvre
// (l'appli démarre plus vite : on ne télécharge pas la carte ou les compétitions pour rien).
const modules = {
  manches: () => import('/app/manches/vue.js'),
  competition: () => import('/app/competitions/vue.js'),
  entrainement: () => import('/app/entrainement/vue.js'),
  amis: () => import('/app/entrainement/amis.js'),
  lieux: () => import('/app/lieux.js'),
};
const charges = {};
function module(nom) {
  charges[nom] ||= modules[nom]().catch((err) => {
    delete charges[nom];   // pas de réseau : on réessaiera la prochaine fois
    throw err;
  });
  return charges[nom];
}
function siEchec(err) {
  console.error(err);
  afficher($('message'), "Impossible d'ouvrir cet onglet. Vérifie ta connexion et réessaie.");
}
import {
  prendrePosition, suivrePosition, oublierPosition, positionConnue, retenirChoix,
} from '/app/position.js';

const CONNEXION = '/app/';
const ONGLETS = ['accueil', 'entrainement', 'competition', 'lieux', 'profil'];

const $ = (id) => document.getElementById(id);
let utilisateur = null;
let profil = null;

function afficher(zone, texte, genre = 'erreur') {
  zone.textContent = texte;
  zone.className = `message ${genre}`;
  if (!texte) return;
  window.vibrer?.(genre === 'erreur' ? 'erreur' : 'fort');
}

function prenom(nom) {
  return (nom || '').trim().split(/\s+/)[0] || '';
}

function initiales(nom) {
  const mots = (nom || '').trim().split(/\s+/).filter(Boolean);
  if (!mots.length) return '?';
  return (mots[0][0] + (mots.length > 1 ? mots[mots.length - 1][0] : '')).toUpperCase();
}

async function chargerProfil() {
  const { data, error } = await supabase
    .from('profils')
    .select('id, type_compte, nom, plaque, club, categorie, organisateur_valide, tuto_fini, localisation')
    .eq('id', utilisateur.id)
    .single();
  if (error) throw error;
  profil = data;
}

// ---------- Onglets ----------

// L'adresse après « # » : le nom de l'onglet, puis éventuellement une page à l'intérieur
// (ex. #competition/gp-sarrians-2026/pilote/p12)
function chemin() {
  let brut = window.location.hash.replace(/^#/, '');
  try { brut = decodeURIComponent(brut); } catch { /* adresse bizarre : on garde telle quelle */ }
  return brut.split('/').filter(Boolean);
}

function ongletActuel() {
  const nom = chemin()[0];
  return ONGLETS.includes(nom) ? nom : 'accueil';
}

let ongletPrecedent = null;

function montrerOnglet() {
  const actuel = ongletActuel();
  const parties = chemin();
  // la nouvelle page arrive du côté de l'onglet touché (à droite → elle vient de la droite)
  const sens = ongletPrecedent && ONGLETS.indexOf(actuel) < ONGLETS.indexOf(ongletPrecedent) ? 'glisse-droite' : 'glisse-gauche';
  const change = ongletPrecedent !== actuel;
  ongletPrecedent = actuel;
  // Nettoie l'adresse si elle contient autre chose qu'un nom d'onglet (ex. retour de Google)
  if (parties[0] !== actuel) {
    history.replaceState(null, '', `${window.location.pathname}#${actuel}`);
  }
  for (const nom of ONGLETS) {
    const section = $(`onglet-${nom}`);
    const visible = nom === actuel;
    if (visible && change) {
      // apparition douce de l'onglet, ses blocs l'un après l'autre
      section.classList.remove('glisse-gauche', 'glisse-droite');
      void section.offsetWidth;
      section.classList.add(sens);
    }
    section.hidden = !visible;
  }
  for (const lien of document.querySelectorAll('.onglets a')) {
    if (lien.dataset.onglet === actuel) lien.setAttribute('aria-current', 'page');
    else lien.removeAttribute('aria-current');
  }
  if (actuel === 'accueil') {
    // l'onglet Accueil : mes manches, les courses, une manche, la fiche d'un pilote, importer
    const sousPage = parties.slice(1);
    $('accueil-intro').hidden = sousPage.length > 0;
    module('manches').then((m) => m.afficherManches($('accueil-vue'), sousPage, { supabase, profil })).catch(siEchec);
  } else if (actuel === 'competition') {
    // l'onglet Compétition a ses propres pages (et gère lui-même le défilement)
    module('competition').then((m) => m.afficherCompetition($('competition-vue'), parties[0] === 'competition' ? parties.slice(1) : [])).catch(siEchec);
  } else if (actuel === 'entrainement') {
    // pareil pour l'onglet Entraînement : calendrier, journée, tour, classement
    module('entrainement').then((m) => m.afficherEntrainement($('entrainement-vue'), parties[0] === 'entrainement' ? parties.slice(1) : [], { supabase, profil })).catch(siEchec);
  } else if (actuel === 'lieux') {
    // l'onglet Lieux : la carte (#lieux) ou la fiche d'une piste (#lieux/way-123) ;
    // il remet lui-même la liste à sa place quand on revient d'une fiche
    if (change) window.scrollTo(0, 0);
    const piste = parties[0] === 'lieux' && idValide(parties[1] || '') ? parties[1] : '';
    module('lieux').then((m) => m.afficherLieux(piste)).catch(siEchec);
  } else {
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', montrerOnglet);

// ---------- Remplir les écrans ----------

function remplir() {
  const type = profil.type_compte;
  const estPilote = type === 'pilote';

  // En-tête
  $('entete-plaque').hidden = !(estPilote && profil.plaque);
  $('entete-plaque').textContent = profil.plaque || '';

  // Accueil
  const p = prenom(profil.nom);
  $('titre-accueil').textContent = p ? `Salut ${p}` : 'Salut';
  if (estPilote) {
    $('accueil-sous-titre').textContent = profil.plaque ? `Pilote, plaque ${profil.plaque}.` : 'Pilote.';
  } else if (type === 'organisateur') {
    $('accueil-sous-titre').textContent = 'Organisateur.';
  } else {
    $('accueil-sous-titre').textContent = 'Spectateur.';
  }
  $('accueil-attente').hidden = !(type === 'organisateur' && !profil.organisateur_valide);

  // Mon profil : ma page
  const plaque = $('profil-plaque');
  if (estPilote && profil.plaque) {
    plaque.textContent = profil.plaque;
    plaque.classList.remove('initiales');
    plaque.setAttribute('aria-label', `Plaque ${profil.plaque}`);
  } else {
    plaque.textContent = initiales(profil.nom);
    plaque.classList.add('initiales');
    plaque.setAttribute('aria-label', 'Initiales');
  }
  $('profil-nom').textContent = profil.nom || 'Sans nom';
  let etiquette = TYPES[type] || '';
  if (type === 'organisateur') etiquette += profil.organisateur_valide ? ' validé' : ' (en attente de validation)';
  $('profil-type').textContent = etiquette;
  const details = [profil.club, estPilote ? profil.categorie : null].filter(Boolean).join(' · ');
  $('profil-club').hidden = !details;
  $('profil-club').textContent = details;
  $('profil-email').textContent = utilisateur.email || '';

  // Mon profil : formulaire
  $('profil-champ-nom').value = profil.nom || '';
  $('profil-bloc-plaque').hidden = !estPilote;
  $('profil-champ-plaque').value = profil.plaque || '';
  $('profil-bloc-categorie').hidden = !estPilote;
  const choix = $('profil-champ-categorie');
  choix.innerHTML = '';
  for (const c of ['', ...CATEGORIES]) {
    const option = new Option(c || 'Je ne sais pas', c);
    option.selected = c === (profil.categorie || '');
    choix.append(option);
  }
  $('profil-label-club').textContent = estPilote ? 'Club'
    : type === 'organisateur' ? 'Club ou structure qui organise' : 'Club que tu suis';
  $('profil-champ-club').value = profil.club || '';
  majPosition();
}

// Enregistre des changements du profil. Renvoie un message d'erreur, ou null si tout va bien.
async function enregistrer(changements) {
  const { error } = await supabase.from('profils').update(changements).eq('id', utilisateur.id);
  if (error) return messageErreur(error);
  Object.assign(profil, changements);
  remplir();
  return null;
}

function allerOnglet(nom) {
  if (window.location.hash !== `#${nom}`) window.location.hash = nom;
  else montrerOnglet();
}

// ---------- Mon profil : enregistrer ----------

$('form-profil').addEventListener('submit', async (e) => {
  e.preventDefault();
  const zone = $('message-profil');
  afficher(zone, '');
  const nom = $('profil-champ-nom').value.trim();
  const plaque = $('profil-champ-plaque').value.trim();
  const club = $('profil-champ-club').value.trim();
  if (!nom) return afficher(zone, 'Écris ton prénom et ton nom.');
  const changements = { nom, club: club || null };
  if (profil.type_compte === 'pilote') {
    if (!plaque) return afficher(zone, 'Écris ton numéro de plaque.');
    changements.plaque = plaque;
    changements.categorie = $('profil-champ-categorie').value || null;
  }
  if (profil.type_compte === 'organisateur' && !club) return afficher(zone, 'Écris le nom du club ou de la structure.');
  const bouton = e.submitter;
  if (bouton) bouton.disabled = true;
  const probleme = await enregistrer(changements);
  if (bouton) bouton.disabled = false;
  if (probleme) return afficher(zone, probleme);
  afficher(zone, 'Infos enregistrées.', 'ok');
});

$('revoir-tuto').addEventListener('click', () => {
  lancerTuto({ profil, enregistrer, allerOnglet, demanderPosition, depart: 'visite' });
});

// ---------- Ma position ----------
// Demandée au tuto de la première connexion ; le choix est gardé dans le profil,
// la position reste sur le téléphone. À chaque connexion, si c'est oui, on la reprend tout de suite.

async function demanderPosition() {
  const rep = await prendrePosition();
  if (rep.etat === 'ok') {
    retenirChoix(true);
    suivrePosition();
  } else if (rep.etat === 'refusee') {
    retenirChoix(false);
  }
  return rep;
}

function majPosition() {
  const p = positionConnue();
  const active = profil?.localisation === true;
  // en-tête : la ville où l'on est
  $('entete-lieu').hidden = !(active && p);
  $('entete-ville').textContent = p?.ville || 'Ma position';
  // accueil : la carte « Active ta position », seulement si on ne l'a jamais demandé
  $('accueil-position').hidden = !(profil && profil.localisation == null && profil.tuto_fini);
  // mon profil
  $('position-etat').textContent = active ? 'Activée' : 'Désactivée';
  $('position-detail').textContent = active
    ? (p ? `Dernière position : ${p.ville || 'trouvée'}, ${new Date(p.quand).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Elle reste sur ton téléphone.` : 'On cherche où tu es…')
    : 'L’appli ne connaît pas ta position.';
  $('position-bouton').textContent = active ? 'Désactiver ma position' : 'Activer ma position';
}
window.addEventListener('dbspeed:position', majPosition);

async function activerPosition(zone) {
  afficher(zone, '');
  const rep = await demanderPosition();
  if (rep.etat === 'ok') {
    const probleme = await enregistrer({ localisation: true });
    if (probleme) return afficher(zone, probleme);
    majPosition();
    return afficher(zone, 'Position activée.', 'ok');
  }
  if (rep.etat === 'refusee') {
    await enregistrer({ localisation: false });
    majPosition();
    return afficher(zone, 'Le téléphone a refusé. Pour l’autoriser : réglages du téléphone → ton navigateur (ou DBSpeed) → Position → Autoriser, puis réessaie.');
  }
  return afficher(zone, 'Impossible de trouver ta position pour l’instant. Réessaie dans un moment.');
}

$('position-bouton').addEventListener('click', async (e) => {
  const bouton = e.currentTarget;
  bouton.disabled = true;
  if (profil.localisation === true) {
    const probleme = await enregistrer({ localisation: false });
    if (probleme) afficher($('message-position'), probleme);
    else {
      retenirChoix(false);
      oublierPosition();
      majPosition();
      afficher($('message-position'), 'Position désactivée : l’appli ne s’en sert plus et l’a effacée de ton téléphone.', 'ok');
    }
  } else {
    await activerPosition($('message-position'));
  }
  bouton.disabled = false;
});

$('accueil-position-oui').addEventListener('click', async (e) => {
  const bouton = e.currentTarget;
  bouton.disabled = true;
  await activerPosition($('message'));
  bouton.disabled = false;
  majPosition();
});
$('accueil-position-non').addEventListener('click', async () => {
  await enregistrer({ localisation: false });
  retenirChoix(false);
  window.montrer?.($('accueil-position'), false);
});

$('deconnexion').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.replace(CONNEXION);
});

// ---------- Finir l'inscription (compte Google) ----------

function preparerFinInscription() {
  const form = $('form-finir');
  const retenu = typeRetenu();
  if (retenu && TYPES[retenu]) {
    form.querySelector(`input[value="${retenu}"]`).checked = true;
  }
  $('finir-nom').value = profil.nom || '';
  const majFinir = () => {
    const type = form.querySelector('input[name="type"]:checked').value;
    $('finir-champ-plaque').hidden = type !== 'pilote';
    $('finir-note-organisateur').hidden = type !== 'organisateur';
  };
  form.addEventListener('change', majFinir);
  majFinir();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const zone = $('message');
    afficher(zone, '');
    const type = form.querySelector('input[name="type"]:checked').value;
    const nom = $('finir-nom').value.trim();
    const plaque = $('finir-plaque').value.trim();
    if (!nom) return afficher(zone, 'Écris ton prénom et ton nom.');
    if (type === 'pilote' && !plaque) return afficher(zone, 'Écris ton numéro de plaque.');
    const bouton = e.submitter;
    if (bouton) bouton.disabled = true;
    const { error } = await supabase.rpc('choisir_type_compte', {
      p_type: type, p_nom: nom, p_plaque: type === 'pilote' ? plaque : null,
    });
    if (bouton) bouton.disabled = false;
    if (error) return afficher(zone, messageErreur(error));
    await chargerProfil();
    ouvrirAppli();
  });

  $('finir-inscription').hidden = false;
  $('finir-inscription').classList.add('glisse');
}

function ouvrirAppli() {
  $('finir-inscription').hidden = true;
  remplir();
  module('amis').then((m) => m.afficherAmis($('amis-zone'), { supabase })).catch(siEchec);
  $('appli').hidden = false;
  $('appli').classList.add('fondu');
  // La position : si la personne a dit oui, on la reprend dès l'ouverture de l'appli
  retenirChoix(profil.localisation ?? null);
  if (profil.localisation === true) suivrePosition();
  majPosition();
  montrerOnglet();
  // Première connexion : le tuto (bienvenue, infos, position, visite guidée)
  if (!profil.tuto_fini) {
    setTimeout(() => lancerTuto({ profil, enregistrer, allerOnglet, demanderPosition }), 350);
  }
}

// ---------- Démarrage ----------

async function demarrer() {
  const zone = $('message');
  if (!configOk) {
    $('chargement').hidden = true;
    return afficher(zone, "L'appli n'est pas encore configurée (adresse de la base manquante).");
  }

  // Lien de mail expiré, Google annulé… : on renvoie vers la page de connexion avec le message
  const erreur = erreurDansAdresse();

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    const suite = erreur ? window.location.hash : '';
    window.location.replace(`${CONNEXION}${suite}`);
    return;
  }
  utilisateur = data.session.user;

  supabase.auth.onAuthStateChange((evenement) => {
    if (evenement === 'SIGNED_OUT') window.location.replace(CONNEXION);
  });

  try {
    await chargerProfil();
  } catch (err) {
    $('chargement').hidden = true;
    return afficher(zone, messageErreur(err));
  }

  $('chargement').hidden = true;
  if (!profil.type_compte) {
    preparerFinInscription();
  } else {
    ouvrirAppli();
  }
}

demarrer();
