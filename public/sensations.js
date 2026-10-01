/* =========================================================
   DBSpeed — sensations (site + appli)
   Un seul fichier, ajouté sur chaque page :
   <script src="/sensations.js" defer></script>
   - petite vibration à chaque appui (Android ; l'iPhone ne le permet pas pour un site web)
   - effet d'appui visuel (le bouton s'enfonce) partout
   - apparition douce des blocs quand on fait défiler
   - fondu entre les pages
   - window.montrer(el, vrai/faux) : afficher / cacher un bloc en douceur (au lieu d'un coup)
   - questions (<details>) qui s'ouvrent et se ferment en douceur
   - data-apparait (sur un parent : ses enfants arrivent l'un après l'autre)
     et data-revele (sur un élément : il arrive seul) quand on fait défiler
   - tout est réduit si le téléphone est réglé sur « réduire les animations »
   ========================================================= */
(function () {
  const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Vibrations -------------------------------------------------------
  const motifs = { leger: 8, fort: 18, erreur: [12, 60, 12] };
  window.vibrer = function (type = 'leger') {
    try { if (navigator.vibrate) navigator.vibrate(motifs[type] || motifs.leger); } catch (e) {}
  };
  const touchables = 'a, button, summary, [role="tab"], .touchable';

  // --- Styles communs (effet d'appui, apparition, fondu) ------------------
  const css = `
    ${touchables} { -webkit-tap-highlight-color: transparent; touch-action: manipulation;
      transition: transform .15s cubic-bezier(.2,.8,.2,1), background-color .2s, border-color .2s, color .2s; }
    .appuye { transform: scale(.96) !important; }
    .apparait { opacity: 0; transform: translateY(18px);
      transition: opacity .35s ease-out, transform .35s cubic-bezier(.2,.8,.2,1); }
    .apparait.vu { opacity: 1; transform: none; }
    body { animation: db-entree .3s ease-out both; }
    body.sortie { opacity: 0; transition: opacity .15s ease-in; }
    @keyframes db-entree { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) {
      *, body { animation: none !important; transition: none !important; }
      .apparait { opacity: 1; transform: none; }
    }`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // --- Appui : vibration + effet visuel ------------------------------------
  let cible = null;
  addEventListener('pointerdown', (e) => {
    cible = e.target.closest(touchables);
    if (!cible || cible.disabled) return;
    cible.classList.add('appuye');
    vibrer(cible.matches('.btn-or, .bouton-or, .bouton-principal, button[type="submit"]') ? 'fort' : 'leger');
  }, { passive: true });
  const relacher = () => { if (cible) cible.classList.remove('appuye'); cible = null; };
  addEventListener('pointerup', relacher, { passive: true });
  addEventListener('pointercancel', relacher, { passive: true });
  addEventListener('pointerleave', relacher, { passive: true });

  // --- Apparition douce des blocs ------------------------------------------
  function preparerApparitions() {
    const blocs = document.querySelectorAll('[data-apparait]');
    const seuls = document.querySelectorAll('[data-revele]');
    if (calme || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((entrees) => {
      entrees.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('vu');
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    blocs.forEach((groupe) => {
      // chaque enfant arrive un peu après le précédent
      Array.from(groupe.children).forEach((el, i) => {
        el.classList.add('apparait');
        el.style.transitionDelay = Math.min(i * 60, 300) + 'ms';
        obs.observe(el);
      });
    });
    seuls.forEach((el) => {
      el.classList.add('apparait');
      obs.observe(el);
    });
  }

  // --- Afficher / cacher un bloc en douceur ---------------------------------
  window.montrer = function (el, visible) {
    if (!el) return;
    if (!el._anim && visible === !el.hidden) return;
    if (calme || !el.animate) { el.hidden = !visible; return; }
    if (el._anim) el._anim.cancel();
    el.style.overflow = 'hidden';
    let anim;
    if (visible) {
      el.hidden = false;
      const h = el.scrollHeight;
      anim = el.animate(
        [{ height: '0px', opacity: 0, marginTop: '0px', marginBottom: '0px', transform: 'translateY(-6px)' },
         { height: h + 'px', opacity: 1, transform: 'none' }],
        { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
    } else {
      const h = el.offsetHeight;
      anim = el.animate(
        [{ height: h + 'px', opacity: 1 },
         { height: '0px', opacity: 0, marginTop: '0px', marginBottom: '0px' }],
        { duration: 200, easing: 'ease-in' });
    }
    el._anim = anim;
    anim.onfinish = () => { el.hidden = !visible; el.style.overflow = ''; el._anim = null; };
  };

  // --- Questions (<details>) qui s'ouvrent en douceur ---------------------
  addEventListener('click', (e) => {
    const resume = e.target.closest('summary');
    const bloc = resume && resume.parentElement;
    if (!bloc || bloc.tagName !== 'DETAILS' || calme || !bloc.animate || bloc._anim) return;
    e.preventDefault();
    const depart = bloc.offsetHeight;
    const ouvrir = !bloc.open;
    if (ouvrir) bloc.open = true;
    const arrivee = ouvrir ? bloc.offsetHeight : resume.offsetHeight
      + parseFloat(getComputedStyle(bloc).borderTopWidth) + parseFloat(getComputedStyle(bloc).borderBottomWidth);
    bloc.style.overflow = 'hidden';
    bloc._anim = bloc.animate([{ height: depart + 'px' }, { height: arrivee + 'px' }],
      { duration: ouvrir ? 300 : 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
    bloc._anim.onfinish = () => {
      if (!ouvrir) bloc.open = false;
      bloc.style.overflow = ''; bloc._anim = null;
    };
  });

  // --- Fondu quand on change de page ----------------------------------------
  addEventListener('click', (e) => {
    const lien = e.target.closest('a[href]');
    if (!lien || calme || e.defaultPrevented || e.metaKey || e.ctrlKey || lien.target === '_blank') return;
    const url = new URL(lien.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    e.preventDefault();
    document.body.classList.add('sortie');
    setTimeout(() => { location.href = url.href; }, 150);
  });
  // revenir en arrière sans rester sur une page transparente
  addEventListener('pageshow', () => document.body.classList.remove('sortie'));

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', preparerApparitions);
  else preparerApparitions();
})();
