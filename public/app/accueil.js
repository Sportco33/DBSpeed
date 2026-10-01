// Espace connecté : onglets Accueil, Entraînement, Compétition, Mon profil (en bas de l'écran).
import {
  supabase, configOk, TYPES, CATEGORIES, messageErreur, erreurDansAdresse, typeRetenu,
} from '/app/supabase.js';
import { lancerTuto } from '/app/tuto.js';

const CONNEXION = '/app/';
const ONGLETS = ['accueil', 'entrainement', 'competition', 'profil'];

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
    .select('id, type_compte, nom, plaque, club, categorie, organisateur_valide, tuto_fini')
    .eq('id', utilisateur.id)
    .single();
  if (error) throw error;
  profil = data;
}

// ---------- Onglets ----------

function ongletActuel() {
  const nom = window.location.hash.replace('#', '');
  return ONGLETS.includes(nom) ? nom : 'accueil';
}

function montrerOnglet() {
  const actuel = ongletActuel();
  // Nettoie l'adresse si elle contient autre chose qu'un nom d'onglet (ex. retour de Google)
  if (window.location.hash !== `#${actuel}`) {
    history.replaceState(null, '', `${window.location.pathname}#${actuel}`);
  }
  for (const nom of ONGLETS) {
    const section = $(`onglet-${nom}`);
    const visible = nom === actuel;
    if (visible && section.hidden) {
      // apparition douce de l'onglet
      section.classList.remove('glisse');
      void section.offsetWidth;
      section.classList.add('glisse');
    }
    section.hidden = !visible;
  }
  for (const lien of document.querySelectorAll('.onglets a')) {
    if (lien.dataset.onglet === actuel) lien.setAttribute('aria-current', 'page');
    else lien.removeAttribute('aria-current');
  }
  window.scrollTo(0, 0);
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
    $('accueil-vide').textContent = 'Tes temps arriveront ici après ta prochaine course.';
  } else if (type === 'organisateur') {
    $('accueil-sous-titre').textContent = 'Organisateur.';
    $('accueil-vide').textContent = 'Les manches que tu importes apparaîtront ici.';
  } else {
    $('accueil-sous-titre').textContent = 'Spectateur.';
    $('accueil-vide').textContent = 'Les résultats arriveront ici après la prochaine course.';
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
  lancerTuto({ profil, enregistrer, allerOnglet, depart: 'visite' });
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
  $('appli').hidden = false;
  $('appli').classList.add('fondu');
  montrerOnglet();
  // Première connexion : le tuto (bienvenue, infos, visite guidée)
  if (!profil.tuto_fini) {
    setTimeout(() => lancerTuto({ profil, enregistrer, allerOnglet }), 350);
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
