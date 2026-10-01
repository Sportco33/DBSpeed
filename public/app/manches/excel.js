// DBSpeed — lire un fichier de temps (Excel .xlsx ou .csv), sans bibliothèque externe.
// Un .xlsx est un dossier compressé (zip) qui contient des fichiers XML :
// on ouvre le zip, on lit la feuille, puis on transforme les lignes en manches.
// Marche dans le navigateur et dans Node (pour les tests).
//
//   const { lignes, manches, erreurs, avertissements } = await lireFichierTemps(fichier)
//   - lignes : noms des lignes après le départ (ex. ['Inter 1', 'Inter 2', 'Inter 3', 'Arrivée'])
//   - manches : [{ numero, categorie, pilotes: [{ plaque, pilote, couloir, temps: [...] }] }]
//     (temps = secondes depuis la chute de la grille, à chaque ligne ; null = pas passé)

export const MAX_PILOTES = 8;
export const MAX_LIGNES = 12;
const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo : largement assez pour une journée de course

// ---------- 1. Ouvrir le zip ----------

async function decompresser(octets) {
  const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

// Renvoie { 'xl/workbook.xml': async () => texte, … }
function ouvrirZip(buffer) {
  const v = new DataView(buffer);
  const octets = new Uint8Array(buffer);
  // la « fin du répertoire » est tout au bout du fichier
  let fin = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error('pas-un-zip');
  const nombre = v.getUint16(fin + 10, true);
  let pos = v.getUint32(fin + 16, true);
  const fichiers = {};
  const texte = new TextDecoder('utf-8');
  for (let n = 0; n < nombre; n++) {
    if (v.getUint32(pos, true) !== 0x02014b50) throw new Error('zip-abime');
    const methode = v.getUint16(pos + 10, true);
    const tailleComp = v.getUint32(pos + 20, true);
    const lgNom = v.getUint16(pos + 28, true);
    const lgExtra = v.getUint16(pos + 30, true);
    const lgComm = v.getUint16(pos + 32, true);
    const debutLocal = v.getUint32(pos + 42, true);
    const nom = texte.decode(octets.subarray(pos + 46, pos + 46 + lgNom));
    fichiers[nom] = async () => {
      const debut = debutLocal + 30 + v.getUint16(debutLocal + 26, true) + v.getUint16(debutLocal + 28, true);
      const brut = octets.subarray(debut, debut + tailleComp);
      const contenu = methode === 0 ? brut : methode === 8 ? await decompresser(brut) : null;
      if (!contenu) throw new Error('zip-methode');
      return texte.decode(contenu);
    };
    pos += 46 + lgNom + lgExtra + lgComm;
  }
  return fichiers;
}

// ---------- 2. Lire le XML d'Excel ----------

const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decoderXml(t) {
  return t.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (tout, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITES[e] ?? tout;
  });
}

function attributs(texte) {
  const a = {};
  for (const [, cle, valeur] of texte.matchAll(/([\w:]+)\s*=\s*"([^"]*)"/g)) a[cle] = decoderXml(valeur);
  return a;
}

// Le texte d'un bloc <si> ou <is> (on ignore la prononciation japonaise <rPh>)
function texteRiche(xml) {
  return decoderXml([...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''));
}

