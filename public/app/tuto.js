// Tuto de la première connexion :
//   1. Bienvenue  2. Tes infos  3. Visite guidée avec un projecteur sur chaque partie de l'appli  4. C'est prêt
// Utilisé par accueil.js : lancerTuto({ profil, enregistrer, allerOnglet, depart })
import { CATEGORIES } from '/app/supabase.js';

const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
const attendre = (ms) => new Promise((ok) => setTimeout(ok, calme ? 0 : ms));
const vibrer = (type) => window.vibrer?.(type);

function echapper(texte) {
  const div = document.createElement('div');
  div.textContent = texte ?? '';
  return div.innerHTML;
}

function prenom(nom) {
  return (nom || '').trim().split(/\s+/)[0] || '';
}

// ---------- Ce qu'on montre, selon le type de compte ----------

const POINTS_BIENVENUE = {
  pilote: [
    ['chrono', 'Ton temps à chaque ligne'],
    ['podium', 'Ta position à chaque intermédiaire'],
    ['ecart', "Ton écart avec le premier"],
  ],
  organisateur: [
    ['fichier', 'Tu importes le fichier des temps'],
    ['podium', 'Les classements se calculent tout seuls'],
    ['chrono', 'Chaque pilote voit ses résultats'],
  ],
  spectateur: [
    ['drapeau', 'Toutes les manches des courses'],
    ['podium', "Les classements à l'arrivée"],
    ['chrono', 'Les positions à chaque intermédiaire'],
  ],
};

const ICONES = {
  chrono: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5"/><path d="M9.5 2.5h5"/><path d="M12 2.5V6"/>',
  podium: '<path d="M9 21V9h6v12"/><path d="M3 21v-7h6"/><path d="M15 21v-5h6v5"/><path d="M2 21h20"/>',
  ecart: '<path d="M4 7h16"/><path d="M4 17h9"/><path d="M17 14l3 3-3 3"/>',
  fichier: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/>',
  drapeau: '<path d="M5 21V3.5"/><path d="M5 4h13l-2.5 4.5L18 13H5"/>',
};

function etapesVisite(profil) {
  const type = profil.type_compte;
  const pilote = type === 'pilote';
  const orga = type === 'organisateur';
  const liste = [];
  if (pilote && profil.plaque) {
    liste.push({
      cible: '#entete-plaque', onglet: 'accueil', titre: 'Ta plaque',
      texte: "Ton numéro de plaque reste toujours en haut. C'est grâce à lui qu'on retrouve tes manches.",
    });
  }
  liste.push({
    cible: '.onglets a[data-onglet="accueil"]', onglet: 'accueil', titre: 'Accueil',
    texte: pilote ? 'Tes dernières manches et tes résultats, dès la fin de ta course.'
      : orga ? 'Les manches que tu as importées, et ce qui t’attend.'
        : 'Les derniers résultats, dès la fin des manches.',
  });
  liste.push({
    cible: '.onglets a[data-onglet="entrainement"]', onglet: 'entrainement', titre: 'Entraînement',
    texte: pilote ? 'Tes tours d’entraînement, avec ton temps à chaque ligne. Pratique pour voir tes progrès.'
      : 'Les tours d’entraînement, avec les temps à chaque ligne.',
  });
  liste.push({
    cible: '.onglets a[data-onglet="competition"]', onglet: 'competition', titre: 'Compétition',
    texte: 'Toutes les manches des courses, avec le classement et les positions à chaque intermédiaire.',
  });
  liste.push({
    cible: '.onglets a[data-onglet="profil"]', onglet: 'profil', titre: 'Mon profil',
    texte: 'Ta page et tes infos. Tu peux les modifier, et revoir ce tuto quand tu veux.',
  });
  return liste;
}

// ---------- Construction de l'écran ----------

function creerCouche() {
  const couche = document.createElement('div');
  couche.className = 'tuto';
  couche.setAttribute('role', 'dialog');
  couche.setAttribute('aria-modal', 'true');
  couche.setAttribute('aria-label', 'Découverte de DBSpeed');
  couche.innerHTML = `
    <div class="tuto-voile"></div>
    <div class="tuto-projecteur" aria-hidden="true"></div>
    <div class="tuto-carte" hidden></div>
    <div class="tuto-bulle" hidden></div>`;
  document.body.appendChild(couche);
  return {
    couche,
    voile: couche.querySelector('.tuto-voile'),
    projecteur: couche.querySelector('.tuto-projecteur'),
    carte: couche.querySelector('.tuto-carte'),
    bulle: couche.querySelector('.tuto-bulle'),
  };
}

