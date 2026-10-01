import type { Config } from "@netlify/functions";
// @ts-ignore : fichier JavaScript partagé avec l'appli (public/app/lieux-osm.js)
import * as osm from "../../public/app/lieux-osm.js";

// =====================================================================
// API de la carte DBSpeed (onglet Lieux)
//
//   GET /api/carte/lieux?lat=44.84&lon=-0.58&rayon=35000
//       → les pistes de BMX et pump tracks autour d'un point, déjà regroupées et allégées
//   GET /api/carte/lieux?zone=47.7,16.8,49.6,22.6   (sud,ouest,nord,est : un pays ou une région)
//       → toutes les pistes de la zone
//   GET /api/carte/lieu?id=way-123
//       → une seule piste (pour une fiche ouverte par un lien)
//   GET /api/carte/recherche?q=Sarrians
//       → le point d'une ville ou d'une piste
//   GET /api/carte/adresse?lat=44.8412&lon=-0.5803
//       → l'adresse d'un point
//
// Pourquoi une API plutôt que d'appeler OpenStreetMap depuis le téléphone :
//   - réponses gardées en cache par Netlify (24 h) : plus rapide, et moins d'appels (donc moins de crédits) ;
//   - on envoie au téléphone seulement ce qui sert (pas les données brutes, 5 à 10 fois plus lourdes) ;
//   - on se présente correctement aux services d'OpenStreetMap (ils le demandent).
//
// Protections :
//   - le point est arrondi (≈ 1 km) et le rayon pris dans une petite liste : une adresse « pas ronde »
//     est renvoyée vers l'adresse ronde, déjà en cache. On ne peut donc pas forcer des milliers
//     d'appels à OpenStreetMap en changeant un chiffre au bout des coordonnées ;
//   - chaque appel à OpenStreetMap est coupé au bout de 7 s, et l'API répond toujours en moins de 9 s
//     (Netlify coupe à 10 s) ;
//   - les pages d'autres sites ne peuvent pas utiliser l'API depuis le navigateur ;
//   - les erreurs détaillées restent dans les journaux de Netlify (jamais envoyées au téléphone).
// =====================================================================

const SITE = "https://dbspeed-2let.netlify.app";
// On se présente aux services d'OpenStreetMap (règle de Nominatim : un nom d'appli et un contact)
const QUI = { "User-Agent": `DBSpeed/1.0 (appli BMX ; ${SITE})`, Referer: `${SITE}/` };
const DELAI_ESSAI = 7000;   // un appel à OpenStreetMap : 7 s maximum
const BUDGET = 8500;        // toute la réponse : 8,5 s maximum

const MINUTE = 60;
const HEURE = 3600;

function reponse(donnees: unknown, { cacheSecondes = 24 * HEURE, statut = 200 } = {}) {
  const enCache = statut === 200 && cacheSecondes > 0;
  return Response.json(donnees, {
    status: statut,
    headers: enCache
      ? {
          // le téléphone garde 10 min au plus ; Netlify garde la réponse et la sert à tout le monde
          "Cache-Control": `public, max-age=${Math.min(cacheSecondes, 10 * MINUTE)}`,
          "Netlify-CDN-Cache-Control": cacheSecondes >= HEURE
            ? `public, durable, max-age=${cacheSecondes}, stale-while-revalidate=604800`
            : `public, max-age=${cacheSecondes}`,
        }
      : { "Cache-Control": "no-store" },
  });
}

const erreur = (message: string, statut = 400) => reponse({ erreur: message }, { statut, cacheSecondes: 0 });

// Renvoie vers l'adresse « ronde » (cette redirection est elle aussi gardée en cache)
function versAdresseRonde(url: URL, params: Record<string, string>) {
  const ronde = new URL(url.pathname, url.origin);
  for (const [cle, valeur] of Object.entries(params)) ronde.searchParams.set(cle, valeur);
  return new Response(null, {
    status: 301,
    headers: {
      Location: `${ronde.pathname}${ronde.search}`,
      "Cache-Control": "public, max-age=3600",
      "Netlify-CDN-Cache-Control": "public, durable, max-age=2592000",
    },
  });
}

function nombre(texte: string | null, min: number, max: number): number | null {
  const n = Number(texte);
  return texte !== null && texte !== "" && Number.isFinite(n) && n >= min && n <= max ? n : null;
}

// Les mêmes paramètres, dans le même ordre, sans rien en plus ?
const memesParams = (p: URLSearchParams, attendus: Record<string, string>) =>
  p.toString() === new URLSearchParams(attendus).toString();

