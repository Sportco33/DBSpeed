// DBSpeed — petits outils partagés par les onglets de l'appli
// (Compétition, Entraînement, Mes amis, Lieux, tuto).
// Rien ici ne parle à la base : seulement du texte, du HTML et des petits gestes.

// Rend un texte sans danger dans du HTML (aussi entre guillemets, dans un attribut)
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const ICONE_RETOUR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';

// Lien « Retour » en haut d'un écran (data-retour : l'onglet le fait revenir vraiment en arrière)
export function lienRetour(href, texte) {
  return `<a class="retour" href="${href}" data-retour>${ICONE_RETOUR}<span>${esc(texte)}</span></a>`;
}

// Encadré « rien à montrer »
export function vide(titre, texte) {
  return `<div class="vide"><strong>${esc(titre)}</strong>${esc(texte)}</div>`;
}

// Rangée de pastilles à choisir (une seule active)
export function puces(nom, options, actif, classe = '') {
  return `<div class="puces ${classe}" role="group" aria-label="${esc(nom)}">${options.map(([valeur, texte]) =>
    `<button type="button" class="puce" data-valeur="${esc(valeur)}" aria-pressed="${valeur === actif}">${esc(texte)}</button>`).join('')}</div>`;
}

// Quand on touche une pastille (ou un segment) : elle devient active et on prévient « quand »
export function surChoix(conteneur, quand) {
  conteneur?.querySelectorAll('button[data-valeur]').forEach((b) => b.addEventListener('click', () => {
    conteneur.querySelectorAll('button[data-valeur]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    quand(b.dataset.valeur);
  }));
}

// Relance l'animation d'arrivée d'un écran.
// glisse-gauche : on avance (la page vient de la droite) ; glisse-droite : on revient en arrière.
// (Avec « réduire les animations », le CSS les coupe déjà.)
export function animer(zone, classe = 'glisse') {
  zone.classList.remove('glisse', 'glisse-gauche', 'glisse-droite');
  void zone.offsetWidth;
  zone.classList.add(classe);
}

// Temps de chaque secteur à partir des temps de passage cumulés (secteur 1 = départ → 1re ligne)
export function secteurs(cumul) {
  return cumul.map((t, i) => (t == null ? null : i === 0 ? t : cumul[i - 1] == null ? null : Math.round((t - cumul[i - 1]) * 1000) / 1000));
}

// Les éléments avec data-lien (ex. une ligne de tableau) ouvrent cette adresse quand on les touche.
// Ils marchent aussi au clavier : Tab pour y aller, Entrée ou Espace pour les ouvrir.
export function brancherLiens(zone) {
  zone.querySelectorAll('[data-lien]').forEach((el) => {
    if (el.dataset.lienBranche) return;
    el.dataset.lienBranche = '1';
    if (!el.matches('a, button')) {
      el.tabIndex = 0;
      el.setAttribute('role', 'link');
    }
    const ouvrir = () => { location.hash = el.dataset.lien; };
    el.addEventListener('click', ouvrir);
    el.addEventListener('keydown', (e) => {
      if (e.target !== el || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();   // Espace ne fait pas défiler la page
      window.vibrer?.('leger');
      ouvrir();
    });
  });
}

// Petite question « tu es sûr ? » qui s'ouvre sous un bouton
export function demander(apres, { texte, oui, classeOui = 'bouton-or bouton-principal' }) {
  return new Promise((resoudre) => {
    apres.parentElement.querySelector('.question')?.remove();
    const q = document.createElement('div');
    q.className = 'question';
    q.hidden = true;
    q.innerHTML = `<p>${texte}</p>
      <div class="question-boutons">
        <button type="button" class="bouton bouton-secondaire" data-non>Annuler</button>
        <button type="button" class="bouton ${classeOui}" data-oui>${esc(oui)}</button>
      </div>`;
    apres.after(q);
    window.montrer ? window.montrer(q, true) : (q.hidden = false);
    const fermer = (rep) => {
      window.montrer ? window.montrer(q, false) : (q.hidden = true);
      setTimeout(() => q.remove(), 260);
      resoudre(rep);
    };
    q.querySelector('[data-non]').addEventListener('click', () => fermer(false));
    q.querySelector('[data-oui]').addEventListener('click', () => fermer(true));
  });
}
