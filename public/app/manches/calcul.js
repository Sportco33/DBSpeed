// DBSpeed — calculer les résultats d'une manche à partir des temps de passage.
// Pour chaque pilote : place à l'arrivée, place et écart avec le premier à chaque ligne,
// temps de chaque secteur (d'une ligne à la suivante) et son rang dans la manche.
// Rien ici ne parle à la base ni à l'écran : on peut le tester tout seul.

import { secteurs } from '/app/outils.js';

// Classement « sportif » : deux temps égaux ont la même place (1, 1, 3…)
function rangs(valeurs) {
  const tries = valeurs.filter((v) => v != null).sort((a, b) => a - b);
  return valeurs.map((v) => (v == null ? null : tries.indexOf(v) + 1));
}

// pilotes : [{ plaque, pilote, couloir, temps: [t1, t2, …, arrivée] }] (temps cumulés depuis la grille)
// Renvoie les pilotes rangés par place, chacun avec :
//   place, fini (a passé l'arrivée), derniere (dernière ligne passée, -1 = aucune),
//   passages: [{ temps, place, ecart, secteur, rangSecteur, meilleurSecteur }]
export function calculerManche(pilotes) {
  if (!pilotes?.length) return [];
  const nb = Math.max(...pilotes.map((p) => p.temps.length));
  const temps = pilotes.map((p) => Array.from({ length: nb }, (_, i) => (p.temps[i] == null ? null : Number(p.temps[i]))));
  const parSecteur = temps.map((t) => secteurs(t));

  const lignes = [];
  for (let i = 0; i < nb; i++) {
    const col = temps.map((t) => t[i]);
    const colSecteur = parSecteur.map((s) => s[i]);
    const passes = col.filter((v) => v != null);
    const secteursPasses = colSecteur.filter((v) => v != null);
    lignes.push({
      places: rangs(col),
      premier: passes.length ? Math.min(...passes) : null,
      rangsSecteur: rangs(colSecteur),
      meilleurSecteur: secteursPasses.length ? Math.min(...secteursPasses) : null,
    });
  }

  const enrichis = pilotes.map((p, k) => {
    const t = temps[k];
    let derniere = -1;
    t.forEach((v, i) => { if (v != null) derniere = i; });
    return {
      ...p,
      temps: t,
      fini: t[nb - 1] != null,
      derniere,
      final: t[nb - 1],
      passages: t.map((v, i) => ({
        temps: v,
        place: lignes[i].places[k],
        ecart: v == null ? null : Math.round((v - lignes[i].premier) * 1000) / 1000,
        secteur: parSecteur[k][i],
        rangSecteur: lignes[i].rangsSecteur[k],
        meilleurSecteur: parSecteur[k][i] != null && parSecteur[k][i] === lignes[i].meilleurSecteur,
      })),
    };
  });

  // Ordre : ceux qui finissent (par temps), puis ceux qui s'arrêtent (le plus loin d'abord,
  // puis le plus rapide à cette ligne), puis ceux qui ne sont passés nulle part.
  const cle = (p) => [p.fini ? 0 : 1, -p.derniere, p.derniere >= 0 ? p.temps[p.derniere] : 0];
  enrichis.sort((a, b) => {
    const x = cle(a); const y = cle(b);
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2] || String(a.plaque).localeCompare(String(b.plaque), 'fr', { numeric: true });
  });
  enrichis.forEach((p, i) => {
    const avant = enrichis[i - 1];
    // même temps final que le précédent : même place
    p.place = avant && p.fini && avant.fini && avant.final === p.final ? avant.place : i + 1;
  });
  return enrichis;
}

// ---------- Mise en forme ----------

// 36.118 → « 36.118 » ; 62.5 → « 1:02.500 »
export function texteTemps(t) {
  if (t == null) return '—';
  const s = Number(t);
  if (s < 60) return s.toFixed(3);
  const min = Math.floor(s / 60);
  return `${min}:${(s - min * 60).toFixed(3).padStart(6, '0')}`;
}

// 0.394 → « +0.394 » ; 0 → « — » (c'est le premier)
export function texteEcart(e) {
  if (e == null) return '';
  return e === 0 ? '—' : `+${Number(e).toFixed(3)}`;
}

// 1 → « 1er », 2 → « 2e »
export function textePlace(n) {
  return n == null ? '—' : n === 1 ? '1er' : `${n}e`;
}
