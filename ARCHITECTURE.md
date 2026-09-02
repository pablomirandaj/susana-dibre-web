# Arquitectura

## Vista general

```
   Google        Instagram       Google Maps        QR / boca a boca
      |              |                |                    |
      +--------------+----------------+--------------------+
                              |
                     WEB PÚBLICA (Cloudflare Pages)
                     HTML generado desde data/*.json
                     Tratamientos · Equipo · FAQ · Cómo llegar
                              |
                    +---------+---------+
                    |                   |
            "Reservar cita"      Teléfono / Maps / Instagram
                    |                   |
                    v                   |
                 BOOKSY                 |
          (única agenda del negocio)    |
                                        |
                              cada clic dispara un evento
                                        |
                                        v
                          POST /api/track  (Cloudflare Function)
                          valida, recorta y anonimiza
                                        |
                                        v
                            SUPABASE · tabla events
                            RLS activo, service role solo en el servidor
                                        |
                    +-------------------+-------------------+
                    |                                       |
            kpis_mes() / serie_meses()              monthly_reports
             cálculo en SQL, no IA                  (Fase 2)
                    |                                       |
                    v                                       v
              PANEL PRIVADO (panel.susanadibre.es)     Email mensual
              Supabase Auth · Resumen · Contenido      (Fase 2)
              Preguntas · Informes
```

## Piezas

### Web pública
Ficheros estáticos servidos desde el CDN de Cloudflare. Sin framework, sin
runtime, sin build en el servidor: `build.js` se ejecuta antes de subir y
deja el HTML final en `public/`.

Páginas generadas:

- `/` portada con la carta completa
- `/tratamientos/{rituales, masajes, faciales, corporal, micropigmentacion, depilacion-laser}/`
- `/aviso-legal/`, `/privacidad/`, `/cookies/` (pendientes de revisión legal)

Cada página de tratamiento existe por SEO: la intención de búsqueda real es
"micropigmentación Gijón" o "depilación láser Gijón", no "estética Gijón".
Meterlo todo en la portada desperdicia esas búsquedas.

### Reservas
Booksy es el motor de reservas y no se sustituye. La web enlaza a la ficha
oficial del negocio. Cuando el negocio facilite el widget oficial de Booksy
Biz, se activa desde `config.json` (`booking.widget.enabled`) sin tocar código.

No existe ni existirá una segunda agenda: la disponibilidad vive en Booksy.

### Analítica
El navegador nunca escribe en la base de datos. Manda el evento a
`/api/track`, una función de Cloudflare que valida el tipo de evento contra
una lista cerrada, recorta los campos y escribe en Supabase con la clave de
servicio, que solo existe en el entorno de Cloudflare.

Eventos: `page_view`, `booking_click`, `whatsapp_click`, `phone_click`,
`maps_click`, `instagram_click`, `service_view`, `faq_sin_resultado`.

`service_view` solo se dispara si el bloque lleva dos segundos visible. Un
scroll rápido no es interés.

**Privacidad.** No hay cookies. El identificador de sesión es aleatorio, vive
en `sessionStorage` y desaparece al cerrar la pestaña. No se guarda IP,
navegador ni nada que identifique a una persona: solo el país que aporta
Cloudflare. Por eso no hace falta banner de consentimiento. Si algún día se
añade GA4, esa decisión cambia y habrá que poner banner.

### Panel privado
Página estática protegida por Supabase Auth. La protección real está en las
políticas RLS de la base de datos: aunque alguien abra el HTML del panel, sin
sesión válida las consultas no devuelven nada. Ocultar la interfaz no es
seguridad.

### Base de datos

| Tabla | Para qué |
|---|---|
| `businesses` | Un registro por negocio |
| `admins` | Qué usuario administra qué negocio |
| `events` | Eventos de la web |
| `gallery` | Fotos, con estado `pending` / `approved` / `rejected` |
| `faq` | Preguntas editables desde el panel |
| `monthly_reports` | Foto fija mensual de los KPIs (Fase 2) |

Todas llevan `business_id` desde el primer día. Hoy hay un solo negocio, pero
añadir el segundo no obliga a migrar nada.

### Cálculo de KPIs
`kpis_mes(p_mes)` devuelve el mes pedido y el anterior, con la lista de
tratamientos más vistos y el origen del tráfico. `serie_meses(n)` devuelve la
serie para la gráfica. Ambas comprueban que quien pregunta es administrador.

La variación se calcula como `(actual - previo) / previo * 100`, con el caso
de divisor cero controlado: si no hay mes anterior, el panel dice que aún no
hay comparativa en vez de inventar un porcentaje.

## Vocabulario que importa

Un clic en "Reservar cita" es **intención de reserva**, no una reserva. La
reserva ocurre en Booksy y hoy no tenemos forma oficial de saber si se
completó. El panel nunca dice "reservas": dice "quisieron reservar". Esa
distinción se mantiene mientras no haya acceso oficial a los datos de Booksy.

## Reutilizar en otro negocio

1. Copiar el repositorio.
2. Reescribir `data/config.json`, `data/services.json` y `data/faq.json`.
3. Revisar la dirección artística de `public/styles.css`: los colores y las
   tipografías están elegidos para este centro concreto y no deben viajar tal
   cual a un negocio distinto.
4. Nuevo proyecto en Cloudflare Pages, nueva fila en `businesses`.

Los pasos 1, 2 y 4 son mecánicos. El 3 es trabajo de diseño y no se salta.
