#!/usr/bin/env node
/**
 * build.js — generador estático sin framework.
 *
 * Por qué existe: el SEO local necesita el contenido dentro del HTML, no
 * inyectado por JavaScript. Y para reutilizar el proyecto en otros negocios
 * hace falta que el contenido viva en JSON, no en el HTML.
 * Este script resuelve las dos cosas con ~300 líneas y cero dependencias.
 *
 *   node build.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "public");
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));

const cfg = read("config.json");
const cat = read("services.json");
const faq = read("faq.json");

const DEV = process.argv.includes("--dev");

/* ---------------------------------------------------------------- helpers */
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const eur = (n) => `${String(n).replace(".", ",")} €`;
const val = (f) => (f && typeof f === "object" && "value" in f ? f.value : f);

const write = (rel, html) => {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html.replace(/\n{3,}/g, "\n\n"));
  console.log("  ·", rel);
};

const DOMAIN = cfg.site.domain.replace(/\/$/, "");
const BOOKSY = cfg.booking.url;
const PHONE = val(cfg.contact.phone);
const PHONE_TXT = cfg.contact.phone.display;
const WA = val(cfg.contact.whatsapp);
const MAPS = val(cfg.contact.maps_url);
const IG = val(cfg.social.instagram);
const ADDR = cfg.contact.address;
const GEO = cfg.contact.geo;
const NOMBRE = cfg.business.name;
const TITULAR = val(cfg.business.legal_name) || NOMBRE;
const DIR_TXT = `${ADDR.value}, ${ADDR.postal_code} ${ADDR.city}`;

/* el teléfono es opcional: sin número confirmado no se pinta ningún enlace tel: */
const telLink = (origen) =>
  PHONE ? `<a href="tel:${PHONE}" data-evento="phone_click" data-origen="${origen}">${esc(PHONE_TXT)}</a>` : "";

/* páginas de servicio que se generan (en /servicios/{slug}/) */
const pages = cat.categories.filter((c) => c.page);

/* ------------------------------------------------------------- fragmentos */

