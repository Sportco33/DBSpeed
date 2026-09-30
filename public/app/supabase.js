// Connexion à Supabase + petits outils partagés par les pages de l'appli.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

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

// Lit une erreur renvoyée dans l'adresse (#error=...), par exemple un lien de mail expiré
export function erreurDansAdresse() {
  const brut = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const params = new URLSearchParams(brut);
  if (!params.get('error') && !params.get('error_code')) return null;
  return {
    code: params.get('error_code') || params.get('error'),
    message: params.get('error_description') || params.get('error') || '',
  };
}

// Petite mémoire du type choisi avant de partir chez Google
export function retenirType(type) {
  try { sessionStorage.setItem('dbspeed_type_choisi', type); } catch { /* rien */ }
}
export function typeRetenu() {
  try { return sessionStorage.getItem('dbspeed_type_choisi'); } catch { return null; }
}