function colonneDe(ref) {
  let n = 0;
  for (const c of ref.replace(/\d+$/, '').toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

async function lireXlsx(buffer) {
  const zip = ouvrirZip(buffer);
  if (!zip['xl/workbook.xml']) throw new Error('pas-excel');
  const classeur = await zip['xl/workbook.xml']();
  const liens = zip['xl/_rels/workbook.xml.rels'] ? await zip['xl/_rels/workbook.xml.rels']() : '';
  const cibles = {};
  for (const [, a] of liens.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const r = attributs(a);
    cibles[r.Id] = r.Target?.startsWith('/') ? r.Target.slice(1) : `xl/${r.Target}`;
  }
  const feuilles = [...classeur.matchAll(/<sheet\b([^>]*)\/?>/g)].map(([, a]) => {
    const r = attributs(a);
    return { nom: r.name, chemin: cibles[r['r:id']] };
  }).filter((f) => f.chemin && zip[f.chemin]);
  if (!feuilles.length) throw new Error('pas-de-feuille');

  const partages = zip['xl/sharedStrings.xml']
    ? [...(await zip['xl/sharedStrings.xml']()).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => texteRiche(m[1]))
    : [];

  const lireFeuille = async (f) => {
    const xml = await zip[f.chemin]();
    const lignes = [];
    for (const [, aLigne, contenu] of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const numero = Number(attributs(aLigne).r) || lignes.length + 1;
      const cases = [];
      for (const [, aCase, interieur = ''] of (contenu || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const a = attributs(aCase);
        const v = interieur.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
        let valeur = null;
        if (a.t === 's') valeur = partages[Number(v)] ?? '';
        else if (a.t === 'inlineStr') valeur = texteRiche(interieur);
        else if (a.t === 'str' || a.t === 'e') valeur = v == null ? null : decoderXml(v);
        else if (a.t === 'b') valeur = v === '1';
        else if (v != null) valeur = Number(v);
        cases[a.r ? colonneDe(a.r) : cases.length] = valeur;
      }
      lignes[numero - 1] = cases;
    }
    return Array.from(lignes, (l) => l || []);
  };

  // la feuille « Temps » si elle existe, sinon la première qui a une colonne « Plaque »
  const parNom = feuilles.find((f) => normaliser(f.nom) === 'temps');
  if (parNom) return { feuille: parNom.nom, tableau: await lireFeuille(parNom) };
  for (const f of feuilles) {
    const tableau = await lireFeuille(f);
    if (trouverEntete(tableau)) return { feuille: f.nom, tableau };
  }
  return { feuille: feuilles[0].nom, tableau: await lireFeuille(feuilles[0]) };
}

// ---------- 3. Lire un CSV ----------

function lireCsv(buffer) {
  let texte = new TextDecoder('utf-8').decode(buffer);
  if (texte.includes('�')) texte = new TextDecoder('windows-1252').decode(buffer); // vieux Excel français
  texte = texte.replace(/^﻿/, '');
  const premiere = texte.split(/\r?\n/, 1)[0];
  const sep = [';', '\t', ','].sort((a, b) => premiere.split(b).length - premiere.split(a).length)[0];
  const lignes = [];
  let ligne = [];
  let cellule = '';
  let guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') { cellule += '"'; i++; }
      else if (c === '"') guillemets = false;
      else cellule += c;
    } else if (c === '"') guillemets = true;
    else if (c === sep) { ligne.push(cellule); cellule = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texte[i + 1] === '\n') i++;
      ligne.push(cellule); lignes.push(ligne); ligne = []; cellule = '';
    } else cellule += c;
  }
  if (cellule || ligne.length) { ligne.push(cellule); lignes.push(ligne); }
  return { feuille: null, tableau: lignes };
}

// ---------- 4. Comprendre le tableau ----------

export function normaliser(t) {
  return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[°º.:()_#-]/g, ' ').replace(/\s+/g, ' ').trim();
}

// À quoi sert une colonne, d'après son titre
function roleColonne(titre) {
  const t = normaliser(titre);
  if (!t) return null;
  if (/^(manche|course|heat|race|serie|moto|n manche|num manche|numero manche)\b/.test(t)) return 'manche';
  if (/^(plaque|dossard|bib|plate|n plaque|num plaque|numero plaque)\b/.test(t)) return 'plaque';
  if (/^(prenom|first name)\b/.test(t)) return 'prenom';
  if (/^(pilote|nom|name|rider|coureur|last name)\b/.test(t)) return 'pilote';
  if (/^(couloir|lane|gate|porte)\b/.test(t)) return 'couloir';
  if (/^(categorie|category|cat|classe)\b/.test(t)) return 'categorie';
  if (/^(depart|start|grille|t0)\b/.test(t)) return 'depart';
  if (/^(inter|intermediaire|split|i ?\d|ligne|l ?\d|secteur|passage|arrivee|arrive|finish|fin|temps final|temps)\b/.test(t)) return 'temps';
  return null;
}

function trouverEntete(tableau) {
  for (let i = 0; i < Math.min(tableau.length, 20); i++) {
    const roles = (tableau[i] || []).map(roleColonne);
    if (roles.includes('plaque')) return { index: i, roles };
  }
  return null;
}

const vide = (v) => v == null || (typeof v === 'string' && v.trim() === '');
const MOTS_ABSENT = /^(-+|—|dnf|dns|dsq|ab|abd|abandon|chute|x|na|n\/a)$/i;

// « 36.254 », « 36,254 », « 0:36.254 », « 1:02.5 » → secondes. undefined = illisible.
export function lireTemps(v) {
  if (vide(v)) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 1000) / 1000 : undefined;
  const t = String(v).trim().replace(',', '.');
  if (MOTS_ABSENT.test(t)) return null;
  const m = t.match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  if (!m) return undefined;
  return Math.round(((m[1] ? Number(m[1]) * 60 : 0) + Number(m[2])) * 1000) / 1000;
}