function head({ title, desc, url, extraSchema = "" }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(NOMBRE)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500&family=Karla:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
${extraSchema}
</head>
<body>
<a class="saltar" href="#principal">Ir al contenido</a>
${DEV ? '<p class="aviso-dev">Compilado en modo desarrollo. Hay datos sin verificar (teléfono, horario, WhatsApp, Instagram, equipo, razón social). Ver README antes de publicar.</p>' : ""}`;
}

function header() {
  return `
<header class="cabecera">
  <div class="wrap cabecera__fila">
    <a class="marca" href="/">${esc(NOMBRE)}<span>${esc(cfg.business.short_location)}</span></a>
    <nav class="nav" id="nav" aria-label="Principal">
      <a href="/#centro">La barbería</a>
      <a href="/#servicios">Servicios</a>
      <a href="/#equipo">Equipo</a>
      <a href="/#preguntas">Preguntas</a>
      <a href="/#visita">Cómo llegar</a>
    </nav>
    <button class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="nav">Menú</button>
    <a class="btn btn--miel" href="${BOOKSY}" target="_blank" rel="noopener" data-evento="booking_click" data-origen="cabecera">Reservar cita</a>
  </div>
</header>`;
}

function barraMovil() {
  const wa = WA
    ? `<a class="btn btn--linea" href="https://wa.me/${WA.replace(/\D/g, "")}" target="_blank" rel="noopener" data-evento="whatsapp_click" data-origen="barra_movil">WhatsApp</a>`
    : PHONE
    ? `<a class="btn btn--linea" href="tel:${PHONE}" data-evento="phone_click" data-origen="barra_movil">Llamar</a>`
    : `<a class="btn btn--linea" href="${MAPS}" target="_blank" rel="noopener" data-evento="maps_click" data-origen="barra_movil">Cómo llegar</a>`;
  return `
<div class="barra-movil">
  ${wa}
  <a class="btn btn--miel" href="${BOOKSY}" target="_blank" rel="noopener" data-evento="booking_click" data-origen="barra_movil">Reservar cita</a>
</div>`;
}

function footer() {
  const anio = new Date().getFullYear();
  return `
<footer class="pie">
  <div class="wrap pie__grid">
    <div>
      <p class="pie__marca">${esc(NOMBRE)}</p>
      <p class="pie__dir">${esc(val(cfg.business.tagline))}<br>
      ${esc(DIR_TXT)}</p>
    </div>
    <div>
      <h4>Contacto</h4>
      <ul>
        ${PHONE ? `<li>${telLink("pie")}</li>` : ""}
        <li><a href="${BOOKSY}" target="_blank" rel="noopener" data-evento="booking_click" data-origen="pie">Reservar en Booksy</a></li>
        <li><a href="${MAPS}" target="_blank" rel="noopener" data-evento="maps_click" data-origen="pie">Cómo llegar</a></li>
        <li><a href="${IG}" target="_blank" rel="noopener" data-evento="instagram_click" data-origen="pie">Instagram</a></li>
      </ul>
    </div>
    <div>
      <h4>Servicios</h4>
      <ul>${pages.map((p) => `<li><a href="/servicios/${p.slug}/">${esc(p.title)}</a></li>`).join("")}</ul>
    </div>
  </div>
  <div class="wrap pie__legal">
    <span>© ${anio} ${esc(TITULAR)}</span>
    <a href="/aviso-legal/">Aviso legal</a>
    <a href="/privacidad/">Privacidad</a>
    <a href="/cookies/">Cookies</a>
  </div>
</footer>
<script src="/script.js" defer></script>
</body>
</html>`;
}

function filaServicio(s) {
  const pill = s.popular ? `<span class="destacado">Más reservado</span>` : "";
  return `<li>
    <div class="linea-servicio">
      <span class="linea-servicio__nombre">${esc(s.name)}${pill}</span>
      <span class="linea-servicio__meta"><span class="dur">${esc(s.duration || "")}</span>${eur(s.price)}</span>
    </div>
    ${s.desc ? `<p class="linea-servicio__desc">${esc(s.desc)}</p>` : ""}
  </li>`;
}

function bloqueDestacado() {
  const v = cat.featured;
  if (!v) return "";
  return `
<div class="primera">
  <div>
    <h3>${esc(v.name)}</h3>
    <p>${esc(v.desc)} ${v.duration}, ${eur(v.price)}.</p>
  </div>
  <a class="btn btn--claro" href="${BOOKSY}" target="_blank" rel="noopener" data-evento="booking_click" data-origen="servicio_destacado" data-servicio="${esc(v.name)}">${esc(v.cta || "Reservar")}</a>
</div>`;
}

/* ----------------------------------------------------------------- schema */
function schemaNegocio() {
  const dias = { Lunes: "Mo", Martes: "Tu", Miércoles: "We", Jueves: "Th", Viernes: "Fr", Sábado: "Sa", Domingo: "Su" };
  const spec = [];
  cfg.hours.week.forEach((d) => {
    d.slots.forEach((s) => {
      const [o, c] = s.split("–");
      spec.push({ "@type": "OpeningHoursSpecification", dayOfWeek: dias[d.day], opens: o, closes: c });
    });
  });
  // Nota: NO se incluye aggregateRating. La valoración es de Booksy, no de esta
  // web, y publicarla como schema propio incumple las directrices de Google.
  const data = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: NOMBRE,
    description: val(cfg.business.tagline),
    url: DOMAIN,
    ...(PHONE ? { telephone: PHONE } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDR.value,
      postalCode: ADDR.postal_code,
      addressLocality: ADDR.city,
      addressRegion: cfg.business.region,
      addressCountry: "ES",
    },
    ...(GEO ? { geo: { "@type": "GeoCoordinates", latitude: GEO.lat, longitude: GEO.lng } } : {}),
    priceRange: "€",
    sameAs: [IG, BOOKSY].filter(Boolean),
    openingHoursSpecification: spec,
    potentialAction: { "@type": "ReserveAction", target: BOOKSY },
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function schemaFaq(items) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

/* -------------------------------------------------------------- portada */
function portada() {
  const faqPub = faq.items.filter((i) => !i.draft);

  const carta = cat.categories
    .map(
      (c) => `
    <section class="carta__bloque">
      <div class="carta__titulo">
        <h3 id="${c.slug}">${esc(c.title)}</h3>
        ${c.page ? `<a href="/servicios/${c.slug}/">Ver ${esc(c.title.toLowerCase())} en detalle</a>` : ""}
      </div>
      ${c.lead ? `<p class="carta__lead">${esc(c.lead)}</p>` : ""}
      <ul class="lista">${c.services.map(filaServicio).join("")}</ul>
      ${c.more_note ? `<p class="carta__lead nota-arriba">${esc(c.more_note)}</p>` : ""}
    </section>`
    )
    .join("");

  const horas = cfg.hours.week
    .map(
      (d) =>
        `<li><span>${d.day}</span>${
          d.slots.length ? `<span>${d.slots.join(" · ")}</span>` : `<span class="cerrado">Cerrado</span>`
        }</li>`
    )
    .join("");

  const faqHtml = faqPub
    .map(
      (i) => `<details data-faq data-tags="${esc((i.tags || []).join(" "))} ${esc(i.q.toLowerCase())}">
      <summary>${esc(i.q)}</summary>
      <p>${esc(i.a)}</p>
    </details>`
    )
    .join("");

  const rep = cfg.reputation.booksy;

  return (
    head({
      title: `${NOMBRE} | Barbería en Clara del Rey, Madrid`,
      desc: `Barbería en ${DIR_TXT}: corte de pelo desde 18 €, corte y barba, afeitado tradicional premium, color y cejas a navaja. Reserva online en Booksy.`,
      url: DOMAIN + "/",
      extraSchema: schemaNegocio() + schemaFaq(faqPub),
    }) +
    header() +
    `
<main id="principal">

<section class="hero">
  <div class="wrap hero__grid">
    <div>
      <h1>Cortes con oficio, barbas a <em>navaja</em>.</h1>
      <p class="hero__texto">Barbería de barrio en Clara del Rey, Madrid. Corte clásico y degradado, arreglo de barba, afeitado tradicional premium con ozono y masaje, y cita online con la agenda real de la barbería.</p>
      <div class="hero__acciones">
        <a class="btn btn--miel" href="${BOOKSY}" target="_blank" rel="noopener" data-evento="booking_click" data-origen="hero">Reservar cita</a>
        <a class="btn btn--claro" href="#servicios">Ver servicios y precios</a>
      </div>
      <p class="prueba"><b>${String(rep.rating).replace(".", ",")}</b> sobre 5 · ${rep.count} reseñas de clientes verificadas en Booksy</p>
    </div>
    <div class="hero__foto foto-pendiente">Foto de la barbería<br>pendiente de autorización</div>
  </div>
</section>

<section class="seccion" id="centro">
  <div class="wrap relato">
    <div>
      <h2 class="titulo-seccion">Una barbería de las de siempre, en Clara del Rey.</h2>
      <p>${esc(NOMBRE)} está en la Calle de Clara del Rey, 58, en el barrio de Prosperidad. Aquí se viene a cortarse el pelo bien y sin prisas: cada corte se adapta al estilo de quien se sienta en el sillón.</p>
      <p>La carta va del corte rápido a máquina al servicio premium de una hora, con afeitado tradicional, ozono, masaje e hidratación. Hay precio propio para niños y jubilados, y todo se reserva en la misma agenda, con la disponibilidad real de la barbería.</p>
    </div>
    <dl class="relato__marcas">
      ${cfg.highlights.list.map((h) => `<dt>${esc(h.title)}</dt><dd>${esc(h.desc)}</dd>`).join("\n      ")}
    </dl>
  </div>
</section>

<section class="seccion seccion--piedra" id="servicios">
  <div class="wrap">
    <div class="seccion__cabeza">
      <h2>Servicios y precios</h2>
      <p>Precios y duraciones tal y como están publicados en la agenda de la barbería. Si quieres darte el capricho completo, el corte con barba premium lo reúne todo en una hora.</p>
    </div>
    ${carta}
    <div class="bloque-suelto">${bloqueDestacado()}</div>
  </div>
</section>

<section class="seccion" id="equipo">
  <div class="wrap">
    <div class="seccion__cabeza">
      <h2>Quién te atiende</h2>
      <p>${cfg.team.members.length ? "Al reservar puedes elegir con qué barbero quieres la cita." : "Un equipo de barberos profesionales. Al reservar en Booksy puedes elegir con quién quieres la cita."}</p>
    </div>
    ${cfg.team.members.length ? `<ul class="equipo">
      ${cfg.team.members.map((m) => `<li><span class="equipo__nombre">${esc(m.name)}</span></li>`).join("")}
    </ul>` : ""}
  </div>
</section>

<section class="seccion seccion--piedra" id="galeria">
  <div class="wrap">
    <div class="seccion__cabeza">
      <h2>La barbería y los cortes</h2>
      <p>Las fotografías se aprueban desde el panel del negocio. Hasta entonces esta sección queda marcada como pendiente.</p>
    </div>
    <div class="galeria" id="galeria">
      ${Array.from({ length: 4 }, () => `<div class="foto-pendiente">Foto pendiente</div>`).join("")}
    </div>
  </div>
</section>

<section class="seccion" id="preguntas">
  <div class="wrap">
    <div class="seccion__cabeza">
      <h2>Preguntas frecuentes</h2>
      <p>Escribe lo que quieras saber y se filtran las respuestas.</p>
    </div>
    <div class="buscador">
      <label for="faq-q">¿Qué quieres saber?</label>
      <input type="search" id="faq-q" placeholder="por ejemplo: cuánto cuesta un corte" autocomplete="off">
    </div>
    <div class="faq" id="faq">
      ${faqHtml}
      <p class="sin-resultados" id="faq-vacio" hidden>No hay ninguna respuesta para eso. ${PHONE ? `Llama al ${esc(PHONE_TXT)} y te lo resolvemos.` : `Pregúntanos en la barbería o al reservar en Booksy.`}</p>
    </div>
  </div>
</section>

<section class="seccion seccion--piedra" id="visita">
  <div class="wrap">
    <div class="seccion__cabeza">
      <h2>Cómo llegar</h2>
      <p>En el barrio de ${esc(cfg.business.neighborhood)}, ${esc(cfg.business.city)}.</p>
    </div>
    <div class="visita">
      <div>
        <dl class="datos">
          <dt>Dirección</dt>
          <dd><a href="${MAPS}" target="_blank" rel="noopener" data-evento="maps_click" data-origen="visita">${esc(DIR_TXT)}</a></dd>
          ${PHONE ? `<dt>Teléfono</dt>
          <dd>${telLink("visita")}</dd>` : ""}
          <dt>Reservas</dt>
          <dd><a href="${BOOKSY}" target="_blank" rel="noopener" data-evento="booking_click" data-origen="visita">Agenda online en Booksy</a></dd>
          <dt>Horario</dt>
        </dl>
        <ul class="horario">${horas}</ul>
      </div>
      <iframe class="mapa" loading="lazy" title="Mapa de situación de ${esc(NOMBRE)}"
        src="${cfg.contact.maps_embed}"
        referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
  </div>
</section>

</main>` +
    barraMovil() +
    footer()
  );
}

/* ----------------------------------------------------- páginas de servicio */
function paginaServicio(c) {
  const title = `${c.title} en Madrid | ${NOMBRE}`;
  const desc = `${c.lead} Precios y duraciones en ${NOMBRE}, Calle de Clara del Rey 58, Madrid. Reserva online.`;
  return (
    head({ title, desc, url: `${DOMAIN}/servicios/${c.slug}/`, extraSchema: schemaNegocio() }) +
    header() +
    `
<main id="principal">
  <div class="wrap">
    <nav class="migas" aria-label="Migas de pan"><a href="/">Inicio</a> / <a href="/#servicios">Servicios</a> / ${esc(c.title)}</nav>
  </div>
  <div class="wrap servicio-hero">
    <h1>${esc(c.title)} en Madrid</h1>
    <p>${esc(c.intro || c.lead)}</p>
    <a class="btn btn--miel" href="${BOOKSY}" target="_blank" rel="noopener" data-evento="booking_click" data-origen="pagina_servicio" data-servicio="${esc(c.title)}">Reservar cita</a>
  </div>
  <section class="seccion">
    <div class="wrap">
      <ul class="lista">${c.services.map(filaServicio).join("")}</ul>
      ${c.more_note ? `<p class="carta__lead nota-arriba">${esc(c.more_note)}</p>` : ""}
      <div class="bloque-suelto">${bloqueDestacado()}</div>
      <p class="bloque-suelto"><a href="/#servicios">Ver todos los servicios y precios</a></p>
    </div>
  </section>
</main>` +
    barraMovil() +
    footer()
  );
}

/* -------------------------------------------------------------- legales */
function paginaLegal(slug, titulo) {
  return (
    head({ title: `${titulo} | ${NOMBRE}`, desc: titulo, url: `${DOMAIN}/${slug}/` }) +
    header() +
    `<main id="principal"><section class="seccion legal"><div class="wrap">
      <h1>${esc(titulo)}</h1>
      <p class="nota-larga"><strong>Texto pendiente. Requiere revisión legal.</strong></p>
      <p class="nota-larga">Este documento debe redactarlo o validarlo un profesional con los datos reales del titular (denominación social, NIF, domicilio, registro y finalidades de tratamiento de datos). No se publica un texto generado automáticamente en su lugar.</p>
      <p class="nota-larga">${val(cfg.business.legal_name) ? `Titular: ${esc(val(cfg.business.legal_name))}.` : `Titular: pendiente de confirmar (nombre comercial: ${esc(NOMBRE)}).`} Dirección: ${esc(DIR_TXT)}.</p>
    </div></section></main>` +
    barraMovil() +
    footer()
  );
}

/* ------------------------------------------------------ robots y sitemap */
function sitemap() {
  const hoy = new Date().toISOString().slice(0, 10);
  const urls = ["/", ...pages.map((p) => `/servicios/${p.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${DOMAIN}${u}</loc><lastmod>${hoy}</lastmod><priority>${u === "/" ? "1.0" : "0.8"}</priority></url>`
  )
  .join("\n")}
</urlset>`;
}

const robots = `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${DOMAIN}/sitemap.xml
`;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1C1A17"/><text x="32" y="44" font-family="Georgia,serif" font-size="34" fill="#C8894F" text-anchor="middle">R</text></svg>`;

/* ------------------------------------------------------------------ run */
console.log(`\nCompilando ${NOMBRE}${DEV ? " (desarrollo)" : ""}\n`);
write("index.html", portada());
pages.forEach((c) => write(`servicios/${c.slug}/index.html`, paginaServicio(c)));
write("aviso-legal/index.html", paginaLegal("aviso-legal", "Aviso legal"));
write("privacidad/index.html", paginaLegal("privacidad", "Política de privacidad"));
write("cookies/index.html", paginaLegal("cookies", "Política de cookies"));
write(
  "admin/config.js",
  `/* Generado por build.js. No editar a mano: cambiar data/config.json.
   La anon key de Supabase es pública por diseño; lo que protege los datos
   son las políticas RLS del esquema, no ocultar esta clave. */
window.PANEL_CONFIG = ${JSON.stringify(
    { supabaseUrl: cfg.supabase.url, supabaseKey: cfg.supabase.anon_key },
    null,
    2
  )};\n`
);
write("sitemap.xml", sitemap());
write("robots.txt", robots);
write("favicon.svg", favicon);

/* aviso de datos sin verificar */
const pend = [];
const walk = (o, p = "") => {
  if (o && typeof o === "object") {
    if ("verified" in o && o.verified === false) pend.push(p);
    Object.entries(o).forEach(([k, v]) => walk(v, p ? `${p}.${k}` : k));
  }
};
walk(cfg);
if (pend.length) {
  console.log(`\n⚠  ${pend.length} campos sin verificar. Confirmar antes de publicar:`);
  pend.forEach((p) => console.log("   -", p));
}
console.log("\nListo. Sirve la carpeta public/ para verlo.\n");
