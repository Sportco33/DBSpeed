// DBSpeed — lire un fichier de temps (Excel .xlsx ou .csv), sans bibliothèque externe.
// Un .xlsx est un dossier compressé (zip) qui contient des fichiers XML :
// on ouvre le zip, on lit la feuille, puis on transforme les lignes en manches.
// Marche dans le navigateur et dans Node (pour les tests).
//
//   const { lignes, manches, erreurs, avertissements } = await lireFichierTemps(fichier)
//   - lignes : noms des lignes après le départ (ex. ['Inter 1', 'Inter 2', 'Inter 3', 'Arrivée'])
//   - manches : [{ numero, nom, categorie, pilotes: [{ plaque, pilote, couloir, temps: [...] }] }]
//     numero : 1, 2, 3… (le numéro écrit dans le fichier, ou l'ordre d'apparition si la manche a un nom)
//     nom : le nom écrit dans le fichier (« 1/4 finale A », « Q2 »…), ou null si c'est juste un numéro
//     temps : secondes depuis la chute de la grille, à chaque ligne ; null = pas passé

export const MAX_PILOTES = 8;
export const MAX_LIGNES = 12;
const TAILLE_MAX = 5 * 1024 * 1024;        // 5 Mo : largement assez pour une journée de course
const TAILLE_OUVERTE_MAX = 40 * 1024 * 1024; // une fois décompressé, un morceau du zip ne dépasse pas 40 Mo

// ---------- 1. Ouvrir le zip ----------

// Décompresse en s'arrêtant si ça devient trop gros (un faux fichier peut gonfler à plusieurs Go)
async function decompresser(octets) {
  const lecteur = new Blob([octets]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const morceaux = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > TAILLE_OUVERTE_MAX) {
      lecteur.cancel().catch(() => {});
      throw new Error('trop-gros-ouvert');
    }
    morceaux.push(value);
  }
  const tout = new Uint8Array(total);
  let pos = 0;
  for (const m of morceaux) { tout.set(m, pos); pos += m.byteLength; }
  return tout;
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
    if (pos + 46 > buffer.byteLength || v.getUint32(pos, true) !== 0x02014b50) throw new Error('zip-abime');
    const methode = v.getUint16(pos + 10, true);
    const tailleComp = v.getUint32(pos + 20, true);
    const tailleVraie = v.getUint32(pos + 24, true);
    const lgNom = v.getUint16(pos + 28, true);
    const lgExtra = v.getUint16(pos + 30, true);
    const lgComm = v.getUint16(pos + 32, true);
    const debutLocal = v.getUint32(pos + 42, true);
    const nom = texte.decode(octets.subarray(pos + 46, pos + 46 + lgNom));
    fichiers[nom] = async () => {
      if (tailleVraie > TAILLE_OUVERTE_MAX) throw new Error('trop-gros-ouvert');
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
// Les balises peuvent avoir un préfixe (<x:row>, <x:c>…) selon le logiciel qui a écrit le fichier.

const P = '(?:[\\w.-]+:)?'; // préfixe facultatif d'une balise
const balise = (nom, drapeaux = 'g') => new RegExp(`<${P}${nom}\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/${P}${nom}>)`, drapeaux);

const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decoderXml(t) {
  return t.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (tout, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    }
    return ENTITES[e] ?? tout;
  });
}

// Les attributs d'une balise, avec "…" ou '…'
function attributs(texte) {
  const a = {};
  for (const [, cle, d, s] of texte.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) a[cle] = decoderXml(d ?? s);
  return a;
}

// Le texte d'un bloc <si> ou <is> (on ignore la prononciation japonaise <rPh>)
function texteRiche(xml) {
  const sans = (xml || '').replace(balise('rPh'), '');
  return decoderXml([...sans.matchAll(balise('t'))].map((m) => m[2] || '').join(''));
}

function colonneDe(ref) {
  let n = 0;
  for (const c of ref.replace(/\d+$/, '').toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

// Une case avec une formule mais sans résultat enregistré (fichier écrit par un programme)
export const SANS_RESULTAT = Symbol('formule sans résultat');

// Formats de nombre qui sont des heures ou des durées : la valeur est alors une fraction de jour
const FORMATS_HEURE = new Set([18, 19, 20, 21, 22, 45, 46, 47]);
function formatEstHeure(code) {
  const f = String(code || '')
    .replace(/"[^"]*"/g, '')           // texte entre guillemets
    .replace(/\\./g, '')               // caractère précédé de \
    .replace(/_./g, '').replace(/\*./g, '')
    .replace(/\[(?![hms]+\])[^\]]*\]/gi, ''); // [Red], [$-40C]… mais on garde [h], [mm], [ss]
  if (/h|\[[ms]+\]/i.test(f)) return true;
  if (/s/i.test(f) && /m/i.test(f)) return true; // mm:ss
  return /^\s*s+(\.0+)?\s*$/i.test(f);           // ss.000
}

