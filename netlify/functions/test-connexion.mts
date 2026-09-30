import type { Context, Config } from "@netlify/functions";

// Page de test DBSpeed : vérifie Supabase et envoie un mail de test avec Resend.
// Le destinataire est fixé dans la variable TEST_EMAIL_TO (pas modifiable depuis la page).
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Méthode non autorisée" }, { status: 405 });
  }

  const supabaseUrl = Netlify.env.get("SUPABASE_URL");
  const supabaseKey = Netlify.env.get("SUPABASE_PUBLISHABLE_KEY");
  const resendKey = Netlify.env.get("RESEND_API_KEY");
  const to = Netlify.env.get("TEST_EMAIL_TO");

  const result = {
    supabase: { ok: false, detail: "" },
    resend: { ok: false, detail: "" },
  };

  // 1. Supabase
  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseKey ?? "" },
    });
    result.supabase.ok = r.ok;
    result.supabase.detail = r.ok ? "Base de données joignable" : `Erreur ${r.status}`;
  } catch (e) {
    result.supabase.detail = `Impossible de joindre Supabase : ${(e as Error).message}`;
  }

  // 2. Resend
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DBSpeed <resultats@sportco.cloud>",
        to: [to],
        subject: "DBSpeed : test de connexion réussi 🏁",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px">
            <h2 style="margin:0 0 12px">DBSpeed est branché ✅</h2>
            <p>Si tu lis ce mail, c'est que Netlify, Supabase et Resend fonctionnent ensemble.</p>
            <p>Supabase : ${result.supabase.ok ? "OK" : "problème"}</p>
            <p style="color:#888;font-size:12px">Mail de test envoyé depuis dbspeed-2let.netlify.app</p>
          </div>`,
      }),
    });
    const data = await r.json();
    result.resend.ok = r.ok;
    result.resend.detail = r.ok ? `Mail envoyé à ${to}` : `Erreur Resend : ${data?.message ?? r.status}`;
  } catch (e) {
    result.resend.detail = `Impossible de joindre Resend : ${(e as Error).message}`;
  }

  return Response.json(result);
};

export const config: Config = {
  path: "/api/test-connexion",
};