const texteCase = (v) => (vide(v) ? '' : typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : String(v).trim());

// Transforme les lignes du tableau en manches. Les numéros de ligne des messages
// sont ceux qu'on voit dans Excel (1 = première ligne).
export function analyserTableau(tableau) {
  const erreurs = [];
  const avertissements = [];
  const resultat = { lignes: [], manches: [], erreurs, avertissements };

  const entete = trouverEntete(tableau);
  if (!entete) {
    erreurs.push('Je ne trouve pas la colonne « Plaque ». La première ligne doit avoir les titres : Manche, Plaque, Pilote, Couloir, Départ, Inter 1…, Arrivée.');
    return resultat;
  }
  const titres = tableau[entete.index];
  const col = (role) => entete.roles.indexOf(role);
  const cDepart = col('depart');
  // colonnes de temps : celles qui en ont le nom, et toutes les colonnes sans rôle après « Départ »
  const cTemps = entete.roles
    .map((r, i) => ({ r, i }))
    .filter(({ r, i }) => r === 'temps' || (r === null && cDepart >= 0 && i > cDepart && !vide(titres[i])))
    .map(({ i }) => i);
  if (!cTemps.length) {
    erreurs.push('Je ne trouve pas les colonnes de temps (Inter 1, Inter 2…, Arrivée). Mets-les après la colonne « Départ ».');
    return resultat;
  }
  if (cTemps.length > MAX_LIGNES) {
    erreurs.push(`Trop de lignes de chronométrage (${cTemps.length}) : ${MAX_LIGNES} au maximum.`);
    return resultat;
  }
  resultat.lignes = cTemps.map((i) => texteCase(titres[i]).slice(0, 30));
  const cManche = col('manche');
  const cCategorie = col('categorie');

  const parManche = new Map();
  for (let i = entete.index + 1; i < tableau.length; i++) {
    const l = tableau[i] || [];
    const ligneExcel = i + 1;
    if (l.every(vide)) continue;
    const plaque = texteCase(l[col('plaque')]);
    if (!plaque) {
      // une ligne de commentaire sans plaque ni temps : on l'ignore
      if (cTemps.every((c) => vide(l[c]))) continue;
      erreurs.push(`Ligne ${ligneExcel} : il manque la plaque.`);
      continue;
    }
    if (plaque.length > 10) { erreurs.push(`Ligne ${ligneExcel} : plaque trop longue (« ${plaque.slice(0, 20)} »).`); continue; }

    let numero = 1;
    if (cManche >= 0) {
      const brut = texteCase(l[cManche]);
      const chiffres = brut.match(/\d+/);
      if (!chiffres) { erreurs.push(`Ligne ${ligneExcel} : numéro de manche manquant ou illisible (« ${brut} »).`); continue; }
      numero = Number(chiffres[0]);
    }
    const categorie = cCategorie >= 0 ? texteCase(l[cCategorie]).slice(0, 40) || null : null;

    // départ : 0 en général ; si c'est une heure (transpondeurs), on part de là
    const depart = cDepart >= 0 ? lireTemps(l[cDepart]) : 0;
    if (depart === undefined) { erreurs.push(`Ligne ${ligneExcel} : temps de départ illisible (« ${texteCase(l[cDepart])} »).`); continue; }

    const temps = [];
    let illisible = false;
    for (const c of cTemps) {
      const t = lireTemps(l[c]);
      if (t === undefined) {
        erreurs.push(`Ligne ${ligneExcel}, colonne « ${texteCase(titres[c])} » : temps illisible (« ${texteCase(l[c])} »). Écris par exemple 36.254 ou 0:36.254.`);
        illisible = true;
        break;
      }
      temps.push(t == null ? null : Math.round((t - (depart || 0)) * 1000) / 1000);
    }
    if (illisible) continue;
    if (temps.some((t) => t != null && (t <= 0 || t >= 600))) {
      erreurs.push(`Ligne ${ligneExcel} (plaque ${plaque}) : un temps est impossible (il doit être entre 0 et 600 secondes après le départ).`);
      continue;
    }
    const passes = temps.filter((t) => t != null);
    if (passes.some((t, k) => k > 0 && t <= passes[k - 1])) {
      erreurs.push(`Ligne ${ligneExcel} (plaque ${plaque}) : un temps est plus petit que celui de la ligne d'avant. Vérifie l'ordre des colonnes.`);
      continue;
    }

    let couloir = null;
    if (col('couloir') >= 0 && !vide(l[col('couloir')])) {
      const n = Number(texteCase(l[col('couloir')]));
      if (Number.isInteger(n) && n >= 1 && n <= 8) couloir = n;
      else avertissements.push(`Ligne ${ligneExcel} : couloir « ${texteCase(l[col('couloir')])} » ignoré (il doit aller de 1 à 8).`);
    }
    let pilote = col('pilote') >= 0 ? texteCase(l[col('pilote')]) : '';
    if (col('prenom') >= 0) pilote = [texteCase(l[col('prenom')]), pilote].filter(Boolean).join(' ');

    const cle = `${categorie ?? ''}|${numero}`;
    if (!parManche.has(cle)) parManche.set(cle, { numero, categorie, pilotes: [], lignesExcel: [] });
    const manche = parManche.get(cle);
    if (manche.pilotes.some((p) => p.plaque === plaque)) {
      erreurs.push(`Ligne ${ligneExcel} : la plaque ${plaque} est déjà dans la manche ${numero}${categorie ? ` (${categorie})` : ''}.`);
      continue;
    }
    manche.pilotes.push({ plaque, pilote: pilote.slice(0, 80) || null, couloir, temps });
    manche.lignesExcel.push(ligneExcel);
  }

  for (const m of parManche.values()) {
    if (m.pilotes.length > MAX_PILOTES) {
      erreurs.push(`Manche ${m.numero}${m.categorie ? ` (${m.categorie})` : ''} : ${m.pilotes.length} pilotes. Une manche a ${MAX_PILOTES} pilotes au maximum${cManche < 0 ? ' : ajoute une colonne « Manche »' : ''}.`);
    }
    const couloirs = m.pilotes.map((p) => p.couloir).filter(Boolean);
    if (new Set(couloirs).size < couloirs.length) {
      avertissements.push(`Manche ${m.numero}${m.categorie ? ` (${m.categorie})` : ''} : deux pilotes ont le même couloir.`);
    }
    delete m.lignesExcel;
  }
  resultat.manches = [...parManche.values()].sort((a, b) =>
    (a.categorie ?? '').localeCompare(b.categorie ?? '', 'fr') || a.numero - b.numero);
  if (!resultat.manches.length && !erreurs.length) erreurs.push('Le fichier ne contient aucun pilote.');
  if (resultat.manches.length > 500) erreurs.push('Trop de manches dans un seul fichier (500 au maximum).');
  return resultat;
}