async function lireXlsx(buffer) {
  const zip = ouvrirZip(buffer);
  if (!zip['xl/workbook.xml']) {
    if (zip.mimetype && /opendocument/.test(await zip.mimetype())) throw new Error('ods');
    throw new Error('pas-excel');
  }
  const classeur = await zip['xl/workbook.xml']();
  const liens = zip['xl/_rels/workbook.xml.rels'] ? await zip['xl/_rels/workbook.xml.rels']() : '';
  const cibles = {};
  const parType = {};
  for (const [, a] of liens.matchAll(new RegExp(`<${P}Relationship\\b([^>]*?)\\/?>`, 'g'))) {
    const r = attributs(a);
    if (!r.Target) continue;
    const chemin = r.Target.startsWith('/') ? r.Target.slice(1) : `xl/${r.Target.replace(/^\.\//, '')}`;
    cibles[r.Id] = chemin;
    const type = (r.Type || '').split('/').pop();
    parType[type] ||= chemin;
  }
  const feuilles = [...classeur.matchAll(new RegExp(`<${P}sheet\\b([^>]*?)\\/?>`, 'g'))].map(([, a]) => {
    const r = attributs(a);
    const id = Object.entries(r).find(([k]) => /(^|:)id$/i.test(k) && k !== 'sheetId')?.[1];
    return { nom: r.name || '', chemin: cibles[id], cachee: r.state === 'hidden' || r.state === 'veryHidden' };
  }).filter((f) => f.chemin && zip[f.chemin]);
  if (!feuilles.length) throw new Error('pas-de-feuille');

  const cheminTextes = zip[parType.sharedStrings] ? parType.sharedStrings : 'xl/sharedStrings.xml';
  const partages = zip[cheminTextes]
    ? [...(await zip[cheminTextes]()).matchAll(balise('si'))].map((m) => texteRiche(m[2]))
    : [];

  // Les styles : pour savoir quelles cases sont des heures (36.254 s écrit « 0:00:36.254 »)
  const cheminStyles = zip[parType.styles] ? parType.styles : 'xl/styles.xml';
  const styles = zip[cheminStyles] ? await zip[cheminStyles]() : '';
  const formatsPerso = {};
  for (const [, a] of styles.matchAll(new RegExp(`<${P}numFmt\\b([^>]*?)\\/?>`, 'g'))) {
    const r = attributs(a);
    formatsPerso[Number(r.numFmtId)] = r.formatCode;
  }
  const blocXf = styles.match(balise('cellXfs', ''))?.[2] || '';
  const styleHeure = [...blocXf.matchAll(new RegExp(`<${P}xf\\b([^>]*?)\\/?>`, 'g'))].map(([, a]) => {
    const id = Number(attributs(a).numFmtId) || 0;
    return FORMATS_HEURE.has(id) || (id in formatsPerso && formatEstHeure(formatsPerso[id]));
  });

  const lireFeuille = async (f) => {
    const xml = await zip[f.chemin]();
    const lignes = [];
    for (const [, aLigne, contenu] of xml.matchAll(balise('row'))) {
      const numero = Number(attributs(aLigne).r) || lignes.length + 1;
      if (numero > 100000) break;
      const cases = [];
      for (const [, aCase, interieur = ''] of (contenu || '').matchAll(balise('c'))) {
        const a = attributs(aCase);
        const mv = interieur.match(balise('v', ''));
        const v = mv ? (mv[2] ?? '') : undefined;
        let valeur = null;
        if (a.t === 's') valeur = v === undefined || v === '' ? null : partages[Number(v)] ?? '';
        else if (a.t === 'inlineStr') valeur = texteRiche(interieur.match(balise('is', ''))?.[2] ?? interieur);
        else if (a.t === 'str' || a.t === 'e') valeur = v === undefined ? null : decoderXml(v);
        else if (a.t === 'b') valeur = v === '1';
        else if (a.t === 'd') valeur = v ? dateIsoEnSecondes(decoderXml(v)) : null;
        else if (v !== undefined && v.trim() !== '') {
          valeur = Number(v);
          if (styleHeure[Number(a.s) || 0]) valeur *= 86400; // fraction de jour → secondes
        }
        // formule sans résultat enregistré : on le saura pour prévenir
        if (valeur == null && new RegExp(`<${P}f\\b`).test(interieur)) valeur = SANS_RESULTAT;
        cases[a.r ? colonneDe(a.r) : cases.length] = valeur;
      }
      lignes[numero - 1] = cases;
    }
    // Cellules fusionnées : la valeur est dans la case du haut à gauche, on la recopie dans les autres
    for (const [, a] of xml.matchAll(new RegExp(`<${P}mergeCell\\b([^>]*?)\\/?>`, 'g'))) {
      const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i.exec(attributs(a).ref || '');
      if (!m) continue;
      const [c1, l1, c2, l2] = [colonneDe(m[1]), Number(m[2]) - 1, colonneDe(m[3]), Number(m[4]) - 1];
      if ((l2 - l1 + 1) * (c2 - c1 + 1) > 20000) continue;
      const valeur = lignes[l1]?.[c1];
      if (valeur == null) continue;
      for (let l = l1; l <= l2; l++) {
        lignes[l] ||= [];
        for (let c = c1; c <= c2; c++) if (lignes[l][c] == null) lignes[l][c] = valeur;
      }
    }
    return Array.from(lignes, (l) => l || []);
  };

  // la feuille « Temps » si elle existe, sinon la première qui a les bons titres
  const visibles = [...feuilles.filter((f) => !f.cachee), ...feuilles.filter((f) => f.cachee)];
  const parNom = visibles.find((f) => normaliser(f.nom) === 'temps');
  if (parNom) return { feuille: parNom.nom, tableau: await lireFeuille(parNom) };
  let premiere = null;
  for (const f of visibles) {
    const tableau = await lireFeuille(f);
    premiere ||= { feuille: f.nom, tableau };
    if (trouverEntete(tableau)?.complet) return { feuille: f.nom, tableau };
  }
  return premiere;
}

