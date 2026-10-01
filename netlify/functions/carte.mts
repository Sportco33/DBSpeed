import type { Config } from "@netlify/functions";
// @ts-ignore : fichier JavaScript partagé avec l'appli (public/app/lieux-osm.js)
import { pistesAutour, pistesDansZone, zoneValide, pisteParId, chercherEndroit, adresseDuPoint, idValide } from "../../public/app/lieux-osm.js";

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
//   GET /api/carte/adresse?lat=44.84&lon=-0.58
//       → l'adresse d'un point
//
// Pourquoi une API plutôt que d'appeler OpenStreetMap depuis le téléphone :
//   - réponses gardées en cache par Netlify (24 h) : plus rapide, et moins d'appels (donc moins de crédits) ;
//   - on envoie au téléphone seulement ce qui sert (pas les données brutes, 5 à 10 fois plus lourdes) ;
//   - on se présente correctement aux services d'OpenStreetMap (ils le demandent).
// =====================================================================

const QUI = { "User-Agent": "DBSpeed/1.0 (appli BMX ; https://dbspeed-2let.netlify.app)" };

function reponse(donnees: unknown, { cacheHeures = 24, statut = 200 } = {}) {
  const enCache = statut === 200 && cacheHeures > 0;
  return Response.json(donnees, {
    status: statut,
    headers: enCache
      ? {
          // le téléphone garde 10 min ; Netlify garde la réponse et la sert à tout le monde
          "Cache-Control": "public, max-age=600",
          "Netlify-CDN-Cache-Control": `public, durable, max-age=${cacheHeures * 3600}, stale-while-revalidate=604800`,
        }
      : { "Cache-Control": "no-store" },
  });
}

const erreur = (message: string, statut = 400) => reponse({ erreur: message }, { statut, cacheHeures: 0 });

function nombre(texte: string | null, min: number, max: number): number | null {
  const n = Number(texte);
  return texte !== null && texte !== "" && Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export default async (req: Request) => {
  if (req.method !== "GET") return erreur("Méthode non autorisée", 405);
  const url = new URL(req.url);
  const action = url.pathname.replace(/\/+$/, "").split("/").pop();
  const p = url.searchParams;

  try {
    if (action === "lieux" && p.get("zone")) {
      const zone = String(p.get("zone")).split(",").map((x) => Math.round(Number(x) * 100) / 100);
      if (!zoneValide(zone)) return erreur("Zone invalide ou trop grande (6° × 9° au maximum).");
      const lieux = await pistesDansZone(zone, { entetes: QUI });
      return reponse({ lieux, zone, source: "OpenStreetMap" });
    }

    if (action === "lieux") {
      const lat = nombre(p.get("lat"), -90, 90);
      const lon = nombre(p.get("lon"), -180, 180);
      const rayon = nombre(p.get("rayon") ?? "35000", 300, 50000);
      if (lat === null || lon === null || rayon === null) return erreur("Il faut lat, lon (et rayon entre 300 et 50000 m).");
      const lieux = await pistesAutour(lat, lon, rayon, { entetes: QUI });
      return reponse({ lieux, centre: { lat, lon }, rayon, source: "OpenStreetMap" });
    }

    if (action === "lieu") {
      const id = p.get("id") ?? "";
      if (!idValide(id) || id.startsWith("dbs-")) return erreur("Id de piste invalide.");
      const lieu = await pisteParId(id, { entetes: QUI });
      if (!lieu) return reponse({ lieu: null }, { cacheHeures: 1 });
      return reponse({ lieu, source: "OpenStreetMap" });
    }

    if (action === "recherche") {
      const q = (p.get("q") ?? "").trim();
      if (q.length < 2 || q.length > 80) return erreur("La recherche doit faire entre 2 et 80 caractères.");
      const resultat = await chercherEndroit(q, { entetes: QUI });
      return reponse({ resultat }, { cacheHeures: 24 * 7 });
    }

    if (action === "adresse") {
      const lat = nombre(p.get("lat"), -90, 90);
      const lon = nombre(p.get("lon"), -180, 180);
      if (lat === null || lon === null) return erreur("Il faut lat et lon.");
      return reponse(await adresseDuPoint(lat, lon, { entetes: QUI }), { cacheHeures: 24 * 30 });
    }

    return erreur("Adresse inconnue. Utilise /api/carte/lieux, /lieu, /recherche ou /adresse.", 404);
  } catch (e) {
    // OpenStreetMap ne répond pas : l'appli essaiera directement
    return erreur(`Le service de carte ne répond pas pour l'instant (${(e as Error).message}).`, 502);
  }
};

export const config: Config = {
  path: ["/api/carte/lieux", "/api/carte/lieu", "/api/carte/recherche", "/api/carte/adresse"],
};
