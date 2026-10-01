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

  // ---------- Écran d'ouverture animé (appli seulement) ----------
  // À l'ouverture de l'appli : la médaille du style choisi en grand, animée, puis l'appli.
  // Une fois par ouverture (sessionStorage). Si la page change pendant l'ouverture
  // (ex. connexion → accueil), la page suivante finit l'ouverture sans la recommencer.
  // Toucher l'écran la passe. Moins d'animations demandées : plus courte, sans mouvement.
  const FONDS = {
    officiel: '#14241F url(/images/marbre-vert.jpg) center / 1024px',
    tron: 'radial-gradient(circle at 50% 45%, #062433 0%, #000 65%)',
    marbre: 'radial-gradient(circle at 40% 35%, #FFFFFF 0%, #EFE9DD 70%, #E2D9C6 100%)',
    feu: 'radial-gradient(circle at 50% 45%, #3A1206 0%, #0C0503 65%)',
  };
  const DUREE = 1700;

  function ouverture() {
    if (!location.pathname.startsWith('/app/')) return;
    const CLE_O = 'dbspeed_ouverture';
    let debut = null;
    try { debut = Number(sessionStorage.getItem(CLE_O)) || null; } catch (_) { return; }
    const maintenant = Date.now();
    if (debut && maintenant - debut >= DUREE) return;          // déjà vue pendant cette ouverture
    const suite = Boolean(debut);                               // on reprend une ouverture commencée
    if (!debut) { try { sessionStorage.setItem(CLE_O, String(maintenant)); } catch (_) { /* rien */ } }
    const reste = suite ? DUREE - (maintenant - debut) : DUREE;
    const calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = choisi();

    const style = document.createElement('style');
    style.textContent = `
      #ouverture{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;
        background:${FONDS[id]};transition:opacity .45s ease,visibility .45s;cursor:pointer}
      #ouverture img{width:min(58vw,260px);height:auto;aspect-ratio:1;
        filter:drop-shadow(0 18px 40px rgba(0,0,0,.45));
        animation:ouv-arrive .9s cubic-bezier(.16,.9,.25,1.15) both}
      #ouverture.suite img{animation:none}
      #ouverture.fin{opacity:0;visibility:hidden}
      #ouverture.fin img{transform:scale(1.12);transition:transform .45s ease}
      @keyframes ouv-arrive{0%{opacity:0;transform:scale(.55) rotate(-14deg)}
        60%{opacity:1}100%{opacity:1;transform:none}}
      @media (prefers-reduced-motion:reduce){#ouverture img{animation:none}
        #ouverture.fin img{transform:none}}`;
    document.head.appendChild(style);

    const ecran = document.createElement('div');
    ecran.id = 'ouverture';
    if (suite) ecran.className = 'suite';
    ecran.setAttribute('aria-hidden', 'true');
    ecran.innerHTML = `<img src="/logos/${id}.svg" alt="">`;
    document.documentElement.appendChild(ecran);

    let fini = false;
    const finir = () => {
      if (fini) return;
      fini = true;
      try { sessionStorage.setItem(CLE_O, '1'); } catch (_) { /* rien */ }
      ecran.classList.add('fin');
      setTimeout(() => { ecran.remove(); style.remove(); }, 500);
    };
    ecran.addEventListener('click', finir);
    setTimeout(finir, calme ? Math.min(reste, 700) : Math.max(reste, 250));
  }
  ouverture();

  window.dbspeedLogo = { LOGOS, choisi, choisir, appliquer };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => appliquer(choisi()));
  } else {
    appliquer(choisi());
  }
})();