function progression(numero, total) {
  let traits = '';
  for (let i = 1; i <= total; i += 1) {
    traits += `<span class="${i < numero ? 'fait' : i === numero ? 'actuel' : ''}"></span>`;
  }
  return `<div class="tuto-progression" aria-label="Étape ${numero} sur ${total}">${traits}</div>`;
}

// ---------- Le tuto ----------

export function lancerTuto({ profil, enregistrer, allerOnglet, depart = 'debut' }) {
  return new Promise((terminer) => {
    const el = creerCouche();
    let visite = etapesVisite(profil);
    let total = 2 + visite.length + 1;   // bienvenue + infos + visite + fin
    let indexVisite = 0;
    let fini = false;
    let cibleActuelle = null;

    document.documentElement.classList.add('tuto-ouvert');

    // ----- cartes (bienvenue, infos, fin) -----

    async function montrerCarte(html, apresAffichage) {
      el.bulle.hidden = true;
      el.couche.classList.remove('mode-visite');
      el.voile.classList.add('allume');
      el.projecteur.classList.remove('allume');
      cibleActuelle = null;
      if (!el.carte.hidden) {
        el.carte.classList.add('sort');
        await attendre(160);
      }
      el.carte.innerHTML = html;
      el.carte.hidden = false;
      el.carte.classList.remove('sort', 'entre');
      void el.carte.offsetWidth;
      el.carte.classList.add('entre');
      el.carte.scrollTop = 0;
      apresAffichage?.();
    }

    function bienvenue() {
      const p = prenom(profil.nom);
      const points = (POINTS_BIENVENUE[profil.type_compte] || POINTS_BIENVENUE.spectateur)
        .map(([icone, texte]) => `
          <li><span class="tuto-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[icone]}</svg></span>${echapper(texte)}</li>`)
        .join('');
      montrerCarte(`
        ${progression(1, total)}
        <div class="feux" aria-hidden="true"><span class="rouge"></span><span class="jaune"></span><span class="jaune"></span><span class="vert"></span></div>
        <h2 class="tuto-titre">Bienvenue${p ? ` <span class="or-brillant">${echapper(p)}</span>` : ''} !</h2>
        <p class="tuto-texte">En une minute, on remplit ton profil et on fait le tour de l'appli.</p>
        <ul class="tuto-points">${points}</ul>
        <div class="tuto-actions">
          <button type="button" class="bouton bouton-principal bouton-or" data-action="suivant">C'est parti</button>
        </div>`, () => {
        el.carte.querySelector('[data-action="suivant"]').addEventListener('click', infos);
        el.carte.querySelector('[data-action="suivant"]').focus({ preventScroll: true });
      });
    }

    function infos() {
      const type = profil.type_compte;
      const pilote = type === 'pilote';
      const orga = type === 'organisateur';
      const puces = CATEGORIES.map((c) => `
        <label class="puce touchable">
          <input type="radio" name="categorie" value="${echapper(c)}" ${profil.categorie === c ? 'checked' : ''}>
          <span>${echapper(c)}</span>
        </label>`).join('');
      montrerCarte(`
        ${progression(2, total)}
        <h2 class="tuto-titre">Tes infos</h2>
        <p class="tuto-texte">${pilote ? 'Pour te retrouver sur les résultats de chaque manche.'
          : orga ? 'Pour que les pilotes sachent qui organise la course.'
            : 'Pour personnaliser ton appli.'}</p>
        <p class="message" role="alert" id="tuto-message"></p>
        <form id="tuto-form" novalidate>
          <div class="champ">
            <label for="tuto-nom">Prénom et nom</label>
            <input type="text" id="tuto-nom" autocomplete="name" maxlength="80" value="${echapper(profil.nom)}">
          </div>
          ${pilote ? `
          <div class="champ">
            <label for="tuto-plaque">Numéro de plaque</label>
            <input type="text" id="tuto-plaque" inputmode="numeric" maxlength="10" autocomplete="off" value="${echapper(profil.plaque)}">
            <span class="aide">Le numéro sur ta plaque de vélo.</span>
          </div>
          <fieldset class="champ puces">
            <legend>Ta catégorie <span class="facultatif">(si tu la connais)</span></legend>
            <div class="puces-liste">${puces}</div>
          </fieldset>` : ''}
          <div class="champ">
            <label for="tuto-club">${pilote ? 'Ton club' : orga ? 'Le club ou la structure qui organise' : 'Le club que tu suis'}${orga ? '' : ' <span class="facultatif">(facultatif)</span>'}</label>
            <input type="text" id="tuto-club" maxlength="80" autocomplete="organization" value="${echapper(profil.club)}">
          </div>
          <div class="tuto-actions">
            <button type="submit" class="bouton bouton-principal bouton-or">Continuer</button>
            <button type="button" class="tuto-lien" data-action="retour">Retour</button>
          </div>
        </form>`, () => {
        const form = el.carte.querySelector('#tuto-form');
        const zone = el.carte.querySelector('#tuto-message');
        const erreur = (texte, champ) => {
          zone.textContent = texte;
          zone.className = 'message erreur';
          vibrer('erreur');
          champ?.focus();
        };
        el.carte.querySelector('[data-action="retour"]').addEventListener('click', bienvenue);
        // dès qu'on corrige, le message d'erreur disparaît
        form.addEventListener('input', () => { zone.textContent = ''; zone.className = 'message'; });
        // re-toucher la catégorie choisie la décoche (elle est facultative)
        form.querySelectorAll('input[name="categorie"]').forEach((radio) => {
          let etaitCoche = false;
          radio.addEventListener('pointerdown', () => { etaitCoche = radio.checked; });
          radio.addEventListener('click', () => { if (etaitCoche) radio.checked = false; });
        });
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          zone.textContent = '';
          zone.className = 'message';
          const nom = form.querySelector('#tuto-nom').value.trim();
          const club = form.querySelector('#tuto-club').value.trim();
          const changements = { nom, club: club || null };
          if (!nom) return erreur('Écris ton prénom et ton nom.', form.querySelector('#tuto-nom'));
          if (pilote) {
            const plaque = form.querySelector('#tuto-plaque').value.trim();
            if (!plaque) return erreur('Écris ton numéro de plaque.', form.querySelector('#tuto-plaque'));
            changements.plaque = plaque;
            changements.categorie = form.querySelector('input[name="categorie"]:checked')?.value || null;
          }
          if (orga && !club) return erreur('Écris le nom du club ou de la structure.', form.querySelector('#tuto-club'));
          const bouton = form.querySelector('button[type="submit"]');
          bouton.disabled = true;
          bouton.textContent = 'Enregistrement…';
          const probleme = await enregistrer(changements);
          bouton.disabled = false;
          bouton.textContent = 'Continuer';
          if (probleme) return erreur(probleme);
          // le profil vient d'être mis à jour : on recalcule la visite (ex. la plaque)
          visite = etapesVisite(profil);
          total = 2 + visite.length + 1;
          indexVisite = 0;
          lancerVisite();
        });
      });
    }

    // ----- visite guidée avec le projecteur -----

    function lancerVisite() {
      el.carte.classList.add('sort');
      setTimeout(() => { el.carte.hidden = true; }, calme ? 0 : 160);
      el.voile.classList.remove('allume');
      el.couche.classList.add('mode-visite');
      montrerVisite();
    }

    function placer() {
      if (!cibleActuelle) return;
      const r = cibleActuelle.getBoundingClientRect();
      const marge = 6;
      const p = el.projecteur.style;
      p.left = `${r.left - marge}px`;
      p.top = `${r.top - marge}px`;
      p.width = `${r.width + marge * 2}px`;
      p.height = `${r.height + marge * 2}px`;

      // la bulle : au-dessus si la cible est en bas de l'écran, sinon en dessous
      const largeur = Math.min(360, window.innerWidth - 32);
      const centre = r.left + r.width / 2;
      const gauche = Math.max(16, Math.min(window.innerWidth - largeur - 16, centre - largeur / 2));
      const b = el.bulle.style;
      b.width = `${largeur}px`;
      b.left = `${gauche}px`;
      el.bulle.style.setProperty('--fleche', `${Math.max(24, Math.min(largeur - 24, centre - gauche))}px`);
      if (r.top > window.innerHeight / 2) {
        el.bulle.dataset.cote = 'dessus';
        b.top = 'auto';
        b.bottom = `${window.innerHeight - r.top + marge + 16}px`;
      } else {
        el.bulle.dataset.cote = 'dessous';
        b.bottom = 'auto';
        b.top = `${r.bottom + marge + 16}px`;
      }
    }

    async function montrerVisite() {
      const etape = visite[indexVisite];
      const numero = 3 + indexVisite;
      const derniere = indexVisite === visite.length - 1;

      el.bulle.classList.remove('entre');
      if (etape.onglet) allerOnglet(etape.onglet);
      cibleActuelle = document.querySelector(etape.cible);
      if (!cibleActuelle || cibleActuelle.hidden) return suivantVisite();   // élément absent : on passe
      window.scrollTo(0, 0);   // la cible doit être bien visible à l'écran
      el.projecteur.classList.add('allume');
      placer();
      await attendre(el.bulle.hidden ? 120 : 260);   // le projecteur glisse vers la nouvelle cible

      el.bulle.innerHTML = `
        ${progression(numero, total)}
        <h3 class="tuto-bulle-titre">${echapper(etape.titre)}</h3>
        <p class="tuto-bulle-texte">${echapper(etape.texte)}</p>
        <div class="tuto-bulle-actions">
          <button type="button" class="tuto-lien" data-action="passer">Passer</button>
          <button type="button" class="bouton bouton-principal bouton-or" data-action="suivant">${derniere ? 'Terminer' : 'Suivant'}</button>
        </div>`;
      el.bulle.hidden = false;
      placer();
      void el.bulle.offsetWidth;
      el.bulle.classList.add('entre');
      el.bulle.querySelector('[data-action="suivant"]').addEventListener('click', suivantVisite);
      el.bulle.querySelector('[data-action="passer"]').addEventListener('click', finir);
      el.bulle.querySelector('[data-action="suivant"]').focus({ preventScroll: true });
    }

    function suivantVisite() {
      if (indexVisite < visite.length - 1) {
        indexVisite += 1;
        montrerVisite();
      } else {
        bravo();
      }
    }

    // toucher la zone éclairée = passer à la suite
    el.projecteur.addEventListener('click', () => { vibrer('leger'); suivantVisite(); });

    // ----- fin -----

    function bravo() {
      vibrer('fort');
      allerOnglet('accueil');
      const pilote = profil.type_compte === 'pilote';
      montrerCarte(`
        ${progression(total, total)}
        <div class="tuto-damier" aria-hidden="true"></div>
        <h2 class="tuto-titre">Tu es <span class="or-brillant">prêt</span> !</h2>
        <p class="tuto-texte">${pilote
          ? 'Roule à fond : tes temps arriveront ici juste après ta prochaine manche.'
          : 'Les manches et les classements arriveront ici après la prochaine course.'}</p>
        <div class="tuto-actions">
          <button type="button" class="bouton bouton-principal bouton-or" data-action="fin">Commencer</button>
        </div>`, () => {
        el.carte.querySelector('[data-action="fin"]').addEventListener('click', finir);
        el.carte.querySelector('[data-action="fin"]').focus({ preventScroll: true });
      });
    }

    async function finir() {
      if (fini) return;
      fini = true;
      window.removeEventListener('resize', placer);
      window.removeEventListener('keydown', clavier);
      allerOnglet(depart === 'visite' ? 'profil' : 'accueil');
      el.couche.classList.add('ferme');
      document.documentElement.classList.remove('tuto-ouvert');
      if (!profil.tuto_fini) enregistrer({ tuto_fini: true });   // pas grave si ça échoue : il reviendra la prochaine fois
      await attendre(260);
      el.couche.remove();
      terminer();
    }

    function clavier(e) {
      if (e.key === 'Escape' && el.couche.classList.contains('mode-visite')) finir();
    }

    window.addEventListener('resize', placer);
    window.addEventListener('keydown', clavier);

    if (depart === 'visite') {
      el.voile.classList.remove('allume');
      el.couche.classList.add('mode-visite');
      montrerVisite();
    } else {
      bienvenue();
    }
  });
}
