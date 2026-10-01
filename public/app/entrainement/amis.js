// DBSpeed — « Mes amis » (dans l'onglet Mon profil)
// Chercher un pilote (plaque ou nom), lui demander d'être ami, accepter / refuser une demande, retirer un ami.
// Les amis voient les meilleurs tours des uns et des autres dans l'onglet Entraînement.
import { messageErreur } from '/app/supabase.js';
import { esc } from '/app/outils.js';
const LOUPE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>';
const CROIX = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

function plaque(p) {
  return p.plaque
    ? `<span class="plaque-petite">${esc(p.plaque)}</span>`
    : '<span class="plaque-petite vide-plaque">?</span>';
}

export function afficherAmis(zone, { supabase }) {
  zone.innerHTML = `
    <h2>Mes amis</h2>
    <p class="astuce">Tes amis voient tes meilleurs tours d'entraînement, et toi les leurs, pour comparer vos intermédiaires.</p>
    <label class="recherche">
      ${LOUPE}
      <input type="search" id="amis-recherche" placeholder="Numéro de plaque ou nom d'un pilote" autocomplete="off" enterkeyhint="search" aria-label="Chercher un pilote">
      <button type="button" class="effacer" id="amis-effacer" aria-label="Effacer" hidden>${CROIX}</button>
    </label>
    <p id="amis-message" class="message" role="status"></p>
    <ul id="amis-trouves" class="amis-liste" aria-live="polite"></ul>
    <div id="amis-mes"></div>`;

  const champ = zone.querySelector('#amis-recherche');
  const effacer = zone.querySelector('#amis-effacer');
  const trouves = zone.querySelector('#amis-trouves');
  const mes = zone.querySelector('#amis-mes');
  const message = zone.querySelector('#amis-message');

  const dire = (texte, genre = 'erreur') => {
    message.textContent = texte;
    message.className = `message ${genre}`;
    if (texte) window.vibrer?.(genre === 'erreur' ? 'erreur' : 'fort');
  };

  // ---- Mes amis et les demandes ----
  async function chargerMes() {
    const { data, error } = await supabase.rpc('mes_amis');
    if (error) {
      mes.innerHTML = `<div class="vide"><strong>Impossible de charger tes amis.</strong>${esc(messageErreur(error))}</div>`;
      return;
    }
    const recus = data.filter((a) => a.statut === 'recu');
    const amis = data.filter((a) => a.statut === 'ami');
    const envoyes = data.filter((a) => a.statut === 'envoye');
    const ligne = (a, k, actions) => `<li class="ami ${a.statut}" style="--k:${k}">
      ${plaque(a)}
      <span class="ami-texte"><strong>${esc(a.nom || 'Pilote')}</strong><small>${esc(a.club || (a.statut === 'envoye' ? 'Demande envoyée' : 'Pilote'))}</small></span>
      <span class="ami-actions">${actions}</span>
    </li>`;
    mes.innerHTML = `
      ${recus.length ? `<p class="amis-titre">Demandes reçues</p><ul class="amis-liste">${recus.map((a, k) => ligne(a, k,
        `<button type="button" data-refuser="${a.lien}">Refuser</button><button type="button" class="oui" data-accepter="${a.lien}">Accepter</button>`)).join('')}</ul>` : ''}
      <p class="amis-titre">${amis.length ? `${amis.length} ami${amis.length > 1 ? 's' : ''}` : 'Tes amis'}</p>
      ${amis.length ? `<ul class="amis-liste">${amis.map((a, k) => ligne(a, k, `<button type="button" data-retirer="${a.lien}" aria-label="Retirer ${esc(a.nom || 'cet ami')}">Retirer</button>`)).join('')}</ul>`
        : '<div class="vide"><strong>Pas encore d\'ami.</strong>Cherche un pilote avec son numéro de plaque ou son nom.</div>'}
      ${envoyes.length ? `<p class="amis-titre">En attente de réponse</p><ul class="amis-liste">${envoyes.map((a, k) => ligne(a, k, `<button type="button" data-retirer="${a.lien}">Annuler</button>`)).join('')}</ul>` : ''}`;

    const action = async (bouton, appel, texte) => {
      bouton.disabled = true;
      const { error: err } = await appel();
      if (err) { bouton.disabled = false; dire(messageErreur(err)); return; }
      dire(texte, 'ok');
      await chargerMes();
      if (champ.value.trim()) chercher();
    };
    mes.querySelectorAll('[data-accepter]').forEach((b) => b.addEventListener('click', () =>
      action(b, () => supabase.rpc('repondre_ami', { p_lien: b.dataset.accepter, p_accepter: true }), 'C\'est fait, vous êtes amis !')));
    mes.querySelectorAll('[data-refuser]').forEach((b) => b.addEventListener('click', () =>
      action(b, () => supabase.rpc('repondre_ami', { p_lien: b.dataset.refuser, p_accepter: false }), 'Demande refusée.')));
    mes.querySelectorAll('[data-retirer]').forEach((b) => b.addEventListener('click', () => {
      // premier appui : on demande de confirmer ; deuxième appui (dans les 4 s) : on retire
      if (!b.dataset.sur) {
        b.dataset.sur = '1';
        b.dataset.texte = b.textContent;
        b.textContent = 'Sûr ?';
        b.classList.add('oui');
        setTimeout(() => { if (b.isConnected) { delete b.dataset.sur; b.textContent = b.dataset.texte; b.classList.remove('oui'); } }, 4000);
        return;
      }
      action(b, () => supabase.rpc('retirer_ami', { p_lien: b.dataset.retirer }), 'C\'est fait.');
    }));
  }

  // ---- Chercher un pilote ----
  let minuteur = null;
  let numero = 0;
  async function chercher() {
    const texte = champ.value.trim();
    const moi = ++numero;
    if (!texte) { trouves.innerHTML = ''; return; }
    const { data, error } = await supabase.rpc('chercher_pilotes', { p_texte: texte });
    if (moi !== numero) return;
    if (error) { trouves.innerHTML = ''; dire(messageErreur(error)); return; }
    if (!data.length) {
      trouves.innerHTML = `<li class="vide"><strong>Aucun pilote trouvé.</strong>Vérifie le numéro de plaque, ou écris au moins 2 lettres du nom.</li>`;
      return;
    }
    const etats = { ami: 'Déjà ami', envoye: 'Demande envoyée' };
    trouves.innerHTML = data.map((p, k) => `<li class="ami" style="--k:${k}">
      ${plaque(p)}
      <span class="ami-texte"><strong>${esc(p.nom || 'Pilote')}</strong><small>${esc(p.club || 'Pilote')}</small></span>
      ${etats[p.lien] ? `<span class="ami-etat">${etats[p.lien]}</span>`
        : `<span class="ami-actions"><button type="button" class="oui" data-demander="${p.id}">${p.lien === 'recu' ? 'Accepter' : 'Ajouter'}</button></span>`}
    </li>`).join('');
    trouves.querySelectorAll('[data-demander]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      const { data: rep, error: err } = await supabase.rpc('demander_ami', { p_pilote: b.dataset.demander });
      if (err) { b.disabled = false; dire(messageErreur(err)); return; }
      dire(rep === 'ami' ? 'C\'est fait, vous êtes amis !' : 'Demande envoyée. Il doit l\'accepter dans son profil.', 'ok');
      await chargerMes();
      chercher();
    }));
  }

  champ.addEventListener('input', () => {
    effacer.hidden = !champ.value;
    dire('');
    clearTimeout(minuteur);
    minuteur = setTimeout(chercher, 300);
  });
  champ.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); champ.blur(); chercher(); } });
  effacer.addEventListener('click', () => { champ.value = ''; effacer.hidden = true; trouves.innerHTML = ''; champ.focus(); });

  chargerMes();
}
