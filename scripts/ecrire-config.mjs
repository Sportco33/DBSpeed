// Écrit public/config.js au moment de la mise en ligne sur Netlify.
// Les valeurs viennent des variables Netlify : rien n'est écrit en dur dans le dépôt GitHub.
// La clé « publishable » de Supabase est faite pour être utilisée dans le navigateur
// (la base est protégée par ses règles de sécurité).
import { writeFileSync } from 'node:fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
// Clé de la carte MapTiler (facultative) : plan détaillé + vue satellite dans l'onglet Lieux.
// C'est une clé « navigateur », protégée dans MapTiler par la liste des sites autorisés.
const maptilerKey = (process.env.MAPTILER_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('Il manque SUPABASE_URL ou SUPABASE_PUBLISHABLE_KEY dans les variables Netlify.');
  process.exit(1);
}

writeFileSync(
  'public/config.js',
  `window.DBSPEED_CONFIG = ${JSON.stringify({ supabaseUrl, supabaseKey, maptilerKey })};\n`
);
console.log(`public/config.js écrit${maptilerKey ? ' (avec la clé MapTiler)' : ' (sans clé MapTiler : carte OpenFreeMap)'}.`);
