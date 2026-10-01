// Page de connexion : 3 types de compte, se connecter, créer un compte, Google.
import {
  supabase, configOk, googleActive, messageErreur, erreurDansAdresse, retenirType,
} from '/app/supabase.js';

const ACCUEIL = '/app/accueil.html';

const $ = (id) => document.getElementById(id);
const formulaire = $('formulaire');
const message = $('message');
const boutonValider = $('valider');
const boutonGoogle = $('google');

let mode = 'connexion'; // ou 'inscription'

function afficher(texte, genre = 'erreur') {
  message.textContent = texte;
  message.className = `message ${genre}`;
  if (!texte) return;
  message.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  window.vibrer?.(genre === 'erreur' ? 'erreur' : 'fort');
}

function typeChoisi() {
  return formulaire.querySelector('input[name="type"]:checked').value;
}

function mettreAJour() {
  const inscription = mode === 'inscription';
  const type = typeChoisi();
  $('mode-connexion').setAttribute('aria-pressed', String(!inscription));
  $('mode-inscription').setAttribute('aria-pressed', String(inscription));
  document.querySelector('.modes').dataset.mode = mode;   // la pastille glisse sous le bon bouton
  // les champs s'ouvrent et se ferment en douceur (sensations.js)
  const montrer = (el, visible) => (window.montrer ? window.montrer(el, visible) : (el.hidden = !visible));
  montrer($('champ-nom'), inscription);
  montrer($('champ-plaque'), inscription && type === 'pilote');
  montrer($('note-organisateur'), inscription && type === 'organisateur');
  montrer($('aide-mdp'), inscription);
  $('mot-de-passe').autocomplete = inscription ? 'new-password' : 'current-password';
  const texte = inscription ? 'Créer mon compte' : 'Me connecter';
  if (boutonValider.textContent !== texte) {
    boutonValider.textContent = texte;
    boutonValider.classList.remove('change'); void boutonValider.offsetWidth; boutonValider.classList.add('change');
  }
}

$('mode-connexion').addEventListener('click', () => { mode = 'connexion'; afficher(''); mettreAJour(); });
$('mode-inscription').addEventListener('click', () => { mode = 'inscription'; afficher(''); mettreAJour(); });
formulaire.addEventListener('change', (e) => { if (e.target.name === 'type') mettreAJour(); });

function occupe(oui) {
  boutonValider.disabled = oui;
  boutonGoogle.disabled = oui || boutonGoogle.dataset.inactif === 'oui';
}

formulaire.addEventListener('submit', async (e) => {
  e.preventDefault();
  afficher('');
  if (!configOk) return afficher("L'appli n'est pas encore configurée.");

  const type = typeChoisi();
  const email = $('email').value.trim();
  const motDePasse = $('mot-de-passe').value;
  const nom = $('nom').value.trim();
  const plaque = $('plaque').value.trim();

  if (!email) return afficher('Écris ton email.');
  if (!motDePasse) return afficher('Écris ton mot de passe.');

  occupe(true);
  try {
    if (mode === 'connexion') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
      if (error) return afficher(messageErreur(error));
      window.location.replace(ACCUEIL);
      return;
    }

    // Créer un compte
    if (!nom) return afficher('Écris ton prénom et ton nom.');
    if (type === 'pilote' && !plaque) return afficher('Écris ton numéro de plaque.');
    if (motDePasse.length < 6) return afficher('Mot de passe trop court : 6 caractères minimum.');

    const { data, error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: {
        emailRedirectTo: `${window.location.origin}${ACCUEIL}`,
        data: { type_compte: type, nom, plaque: type === 'pilote' ? plaque : null },
      },
    });
    if (error) return afficher(messageErreur(error));

    // Supabase ne dit pas directement si l'email existe déjà : dans ce cas, pas d'identité
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return afficher('Un compte existe déjà avec cet email. Connecte-toi.');
    }
    if (data.session) {
      window.location.replace(ACCUEIL);
      return;
    }
    formulaire.reset();
    mode = 'connexion';
    mettreAJour();
    afficher(`Compte créé ! On t'a envoyé un mail à ${email}. Clique sur le lien dedans pour activer ton compte.`, 'ok');
  } catch (err) {
    afficher(messageErreur(err));
  } finally {
    occupe(false);
  }
});

boutonGoogle.addEventListener('click', async () => {
  afficher('');
  if (!configOk) return afficher("L'appli n'est pas encore configurée.");
  retenirType(typeChoisi());
  occupe(true);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${ACCUEIL}` },
  });
  if (error) {
    afficher(messageErreur(error));
    occupe(false);
  }
});

async function demarrer() {
  mettreAJour();

  if (!configOk) {
    afficher("L'appli n'est pas encore configurée (adresse de la base manquante).");
    occupe(true);
    return;
  }

  // Erreur renvoyée par un lien de mail ou par Google
  const erreur = erreurDansAdresse();
  if (erreur) {
    afficher(messageErreur(erreur));
    history.replaceState(null, '', window.location.pathname);
  }

  // Déjà connecté ? On va directement à l'accueil
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    window.location.replace(ACCUEIL);
    return;
  }

  // Bouton Google : seulement si Google est activé dans Supabase
  if (!(await googleActive())) {
    boutonGoogle.dataset.inactif = 'oui';
    boutonGoogle.disabled = true;
    boutonGoogle.textContent = 'Connexion Google : bientôt disponible';
  }
}

demarrer();
