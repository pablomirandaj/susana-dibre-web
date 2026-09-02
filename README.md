# Susana Dibré — web y panel

Sistema de captación digital para Susana Dibré, centro ecológico de estética
integral en Av. del Llano 27, Gijón.

La web atrae y convence. Booksy gestiona la reserva. El panel demuestra qué
está generando la web.

---

## Qué hay aquí

```
/
├── data/                 Contenido del negocio. Es la única fuente de verdad.
│   ├── config.json       Datos del negocio, contacto, horario, enlaces
│   ├── services.json     Carta de tratamientos (precios y duraciones de Booksy)
│   └── faq.json          Preguntas frecuentes de la web pública
│
├── build.js              Generador estático. Convierte data/ en HTML.
│
├── public/               Lo que se publica. Salida del build + estáticos.
│   ├── index.html        (generado)
│   ├── tratamientos/     (generado) una carpeta por categoría con página propia
│   ├── styles.css        Hoja de estilo de la web pública
│   ├── script.js         Eventos, buscador de FAQ, menú móvil
│   ├── admin/            Panel privado
│   ├── robots.txt        (generado)
│   └── sitemap.xml       (generado)
│
├── functions/api/track.js  Función de Cloudflare que recibe los eventos
├── supabase/schema.sql     Tablas, seguridad y cálculo de KPIs
└── .env.example            Variables de entorno necesarias
```

Los archivos generados se versionan igualmente: así lo que hay en `public/` es
exactamente lo que se publica, sin sorpresas en el despliegue.

---

## Desarrollo local

Requiere Node 18 o superior. No hay dependencias que instalar.

```bash
node build.js --dev     # compila con el aviso de datos sin verificar
npm run dev             # compila y sirve en http://localhost:3000
```

`--dev` añade una banda amarilla arriba recordando qué datos siguen sin
confirmar. La compilación de producción (`node build.js`) no la incluye.

---

## Por qué está construido así

**Web pública sin framework.** El sitio son ocho páginas de contenido
prácticamente estático. React o Next añadirían un paso de compilación, un
runtime en el navegador y una superficie de mantenimiento que nadie va a
necesitar aquí. Coste: 0 €.

**Pero con un generador propio.** El SEO local necesita que el contenido esté
en el HTML, no inyectado por JavaScript. Y para reutilizar el proyecto en otro
negocio hace falta que el contenido viva en JSON. `build.js` resuelve las dos
cosas en unas 300 líneas sin dependencias. La alternativa (escribir el HTML a
mano por cliente) no aguanta más de dos o tres negocios.

**Supabase para el panel.** Autenticación real, base de datos Postgres y
seguridad a nivel de fila en el plan gratuito. La alternativa, Cloudflare
Access, es más simple de montar pero no da base de datos, y aquí hacen falta
las dos cosas. Coste: 0 € hasta volúmenes muy por encima de los de un negocio
local.

**Analítica propia en vez de solo GA4.** El informe mensual tiene que salir de
una consulta SQL directa. Sacar esos mismos números de la API de GA4 es mucho
más trabajo y depende de un tercero. GA4 puede añadirse en paralelo cuando el
negocio lo quiera.

**Los KPIs se calculan en SQL, nunca con IA.** Las funciones `kpis_mes` y
`serie_meses` del esquema hacen las cuentas. Si más adelante se redactan
conclusiones automáticas, se redactarán sobre esos números ya calculados.

---

## Estado de los datos

Todo el contenido publicado procede de fuentes verificables (perfil de Booksy
del negocio, directorios). Nada está inventado. Estos campos siguen **sin
confirmar** y aparecen listados al final de cada compilación:

| Campo | Situación |
|---|---|
| Teléfono | 984 39 22 80. Coincide en cuatro directorios, sin confirmación del negocio |
| Horario | Booksy indica jornada partida, Fresha continuada. Es una inferencia |
| WhatsApp | Sin número. Mientras no lo haya, el botón no se genera |
| Valoración de Google | No verificada. Solo se publica la de Booksy, con su fuente a la vista |
| Enlace de Google Maps | Búsqueda genérica. Sustituir por el del perfil real |
| Año de apertura | Desconocido. No aparece en ningún sitio de la web |
| Fotografías | Ninguna. Las cajas rayadas marcan los huecos hasta tener autorización |
| Aparcamiento y preparación previa | Preguntas en borrador, no se publican |

Los textos legales están deliberadamente vacíos y marcados para revisión
jurídica. No se publica un texto legal generado automáticamente.

---

## Siguientes fases

**Fase 2** — Informe mensual automático y su email, versión en inglés con
hreflang, galería alimentada desde Instagram con aprobación manual.

**Fase 3** — Datos de Booksy más allá del clic (reservas confirmadas,
cancelaciones, ingresos), solo si existe acceso oficial. Hasta comprobarlo no
se promete.

Ver `ARCHITECTURE.md` para el detalle técnico, `DEPLOYMENT.md` para publicar y
`MAINTENANCE.md` para el día a día.
# susana-dibre-web