export default async (req: Request) => {
  if (req.method !== "GET") return erreur("Méthode non autorisée", 405);

  // Frein très simple : une page d'un autre site qui appelle l'API depuis le navigateur est refusée.
  // (Le navigateur ajoute tout seul « Sec-Fetch-Site » ; l'appli DBSpeed envoie « same-origin ».)
  if (req.headers.get("sec-fetch-site") === "cross-site") return erreur("Accès refusé.", 403);

  const url = new URL(req.url);
  const action = url.pathname.replace(/\/+$/, "").split("/").pop();
  const p = url.searchParams;
  // chaque appel à OpenStreetMap : 7 s maximum, et on s'arrête à temps pour répondre
  const options = { entetes: QUI, delaiEssai: DELAI_ESSAI, finAvant: Date.now() + BUDGET };

  try {
    if (action === "lieux" && p.get("zone")) {
      // toute une zone [sud, ouest, nord, est] (un pays, une région), arrondie comme un point
      const zone = String(p.get("zone")).split(",").map((x) => osm.arrondir(Number(x), osm.DECIMALES_ZONE));
      if (!osm.zoneValide(zone)) return erreur("Zone invalide ou trop grande (6° × 9° au maximum).");
      const ronde = { zone: zone.join(",") };
      if (!memesParams(p, ronde)) return versAdresseRonde(url, ronde);
      const lieux = await osm.pistesDansZone(zone, options);
      return reponse({ lieux, zone, source: "OpenStreetMap" }, { cacheSecondes: lieux.length ? 24 * HEURE : MINUTE });
    }

    if (action === "lieux") {
      const lat = nombre(p.get("lat"), -90, 90);
      const lon = nombre(p.get("lon"), -180, 180);
      const rayonDemande = nombre(p.get("rayon") ?? "35000", 300, 50000);
      if (lat === null || lon === null || rayonDemande === null) {
        return erreur("Il faut lat, lon (et rayon entre 300 et 50000 m).");
      }
      const rond = {
        lat: String(osm.arrondir(lat, osm.DECIMALES_ZONE)),
        lon: String(osm.arrondir(lon, osm.DECIMALES_ZONE)),
        rayon: String(osm.rayonPermis(rayonDemande)),
      };
      if (!memesParams(p, rond)) return versAdresseRonde(url, rond);
      const centre = { lat: Number(rond.lat), lon: Number(rond.lon) };
      const rayon = Number(rond.rayon);
      const lieux = await osm.pistesAutour(centre.lat, centre.lon, rayon, options);
      // aucune piste trouvée : on ne garde pas la réponse longtemps (une piste peut être ajoutée)
      return reponse({ lieux, centre, rayon, source: "OpenStreetMap" }, { cacheSecondes: lieux.length ? 24 * HEURE : MINUTE });
    }

    if (action === "lieu") {
      const id = p.get("id") ?? "";
      if (!osm.idValide(id) || id.startsWith("dbs-")) return erreur("Id de piste invalide.");
      const lieu = await osm.pisteParId(id, options);
      if (!lieu) return reponse({ lieu: null }, { cacheSecondes: MINUTE });
      return reponse({ lieu, source: "OpenStreetMap" });
    }

    if (action === "recherche") {
      const brut = p.get("q") ?? "";
      // une seule façon d'écrire la même recherche (minuscules, espaces simples) : la réponse en cache sert à tous
      const q = brut.trim().replace(/\s+/g, " ").toLowerCase();
      if (q.length < 2 || q.length > 60) return erreur("La recherche doit faire entre 2 et 60 caractères.");
      if (!/^[\p{L}\p{N} '’.,-]+$/u.test(q)) return erreur("La recherche ne peut contenir que des lettres, des chiffres et des espaces.");
      if (!memesParams(p, { q })) return versAdresseRonde(url, { q });
      const resultat = await osm.chercherEndroit(q, options);
      return reponse({ resultat }, { cacheSecondes: resultat ? 7 * 24 * HEURE : MINUTE });
    }

    if (action === "adresse") {
      const lat = nombre(p.get("lat"), -90, 90);
      const lon = nombre(p.get("lon"), -180, 180);
      if (lat === null || lon === null) return erreur("Il faut lat et lon.");
      const rond = {
        lat: String(osm.arrondir(lat, osm.DECIMALES_ADRESSE)),
        lon: String(osm.arrondir(lon, osm.DECIMALES_ADRESSE)),
      };
      if (!memesParams(p, rond)) return versAdresseRonde(url, rond);
      const adresse = await osm.adresseDuPoint(Number(rond.lat), Number(rond.lon), options);
      return reponse(adresse, { cacheSecondes: adresse.adresse ? 30 * 24 * HEURE : MINUTE });
    }

    return erreur("Adresse inconnue. Utilise /api/carte/lieux, /lieu, /recherche ou /adresse.", 404);
  } catch (e) {
    // OpenStreetMap ne répond pas : le détail va dans les journaux, le téléphone reçoit un message simple
    // (l'appli essaiera alors OpenStreetMap directement).
    console.error(`[carte] ${action} :`, e);
    return erreur("Le service de carte ne répond pas pour l'instant. Réessaie dans un moment.", 502);
  }
};

export const config: Config = {
  path: ["/api/carte/lieux", "/api/carte/lieu", "/api/carte/recherche", "/api/carte/adresse"],
  // Frein contre ceux qui appellent l'API en boucle (gratuit chez Netlify) : 60 appels par minute
  // et par adresse IP, au-delà Netlify répond « trop de demandes » sans lancer la fonction.
  rateLimit: {
    windowLimit: 60,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
