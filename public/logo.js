// DBSpeed — le logo choisi par l'utilisateur (Officiel, Néon, Marbre blanc, Feu).
// Partagé par le site et l'appli. Le choix reste sur le téléphone (localStorage « dbspeed_logo »).
// Il change : les logos de la page (<img data-logo> = médaille, <img data-logo-icone> = icône),
// l'icône de l'onglet, l'icône pour « Ajouter à l'écran d'accueil » et le manifeste de l'appli.
(function () {
  const LOGOS = {
    officiel: { nom: 'Officiel', texte: 'Or et vert, les couleurs de DBSpeed' },
    tron: { nom: 'Néon', texte: 'Noir et néon bleu' },
    marbre: { nom: 'Marbre blanc', texte: 'Marbre blanc et or' },
    feu: { nom: 'Feu', texte: 'En flammes' },
  };
  const CLE = 'dbspeed_logo';

  function choisi() {
    let id = null;
    try { id = localStorage.getItem(CLE); } catch (_) { /* navigation privée */ }
    return LOGOS[id] ? id : 'officiel';
  }

  const icone = (id, taille) => `/icones/icone-${id === 'officiel' ? '' : id + '-'}${taille}.png`;

  function lien(rel, href) {
    let l = document.head.querySelector(`link[rel="${rel}"]`);
    if (!l) { l = document.createElement('link'); l.rel = rel; document.head.appendChild(l); }
    if (l.getAttribute('href') !== href) l.setAttribute('href', href);
  }

  function appliquer(id) {
    document.querySelectorAll('img[data-logo]').forEach((img) => { img.src = `/logos/${id}.svg`; });
    document.querySelectorAll('img[data-logo-icone]').forEach((img) => { img.src = `/logos/${id}-icone.svg`; });
    lien('icon', icone(id, 192));
    lien('apple-touch-icon', icone(id, 180));
    if (document.head.querySelector('link[rel="manifest"]')) {
      lien('manifest', id === 'officiel' ? '/manifest.webmanifest' : `/manifest-${id}.webmanifest`);
    }
  }

  function choisir(id) {
    if (!LOGOS[id]) return;
    try { localStorage.setItem(CLE, id); } catch (_) { /* pas grave : il vaudra pour cette visite */ }
    appliquer(id);
    window.dispatchEvent(new CustomEvent('dbspeed:logo', { detail: id }));
  }

  window.dbspeedLogo = { LOGOS, choisi, choisir, appliquer };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => appliquer(choisi()));
  } else {
    appliquer(choisi());
  }
})();