// « 1899-12-30T00:00:36.118 » (cases de type date) → secondes
function dateIsoEnSecondes(t) {
  const m = /^(\d{4})-(\d\d)-(\d\d)(?:T(\d\d):(\d\d):(\d\d(?:\.\d+)?))?/.exec(t);
  if (!m) return t;
  const jours = (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000;
  return jours * 86400 + (m[4] ? +m[4] * 3600 + +m[5] * 60 + Number(m[6]) : 0);
}

// ---------- 3. Lire un CSV ----------

function decoderTexte(buffer) {
  const o = new Uint8Array(buffer);
  if (o[0] === 0xff && o[1] === 0xfe) return new TextDecoder('utf-16le').decode(o.subarray(2));
  if (o[0] === 0xfe && o[1] === 0xff) return new TextDecoder('utf-16be').decode(o.subarray(2));
  // UTF-16 sans marque : un octet sur deux est nul
  const n = Math.min(o.length, 400);
  let zerosPairs = 0; let zerosImpairs = 0;
  for (let i = 0; i < n; i++) if (o[i] === 0) { if (i % 2) zerosImpairs++; else zerosPairs++; }
  if (n >= 4 && zerosImpairs > n / 4 && zerosPairs < n / 20) return new TextDecoder('utf-16le').decode(o);
  if (n >= 4 && zerosPairs > n / 4 && zerosImpairs < n / 20) return new TextDecoder('utf-16be').decode(o);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(o).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(o); // vieux Excel français
  }
}

// Découpe le texte en lignes et en cases. numeros = numéro de la ligne du fichier où commence chaque ligne
function decouperCsv(texte, sep, maxLignes = Infinity) {
  const lignes = [];
  const numeros = [];
  let ligne = [];
  let cellule = '';
  let guillemets = false;
  let numero = 1;
  let debut = 1;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') { cellule += '"'; i++; }
      else if (c === '"') guillemets = false;
      else { if (c === '\n') numero++; cellule += c; }
    } else if (c === '"' && cellule.trim() === '') { guillemets = true; cellule = ''; }
    else if (c === sep) { ligne.push(cellule); cellule = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texte[i + 1] === '\n') i++;
      ligne.push(cellule); lignes.push(ligne); numeros.push(debut);
      ligne = []; cellule = '';
      numero++; debut = numero;
      if (lignes.length >= maxLignes) break;
    } else cellule += c;
  }
  if (cellule || ligne.length) { ligne.push(cellule); lignes.push(ligne); numeros.push(debut); }
  return { lignes, numeros };
}

// Devine le séparateur (; , ou tabulation) : celui qui donne une ligne de titres reconnue,
// avec le plus de colonnes comprises, et des lignes qui ont toutes le même nombre de cases.
function devinerSeparateur(texte) {
  const debut = texte.slice(0, 200000);
  let meilleur = null;
  for (const sep of [';', '\t', ',']) {
    const { lignes } = decouperCsv(debut, sep, 60);
    const pleines = lignes.filter((l) => l.some((x) => x.trim()));
    const entete = trouverEntete(lignes);
    const roles = entete ? new Set(entete.roles.filter(Boolean)).size : 0;
    // nombre de cases le plus fréquent (au moins 2), et combien de lignes l'ont
    const compte = new Map();
    for (const l of pleines.slice(0, 20)) if (l.length > 1) compte.set(l.length, (compte.get(l.length) || 0) + 1);
    const regulieres = Math.max(0, ...compte.values());
    // on compare dans l'ordre : titres complets, titres trouvés, colonnes comprises, lignes régulières
    const note = [entete?.complet ? 1 : 0, entete ? 1 : 0, roles, regulieres];
    const k = meilleur ? note.findIndex((x, i) => x !== meilleur.note[i]) : 0;
    if (!meilleur || (k >= 0 && note[k] > meilleur.note[k])) meilleur = { sep, note };
  }
  return meilleur.sep;
}

