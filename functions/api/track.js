/**
 * POST /api/track — recogida de eventos.
 *
 * Se ejecuta en Cloudflare (Pages Functions). Existe por una razón concreta:
 * la clave que escribe en la base de datos NO puede estar en el navegador.
 * El navegador habla con esta función; esta función habla con Supabase.
 *
 * Variables de entorno necesarias (Cloudflare Pages > Settings > Variables):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (secreto, nunca en el repositorio)
 */

const EVENTOS = [
  "page_view",
  "booking_click",
  "whatsapp_click",
  "phone_click",
  "maps_click",
  "instagram_click",
  "service_view",
  "faq_sin_resultado"
];

const corta = (v, n) => (typeof v === "string" ? v.slice(0, n) : null);

export async function onRequestPost({ request, env }) {
  let d;
  try {
    d = await request.json();
  } catch {
    return new Response("JSON no válido", { status: 400 });
  }

  if (!EVENTOS.includes(d.event_type)) {
    return new Response("Evento no permitido", { status: 400 });
  }

  // Solo se guarda lo que aparece en esta lista. Nada de IP, user agent,
  // cookies ni identificadores persistentes.
  const fila = {
    event_type: d.event_type,
    page: corta(d.page, 200),
    source: corta(d.source, 40),
    service: corta(d.service, 120),
    element: corta(d.element, 60),
    anonymous_session: corta(d.session, 40),
    country: request.headers.get("cf-ipcountry") || null,
    created_at: new Date().toISOString()
  };

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Faltan variables de entorno de Supabase");
    return new Response(null, { status: 204 });
  }

  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=minimal"
      },
      body: JSON.stringify(fila)
    });
    if (!r.ok) console.error("Supabase respondió", r.status, await r.text());
  } catch (e) {
    console.error("Fallo al registrar evento", e);
  }

  // Siempre 204: un fallo de analítica no debe notarse en la web.
  return new Response(null, { status: 204 });
}
