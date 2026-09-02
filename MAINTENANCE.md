# Mantenimiento

Todo lo que se cambia a menudo está en la carpeta `data/`. Después de
cualquier cambio, siempre lo mismo:

```bash
node build.js
git add . && git commit -m "descripción del cambio" && git push
```

Cloudflare publica solo en un par de minutos.

---

## Cambiar un precio o una duración

`data/services.json`. Busca el tratamiento y edita `price` (número, sin el
símbolo del euro) y `duration` (texto, tal y como aparece en Booksy).

```json
{ "name": "Drenaje Linfático", "price": 65, "duration": "1h" }
```

**Importante:** el precio de la web tiene que coincidir con el de Booksy. Si
cambia en Booksy, cambia aquí. Un precio distinto en los dos sitios genera
desconfianza y reclamaciones.

## Añadir un tratamiento

En `data/services.json`, dentro de la categoría que le corresponda:

```json
{ "name": "Nombre exacto", "price": 80, "duration": "1h", "desc": "Una frase." }
```

`desc` es opcional. Añade `"popular": true` para que salga la marca de "Más
reservado", pero solo si de verdad lo es.

## Crear una categoría nueva con página propia

```json
{
  "slug": "nombre-sin-tildes-ni-espacios",
  "title": "Nombre visible",
  "page": true,
  "lead": "Una línea para la portada.",
  "intro": "Un párrafo para la cabecera de su página.",
  "services": [ ... ]
}
```

Con `"page": true` se genera `/tratamientos/{slug}/` y entra sola en el menú
del pie y en el sitemap. Con `false`, la categoría solo aparece en la carta de
la portada.

## Cambiar el teléfono o la dirección

`data/config.json`, dentro de `contact`. El teléfono va dos veces: `value` en
formato internacional sin espacios (`+34984392280`, que es lo que marca el
móvil) y `display` como se lee (`984 39 22 80`).

## Activar el botón de WhatsApp

Hoy no hay número confirmado, así que en móvil sale "Llamar" en su lugar.
Cuando lo haya:

```json
"whatsapp": { "value": "+34600000000", "verified": true }
```

El botón aparece solo, en la barra inferior del móvil, y sus clics empiezan a
contarse en el panel.

## Cambiar el horario

`data/config.json`, en `hours.week`. Cada día lleva una lista de tramos; un
día cerrado lleva la lista vacía:

```json
{ "day": "Sábado", "slots": ["10:00–14:00"] }
{ "day": "Domingo", "slots": [] }
```

Cambia también `"verified": true` cuando el negocio lo haya confirmado.
El horario alimenta la web y los datos estructurados de Google a la vez.

## Cambiar el equipo

`data/config.json`, en `team.members`. Solo se publican los nombres. Para
añadir especialidades hay que confirmarlas antes con el negocio.

## Preguntas frecuentes

Hay dos sitios y conviene saber la diferencia:

- **`data/faq.json`** es lo que sale en la web pública y en los datos
  estructurados de Google. Se edita aquí y se recompila.
- **El panel** guarda preguntas en la base de datos. Sirve para que el negocio
  anote preguntas nuevas sin tocar código. Pasarlas a la web es un paso
  manual, pensado precisamente para que nadie publique sin revisar.

Una pregunta con `"draft": true` no se publica. Sirve para dejar preparada una
pregunta cuya respuesta aún no está confirmada.

## Fotografías

Ahora mismo no hay ninguna: los recuadros rayados marcan los huecos.

Cuando el negocio autorice las fotos:

1. Guardarlas en `public/assets/images/` en `.webp`, con nombres descriptivos
   y a un ancho máximo de 1600 px.
2. Sustituir los `<div class="foto-pendiente">` de `build.js` por etiquetas
   `<img>` con `alt` real y `loading="lazy"` en todo lo que no sea la primera
   imagen de la portada.

Para la galería, la alternativa sin tocar código es subir la imagen a Supabase
Storage y pegar su dirección en el panel, sección Contenido. Solo se ven en la
web las marcadas como publicadas.

## Cambiar el enlace de Booksy

`data/config.json`, en `booking.url`. Es el único sitio donde vive: todos los
botones de la web lo usan.

## Instagram

`data/config.json`, en `social.instagram`.

## Textos legales

Están vacíos a propósito, con un aviso de que requieren revisión legal. Cuando
llegue el texto definitivo del abogado o gestor, se sustituye el contenido de
la función `paginaLegal()` en `build.js`. No pongas ahí un texto genérico
copiado de otra web.

---

## Qué mirar cada mes en el panel

1. **Personas que visitaron la web.** ¿Sube o baja respecto al mes anterior?
2. **Quisieron reservar.** Es el número que importa. Si suben las visitas pero
   no este, el problema está en la web, no en la captación.
3. **Tratamientos más consultados.** Sirve para decidir promociones y qué
   contenido reforzar.
4. **De dónde llegan.** Si Google sube, el SEO está funcionando. Si Instagram
   sube, las publicaciones están funcionando.

Recuerda que "quisieron reservar" cuenta clics en el botón, no reservas
confirmadas. La reserva ocurre dentro de Booksy y desde aquí no se ve.

## Si algo se rompe

- **La web no se actualiza:** mira Cloudflare → Deployments. Si el último está
  en rojo, el error de compilación sale en el log.
- **El panel no carga datos:** normalmente es la sesión. Salir y volver a
  entrar. Si sigue, revisa que el usuario esté en la tabla `admins`.
- **No se registran eventos:** comprueba las variables de entorno en
  Cloudflare (paso J de DEPLOYMENT.md). La web sigue funcionando igual; solo
  se pierden los datos de ese periodo.