function lireCsv(buffer) {
  const texte = decoderTexte(buffer);
  const { lignes, numeros } = decouperCsv(texte, devinerSeparateur(texte));
  return { feuille: null, tableau: lignes, numeros, csv: true };
}

// ---------- 4. Comprendre le tableau ----------

export function normaliser(t) {
  return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[°º.:()_#'’-]/g, ' ').replace(/\s+/g, ' ').trim();
}

// À quoi sert une colonne, d'après son titre :
// manche, course (une course entière : seulement s'il n'y a pas de colonne manche), plaque,
// numero (« N° », « # » : la plaque s'il n'y a pas de colonne Plaque), prenom, pilote, couloir,
// categorie, depart, temps (une ligne de chrono), final (« Temps », « Temps total » : l'arrivée
// s'il n'y a pas de colonne Arrivée), ou null (colonne ignorée)
function roleColonne(titre) {
  const brut = String(titre ?? '').trim();
  if (/^(#|n°|nº|no\.?)$/i.test(brut)) return 'numero';
  let t = normaliser(titre).replace(/[,;/]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (/\b(club|equipe|team|ville|licence|license|nation|pays|sponsor)\b/.test(t)) return null;
  if (/^(plaque|dossard|bib|plate|n plaque|num plaque|numero plaque|no plaque|numero de plaque|n de plaque|race number|number)\b/.test(t)) return 'plaque';
  if (/^(manche|heat|serie|moto|race|run|poule|groupe|round|tour|phase|n manche|num manche|numero manche|no manche|numero de manche)\b/.test(t)) return 'manche';
  if (/^course$/.test(t)) return 'course';
  if (/^(n|no|num|numero|nr|nummer)$/.test(t)) return 'numero';
  if (/^(prenom|first name|firstname|given name)\b/.test(t)) return 'prenom';
  if (/^(pilote|nom|name|rider|coureur|last name|lastname|athlete|concurrent)\b/.test(t)) return 'pilote';
  if (/^(couloir|lane|gate|porte)\b/.test(t)) return 'couloir';
  if (/^(categorie|category|cat|classe|class)\b/.test(t)) return 'categorie';
  if (/^(depart|start|grille|t0|top depart|heure de depart)\b/.test(t)) return 'depart';
  if (/^temps\b/.test(t)) {
    const reste = t.replace(/^temps( d| de| a| au| du)?\s*/, '');
    if (!reste || /^(final|finale|total|course|chrono)$/.test(reste)) return 'final';
    t = reste;
  }
  if (/^(inter|intermediaire|split|i ?\d+$|ligne|l ?\d+$|secteur|passage|cellule|arrivee|arrive|finish|fin$|chrono final|final time|finish time)\b/.test(t)) return 'temps';
  if (/^(time|chrono|total time)$/.test(t)) return 'final';
  return null;
}

// Une ligne de titres : il faut une plaque (ou « N° ») ; complet = il y a aussi des temps
function trouverEntete(tableau) {
  let simple = null;
  for (let i = 0; i < Math.min(tableau.length, 50); i++) {
    const roles = (tableau[i] || []).map((x) => (typeof x === 'string' ? roleColonne(x) : null));
    const aPlaque = roles.includes('plaque') || roles.includes('numero');
    if (!aPlaque) continue;
    const complet = roles.includes('temps') || roles.includes('final');
    if (complet) return { index: i, roles, complet };
    if (roles.includes('plaque')) simple ||= { index: i, roles, complet: false };
  }
  return simple;
}

const vide = (v) => v == null || v === SANS_RESULTAT || (typeof v === 'string' && v.trim() === '');
const MOTS_ABSENT = /^(-+|—|–|dnf|dns|dsq|dq|rel|ab|abd|abs|abandon|chute|x|na|n\/a|#n\/a|nc|np)$/i;

const arrondi = (s) => Math.round(s * 1000) / 1000;

// Lit un temps → secondes. null = pas de temps (case vide, DNF…), undefined = illisible.
// « 36.254 », « 36,254 », « 36.254s », « 0:36.254 », « 1:02.5 », « 0:00:36.254 », « 14:03:12.100 »,
// « 1'02"500 », « 36"254 », « 1'02.5 »
export function lireTemps(v) {
  if (vide(v)) return null;
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? arrondi(v) : undefined;
  if (typeof v !== 'string') return undefined;
  let t = v.trim().replace(/[  ]/g, ' ');
  if (MOTS_ABSENT.test(t)) return null;
  t = t.replace(/\s*(s|sec|secs|secondes?)\.?$/i, '').replace(/[′‘’`´]/g, "'").replace(/[″“”]|''/g, '"').trim();
  if (/^\d+,\d+$/.test(t) || /^\d+:\d+,\d+$/.test(t) || /^\d+:\d+:\d+,\d+$/.test(t)) t = t.replace(',', '.');
  // 1'02"500 ou 36"254 ou 1'02.5 ou 1'02
  let m = /^(?:(\d+)')?\s*(\d+)(?:(?:"|\.)(\d*))?"?$/.exec(t);
  if (m && (m[1] != null || t.includes('"'))) {
    const s = Number(m[2]) + (m[3] ? Number(`0.${m[3]}`) : 0);
    if (m[1] != null && s >= 60) return undefined;
    return arrondi((m[1] ? Number(m[1]) * 60 : 0) + s);
  }
  // h:mm:ss(.fff), mm:ss(.fff), ss(.fff)
  m = /^(?:(?:(\d+):)?(\d+):)?(\d+(?:\.\d+)?|\.\d+)$/.exec(t);
  if (m) {
    const [h, min, s] = [m[1] ? Number(m[1]) : 0, m[2] ? Number(m[2]) : 0, Number(m[3])];
    if (m[2] != null && s >= 60) return undefined;
    if (m[1] != null && min >= 60) return undefined;
    return arrondi(h * 3600 + min * 60 + s);
  }
  if (/^\d+(\.\d+)?e[+-]?\d+$/i.test(t)) return arrondi(Number(t));
  return undefined;
}

// Le texte d'une case (espaces en trop retirés)
const texteCase = (v) => (vide(v) ? '' : typeof v === 'number' ? String(arrondi(v)) : String(v).replace(/\s+/g, ' ').trim());
// Couper à n lettres puis retirer les espaces (la base fait pareil : deux textes égaux ici le sont là-bas)
const couper = (t, n) => t.slice(0, n).trim();
// « Manche 3 », « Heat 3 », « 3 » → 3 ; sinon null
const numeroSimple = (t) => {
  const m = /^(?:(?:manche|heat|race|moto|course|n°|no|n)\s*)?(\d+)$/i.exec(t.trim());
  return m ? Number(m[1]) : null;
};
// Plaque sans les zéros du début (« 021 » et « 21 » sont le même pilote)
export const plaqueSansZeros = (p) => String(p ?? '').trim().replace(/^0+(?=\d)/, '');

const listeLignes = (liste) => {
  const l = [...new Set(liste)];
  return l.length > 6 ? `${l.slice(0, 6).join(', ')}…` : l.join(', ');
};

// Transforme les lignes du tableau en manches. Les numéros de ligne des messages
// sont ceux qu'on voit dans Excel (1 = première ligne).
// options : { csv: true } pour un CSV, numeros = numéro de ligne du fichier pour chaque ligne du tableau
export function analyserTableau(tableau, { csv = false, numeros = null } = {}) {
  const erreurs = [];
  const avertissements = [];
  const resultat = { lignes: [], manches: [], erreurs, avertissements };
  const TITRES = 'Manche, Plaque, Pilote, Couloir, Départ, Inter 1, Inter 2…, Arrivée';

  const entete = trouverEntete(tableau);
  if (!entete) {
    erreurs.push(`Je ne trouve pas la colonne « Plaque ». La ligne des titres doit avoir : ${TITRES}.`);
    return resultat;
  }
  const titres = tableau[entete.index];
  const roles = [...entete.roles];
  const ignorees = [];
  const ignorer = (i) => { if (!vide(titres[i])) ignorees.push(texteCase(titres[i])); roles[i] = null; };

  // Plaque : la colonne « Plaque » ; sinon « N° » / « # »
  if (roles.includes('plaque')) roles.forEach((r, i) => { if (r === 'numero') ignorer(i); });
  else roles.forEach((r, i) => { if (r === 'numero') roles[i] = 'plaque'; });
  // Une seule colonne par rôle simple (la première)
  for (const role of ['plaque', 'prenom', 'couloir', 'categorie', 'depart']) {
    roles.forEach((r, i) => { if (r === role && roles.indexOf(role) !== i) ignorer(i); });
  }
  // Pilote : on préfère la colonne qui s'appelle exactement « Pilote » (ou « Nom »)
  const cPilotes = roles.map((r, i) => (r === 'pilote' ? i : -1)).filter((i) => i >= 0);
  if (cPilotes.length > 1) {
    const exact = cPilotes.find((i) => /^(pilote|nom|name|rider)$/.test(normaliser(titres[i]))) ?? cPilotes[0];
    cPilotes.forEach((i) => { if (i !== exact) ignorer(i); });
  }
  // « Course » ne compte comme manche que s'il n'y a pas de vraie colonne Manche / Série
  if (roles.includes('manche')) roles.forEach((r, i) => { if (r === 'course') ignorer(i); });
  else roles.forEach((r, i) => { if (r === 'course') roles[i] = 'manche'; });
  const cDepart = roles.indexOf('depart');
  // Lignes de chrono : après « Départ » (s'il existe)
  roles.forEach((r, i) => { if ((r === 'temps' || r === 'final') && cDepart >= 0 && i < cDepart) ignorer(i); });
  // « Temps » / « Temps total » : c'est l'arrivée seulement s'il n'y a pas de colonne Arrivée
  const aArrivee = roles.some((r, i) => r === 'temps' && /^(temps )?(arrivee|arrive|finish|fin|chrono final|final time|finish time)\b/.test(normaliser(titres[i])));
  const cFinals = roles.map((r, i) => (r === 'final' ? i : -1)).filter((i) => i >= 0);
  cFinals.forEach((i, k) => { if (aArrivee || k > 0) ignorer(i); else roles[i] = 'temps'; });
  roles.forEach((r, i) => { if (r === null && !vide(titres[i]) && !ignorees.includes(texteCase(titres[i]))) ignorees.push(texteCase(titres[i])); });

  const cTemps = roles.map((r, i) => (r === 'temps' ? i : -1)).filter((i) => i >= 0);
  if (!cTemps.length) {
    erreurs.push(`Je ne trouve pas les colonnes de temps. Donne-leur un de ces titres : Inter 1, Inter 2… (ou Split, Ligne, Passage), puis Arrivée (ou Finish, Temps), après la colonne « Départ ».${ignorees.length ? ` Colonnes que je ne comprends pas : ${listeLignes(ignorees)}.` : ''}`);
    return resultat;
  }
  if (cTemps.length > MAX_LIGNES) {
    erreurs.push(`Trop de lignes de chronométrage (${cTemps.length}) : ${MAX_LIGNES} au maximum.`);
    return resultat;
  }
  if (ignorees.length) avertissements.push(`Colonnes ignorées : ${listeLignes(ignorees)}.`);

  // Noms des lignes (30 lettres au plus, sans doublon)
  const noms = [];
  for (const i of cTemps) {
    const base = couper(texteCase(titres[i]), 30);
    let nom = base;
    for (let k = 2; noms.includes(nom); k++) nom = `${couper(base, 25)} (${k})`;
    if (nom !== base) avertissements.push(`Deux colonnes s'appellent « ${base} » : la deuxième devient « ${nom} ».`);
    noms.push(nom);
  }
  resultat.lignes = noms;
  if (cTemps.every((i) => /^(temps )?(secteur|s \d)/.test(normaliser(titres[i])))) {
    avertissements.push('Les colonnes « Secteur » sont lues comme des temps depuis la grille (qui s\'additionnent). Si ce sont des temps de chaque secteur, mets plutôt les temps de passage.');
  }

  const col = (role) => roles.indexOf(role);
  const cManches = roles.map((r, i) => (r === 'manche' ? i : -1)).filter((i) => i >= 0);
  const cCategorie = col('categorie');
  const cPlaque = col('plaque');
  const titrePlaque = normaliser(titres[cPlaque]);
  const nbTitres = titres.length;

  const parManche = new Map();      // clé : catégorie + nom de la manche
  const catVides = [];
  let catAvant = null;
  let catVue = false;
  const numeroLigne = (i) => (numeros ? numeros[i] : i + 1);

  for (let i = entete.index + 1; i < tableau.length; i++) {
    const l = tableau[i] || [];
    const ligneExcel = numeroLigne(i);
    if (l.every(vide)) continue;
    // CSV : plus de cases que de titres → le séparateur ou les virgules des temps posent problème
    if (csv && l.length > nbTitres && l.slice(nbTitres).some((x) => !vide(x))) {
      erreurs.push(`Ligne ${ligneExcel} : il y a plus de cases que de titres. Vérifie le séparateur (; ou ,) et les virgules des temps.`);
      continue;
    }
    const plaque = texteCase(l[cPlaque]);
    // ligne de titres répétée (un bloc par manche) : on l'ignore
    if (plaque && normaliser(plaque) === titrePlaque) continue;
    if (!plaque) {
      // une ligne de commentaire sans plaque ni temps : on l'ignore
      if (cTemps.every((c) => vide(l[c]))) continue;
      erreurs.push(`Ligne ${ligneExcel} : il manque la plaque.`);
      continue;
    }
    if (plaque.length > 10) { erreurs.push(`Ligne ${ligneExcel} : plaque trop longue (« ${plaque.slice(0, 20)} »).`); continue; }

    // La manche : tout le texte compte (« 1/4 finale A » ≠ « 1/4 finale B »)
    let etiquette = '';
    if (cManches.length) {
      // deux colonnes (ex. Manche « Qualif 1 » et Série « 2 ») → « Qualif 1 · Série 2 »
      etiquette = cManches.map((c) => {
        const val = texteCase(l[c]);
        return cManches.length > 1 && /^\d+$/.test(val) ? `${texteCase(titres[c])} ${val}` : val;
      }).filter(Boolean).join(' · ');
      if (!etiquette) { erreurs.push(`Ligne ${ligneExcel} : la manche n'est pas indiquée.`); continue; }
    }

    // La catégorie : case vide → celle de la ligne au-dessus (cellules fusionnées)
    let categorie = null;
    if (cCategorie >= 0) {
      categorie = couper(texteCase(l[cCategorie]), 40) || null;
      if (categorie) { catAvant = categorie; catVue = true; }
      else { categorie = catAvant; catVides.push(ligneExcel); }
    }

    // départ : 0 en général ; si c'est une heure (transpondeurs), on part de là
    let depart = 0;
    if (cDepart >= 0) {
      if (l[cDepart] === SANS_RESULTAT) { erreurs.push(`Ligne ${ligneExcel} : la case « Départ » est une formule sans résultat. Ouvre le fichier dans Excel et enregistre-le à nouveau.`); continue; }
      depart = lireTemps(l[cDepart]);
      if (depart === undefined) { erreurs.push(`Ligne ${ligneExcel} : temps de départ illisible (« ${texteCase(l[cDepart])} »).`); continue; }
    }

    const temps = [];
    let probleme = false;
    for (const c of cTemps) {
      if (l[c] === SANS_RESULTAT) {
        erreurs.push(`Ligne ${ligneExcel}, colonne « ${texteCase(titres[c])} » : formule sans résultat. Ouvre le fichier dans Excel et enregistre-le à nouveau.`);
        probleme = true;
        break;
      }
      const t = lireTemps(l[c]);
      if (t === undefined) {
        erreurs.push(`Ligne ${ligneExcel}, colonne « ${texteCase(titres[c])} » : temps illisible (« ${texteCase(l[c]).slice(0, 30)} »). Écris par exemple 36.254 ou 0:36.254.`);
        probleme = true;
        break;
      }
      temps.push(t == null ? null : arrondi(t - (depart || 0)));
    }
    if (probleme) continue;
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
    const cCouloir = col('couloir');
    if (cCouloir >= 0 && !vide(l[cCouloir])) {
      const m = /^(?:c|couloir|lane|l)?\s*(\d+)$/i.exec(texteCase(l[cCouloir]));
      const n = m ? Number(m[1]) : NaN;
      if (Number.isInteger(n) && n >= 1 && n <= 8) couloir = n;
      else avertissements.push(`Ligne ${ligneExcel} : couloir « ${texteCase(l[cCouloir]).slice(0, 20)} » ignoré (il doit aller de 1 à 8).`);
    }
    let pilote = col('pilote') >= 0 ? texteCase(l[col('pilote')]) : '';
    if (col('prenom') >= 0) pilote = [texteCase(l[col('prenom')]), pilote].filter(Boolean).join(' ');

    // « Manche 3 » et « 3 » sont la même manche
    const n = etiquette ? numeroSimple(etiquette) : 1;
    const cle = `${categorie ?? ''}\u0000${n != null ? `#${n}` : normaliser(etiquette)}`;
    if (!parManche.has(cle)) parManche.set(cle, { etiquette, categorie, pilotes: [], ligne: ligneExcel });
    const manche = parManche.get(cle);
    const doublon = manche.pilotes.find((p) => plaqueSansZeros(p.plaque) === plaqueSansZeros(plaque));
    if (doublon) {
      erreurs.push(`Ligne ${ligneExcel} : la plaque ${plaque} est déjà dans la manche ${etiquette || '1'}${categorie ? ` (${categorie})` : ''}.`);
      continue;
    }
    manche.pilotes.push({ plaque, pilote: couper(pilote, 80) || null, couloir, temps });
  }

  // (si la colonne Catégorie est vide partout, on ne dit rien : elle ne sert pas)
  if (catVides.length && catVue) {
    avertissements.push(`Catégorie vide ligne${catVides.length > 1 ? 's' : ''} ${listeLignes(catVides)} : j'ai repris la catégorie de la ligne au-dessus.`);
  }

  // Numéros et noms des manches, catégorie par catégorie
  const manches = [...parManche.values()];
  const parCategorie = new Map();
  for (const m of manches) {
    if (!parCategorie.has(m.categorie)) parCategorie.set(m.categorie, []);
    parCategorie.get(m.categorie).push(m);
  }
  for (const [categorie, liste] of parCategorie) {
    const enCat = categorie ? ` (${categorie})` : '';
    const numerosSimples = liste.map((m) => (m.etiquette ? numeroSimple(m.etiquette) : 1));
    if (numerosSimples.every((n) => n != null)) {
      // que des numéros : on les garde
      liste.forEach((m, k) => {
        m.numero = numerosSimples[k];
        m.nom = null;
        if (m.numero < 1 || m.numero > 9999) erreurs.push(`Ligne ${m.ligne} : numéro de manche « ${m.etiquette} » impossible${enCat} (il doit aller de 1 à 9999).`);
      });
    } else {
      // des noms (« 1/4 finale A », « Q2 »…) : numéros dans l'ordre du fichier, le nom est gardé
      const nomsVus = new Map();
      liste.forEach((m, k) => {
        m.numero = k + 1;
        const n = numeroSimple(m.etiquette);
        m.nom = couper(n != null ? `Manche ${n}` : m.etiquette, 40);
        if (nomsVus.has(m.nom)) erreurs.push(`Deux manches différentes ont le même nom une fois coupé à 40 lettres${enCat} : « ${m.nom} ». Raccourcis-les dans le fichier.`);
        nomsVus.set(m.nom, m);
      });
      if (liste.length > 9999) erreurs.push('Trop de manches.');
    }
  }

  const finales = manches;
  for (const m of finales) {
    const nomM = `${m.nom || `Manche ${m.numero}`}${m.categorie ? ` (${m.categorie})` : ''}`;
    if (m.pilotes.length > MAX_PILOTES) {
      erreurs.push(`${nomM} : ${m.pilotes.length} pilotes. Une manche a ${MAX_PILOTES} pilotes au maximum${cManches.length ? '' : ' : ajoute une colonne « Manche »'}.`);
    }
    const couloirs = m.pilotes.map((p) => p.couloir).filter(Boolean);
    if (new Set(couloirs).size < couloirs.length) avertissements.push(`${nomM} : deux pilotes ont le même couloir.`);
  }
  resultat.manches = finales
    .sort((a, b) => (a.categorie ?? '').localeCompare(b.categorie ?? '', 'fr') || a.numero - b.numero)
    .map(({ numero, nom, categorie, pilotes }) => ({ numero, nom, categorie, pilotes }));
  if (!resultat.manches.length && !erreurs.length) erreurs.push('Le fichier ne contient aucun pilote.');
  if (resultat.manches.length > 500) erreurs.push('Trop de manches dans un seul fichier (500 au maximum).');
  return resultat;
}

// ---------- 5. Tout ensemble ----------

const MESSAGES = {
  'pas-un-zip': "Ce fichier n'est pas un fichier Excel (.xlsx) valide. Dans Excel : Fichier → Enregistrer sous → Classeur Excel (.xlsx) ou CSV.",
  'pas-excel': "Ce fichier n'est pas un classeur Excel. Enregistre-le en .xlsx ou en .csv.",
  ods: 'Fichier LibreOffice (.ods) : fais Fichier → Enregistrer sous → « Excel 2007-365 (.xlsx) », puis choisis ce fichier.',
  'pas-de-feuille': 'Le classeur ne contient aucune feuille lisible.',
  'trop-gros-ouvert': 'Fichier trop gros une fois ouvert.',
};

// fichier : un File du navigateur (ou { name, arrayBuffer() } dans les tests)
export async function lireFichierTemps(fichier) {
  const nom = fichier?.name || '';
  const rate = (message) => ({ lignes: [], manches: [], erreurs: [message], avertissements: [], feuille: null });
  if (fichier?.size > TAILLE_MAX) return rate('Fichier trop gros (5 Mo au maximum).');
  try {
    const buffer = await fichier.arrayBuffer();
    if (buffer.byteLength > TAILLE_MAX) return rate('Fichier trop gros (5 Mo au maximum).');
    const debut = new Uint8Array(buffer, 0, Math.min(8, buffer.byteLength));
    if (/\.xls$/i.test(nom) || (debut[0] === 0xd0 && debut[1] === 0xcf)) throw new Error('pas-excel'); // vieux format Excel
    const estZip = debut[0] === 0x50 && debut[1] === 0x4b; // « PK » : un zip
    const lu = estZip ? await lireXlsx(buffer) : lireCsv(buffer);
    return { ...analyserTableau(lu.tableau, { csv: lu.csv, numeros: lu.numeros }), feuille: lu.feuille };
  } catch (e) {
    return rate(MESSAGES[e.message] || 'Impossible de lire ce fichier. Enregistre-le en .xlsx ou en .csv et réessaie.');
  }
}
