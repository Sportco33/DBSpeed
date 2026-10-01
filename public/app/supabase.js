// Connexion à Supabase + petits outils partagés par les pages de l'appli.
// Version exacte de supabase-js (pas « @2 ») : une mise à jour ne peut pas casser l'appli sans qu'on le sache.
// Pour changer de version : remplacer le numéro ici (et vérifier la connexion avant « pushcoco »).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';

const config = window.DBSPEED_CONFIG || {};

export const configOk = Boolean(config.supabaseUrl && config.supabaseKey);

export const supabase = configOk
  ? createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        // « implicit » : le lien du mail de confirmation marche même s'il s'ouvre
        // dans un autre navigateur (appli Gmail, etc.)
        flowType: 'implicit',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const TYPES = {
  pilote: 'Pilote',
  organisateur: 'Organisateur',
  spectateur: 'Spectateur',
};

// Catégories BMX proposées aux pilotes (facultatif)
export const CATEGORIES = [
  'Pré-licencié', 'Poussin', 'Pupille', 'Benjamin', 'Minime', 'Cadet',
  'Junior', 'Senior', 'Elite', 'Master', 'Cruiser',
];

// La connexion Google est-elle activée dans Supabase ?
export async function googleActive() {
  if (!configOk) return false;
  try {
    const rep = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: config.supabaseKey },
    });
    if (!rep.ok) return false;
    const reglages = await rep.json();
    return Boolean(reglages.external && reglages.external.google);
  } catch {
    return false;
  }
}

// Traduit les erreurs de Supabase en phrases simples
export function messageErreur(erreur) {
  if (!erreur) return '';
  // erreur lue dans l'adresse : déjà traduite par erreurDansAdresse
  if (erreur.depuisAdresse) return erreur.message;
  const code = erreur.code || erreur.error_code || '';
  const texte = String(erreur.message || erreur.error_description || erreur || '');
  const contient = (morceau) => texte.toLowerCase().includes(morceau.toLowerCase());

  if (code === 'invalid_credentials' || contient('Invalid login credentials'))
    return 'Email ou mot de passe incorrect.';
  if (code === 'email_not_confirmed' || contient('Email not confirmed'))
    return "Ton email n'est pas encore confirmé. Clique sur le lien reçu par mail.";
  if (code === 'user_already_exists' || contient('already registered'))
    return 'Un compte existe déjà avec cet email. Connecte-toi.';
  if (code === 'weak_password' || contient('Password should be'))
    return 'Mot de passe trop court : 6 caractères minimum.';
  if (code.includes('rate_limit') || contient('rate limit'))
    return "Trop d'essais d'affilée. Réessaie dans quelques minutes.";
  if (code === 'otp_expired' || contient('expired'))
    return 'Le lien du mail a expiré. Connecte-toi, ou crée ton compte à nouveau.';
  if (code === 'email_address_invalid' || contient('Unable to validate email') || (contient('Email address') && contient('is invalid')))
    return "Cet email n'est pas valide.";
  if (code === 'email_address_not_authorized' || contient('not authorized'))
    return "L'envoi des mails n'est pas encore activé pour cette adresse.";
  if (contient('provider is not enabled'))
    return "La connexion Google n'est pas encore activée.";
  if (contient('Failed to fetch') || contient('NetworkError') || contient('Load failed'))
    return 'Pas de connexion internet. Vérifie ton réseau et réessaie.';
  return `Il y a eu un problème : ${texte}`;
}

// Erreurs connues renvoyées dans l'adresse par Supabase (lien de mail, Google…)
const ERREURS_ADRESSE = {
  otp_expired: 'Le lien du mail a expiré. Connecte-toi, ou crée ton compte à nouveau.',
  flow_state_expired: 'Le lien a expiré. Réessaie de te connecter.',
  access_denied: 'La connexion a été annulée. Réessaie quand tu veux.',
  email_not_confirmed: "Ton email n'est pas encore confirmé. Clique sur le lien reçu par mail.",
  provider_disabled: "La connexion Google n'est pas encore activée.",
  signup_disabled: 'Les inscriptions sont fermées pour l’instant.',
  over_request_rate_limit: "Trop d'essais d'affilée. Réessaie dans quelques minutes.",
  over_email_send_rate_limit: "Trop d'essais d'affilée. Réessaie dans quelques minutes.",
};

// Lit une erreur renvoyée dans l'adresse (#error=...), par exemple un lien de mail expiré.
// On n'affiche jamais le texte de l'adresse tel quel (n'importe qui peut écrire un lien) :
// seulement nos propres phrases.
export function erreurDansAdresse() {
  const brut = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const params = new URLSearchParams(brut);
  if (!params.get('error') && !params.get('error_code')) return null;
  const code = params.get('error_code') || params.get('error') || '';
  return {
    code,
    message: ERREURS_ADRESSE[code] || ERREURS_ADRESSE[params.get('error')]
      || "Le lien n'a pas marché. Réessaie de te connecter.",
    depuisAdresse: true,
  };
}

// Petite mémoire du type choisi avant de partir chez Google
export function retenirType(type) {
  try { sessionStorage.setItem('dbspeed_type_choisi', type); } catch { /* rien */ }
}
export function typeRetenu() {
  try { return sessionStorage.getItem('dbspeed_type_choisi'); } catch { return null; }
}