// ---------- 5. Tout ensemble ----------

const MESSAGES = {
  'pas-un-zip': "Ce fichier n'est pas un fichier Excel (.xlsx) valide. Dans Excel : Fichier → Enregistrer sous → Classeur Excel (.xlsx) ou CSV.",
  'pas-excel': "Ce fichier n'est pas un classeur Excel. Enregistre-le en .xlsx ou en .csv.",
  'pas-de-feuille': 'Le classeur ne contient aucune feuille lisible.',
};

// fichier : un File du navigateur (ou { name, arrayBuffer() } dans les tests)
export async function lireFichierTemps(fichier) {
  const nom = fichier?.name || '';
  if (fichier?.size > TAILLE_MAX) {
    return { lignes: [], manches: [], erreurs: ['Fichier trop gros (5 Mo au maximum).'], avertissements: [], feuille: null };
  }
  try {
    const buffer = await fichier.arrayBuffer();
    if (/\.xls$/i.test(nom)) throw new Error('pas-excel');
    const debut = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
    const estZip = debut[0] === 0x50 && debut[1] === 0x4b; // « PK » : un zip
    const { feuille, tableau } = estZip ? await lireXlsx(buffer) : lireCsv(buffer);
    return { ...analyserTableau(tableau), feuille };
  } catch (e) {
    return {
      lignes: [], manches: [], avertissements: [], feuille: null,
      erreurs: [MESSAGES[e.message] || "Impossible de lire ce fichier. Enregistre-le en .xlsx ou en .csv et réessaie."],
    };
  }
}
