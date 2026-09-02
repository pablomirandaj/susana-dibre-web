# Guía de despliegue

Desde "tengo los archivos en el ordenador" hasta "la web funciona en
www.susanadibre.es".

Sigue los pasos en orden. Si algo falla, no continúes: cada bloque termina con
una comprobación.

**Antes de empezar necesitas:** una cuenta de GitHub, una de Cloudflare, una
de Supabase (las tres gratuitas) y la autorización del negocio para el
dominio. El dominio es el único gasto de toda la guía: entre 10 y 15 € al año.

---

## A. Preparar el proyecto

```bash
cd susana-dibre
node --version        # tiene que decir v18 o superior
node build.js --dev
```

**Comprueba:** la consola lista los archivos generados y termina con el aviso
de campos sin verificar.

---

## B. Verlo funcionando en local

```bash
npm run dev
```

Abre `http://localhost:3000`.

**Comprueba:** carga la portada, el menú lleva a cada sección, el buscador de
preguntas filtra al escribir "cancelar", y las páginas de tratamiento abren
desde los enlaces de la carta.

Prueba también a estrechar la ventana hasta 375 px de ancho: debe aparecer la
barra inferior con "Llamar" y "Reservar cita".

---

## C. Confirmar los datos pendientes

Este paso no es opcional. Llama al centro y confirma:

- Teléfono correcto.
- Horario real (¿jornada partida o continua?).
- Si hay WhatsApp de negocio y qué número.
- Enlace de su ficha de Google Business.
- Si autoriza usar las fotos de su Instagram en la web.
- Aparcamiento y preparación previa a los tratamientos (dos preguntas de la
  FAQ están en borrador esperando esto).

Actualiza `data/config.json` y `data/faq.json` con lo confirmado y pon
`"verified": true` en los campos que corresponda.

**Comprueba:** `node build.js` ya no lista esos campos como pendientes.

---

## D. Crear el repositorio en GitHub

En github.com, botón **New repository**. Nombre: `susana-dibre-web`. Privado.
Sin README ni .gitignore (ya los tienes).

```bash
git init
git add .
git commit -m "Web y panel de Susana Dibré"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/susana-dibre-web.git
git push -u origin main
git checkout -b dev
git push -u origin dev
```

**Comprueba:** en GitHub ves las dos ramas y la carpeta `public/` con el HTML.
**Comprueba también:** que NO aparece ningún archivo `.env`.

---

## E. Crear el proyecto en Supabase

1. supabase.com → **New project**. Región: Frankfurt (la más cercana).
2. Guarda la contraseña de la base de datos en un gestor de contraseñas.
3. **SQL Editor** → **New query** → pega todo `supabase/schema.sql` → **Run**.

**Comprueba:** en Table Editor aparecen `businesses`, `admins`, `events`,
`gallery`, `faq` y `monthly_reports`, y `businesses` tiene una fila.

---

## F. Crear el usuario administrador

1. **Authentication** → **Users** → **Add user** → correo y contraseña del
   negocio. Marca el correo como confirmado.
2. Copia el `User UID` que aparece en la lista.
3. **SQL Editor**, sustituyendo el UID y el correo:

```sql
insert into admins (user_id, business_id, email)
values ('PEGA-AQUI-EL-UID',
        (select id from businesses where slug = 'susana-dibre'),
        'correo@delnegocio.es');
```

**Comprueba:** `select * from admins;` devuelve una fila.

---

## G. Poner las claves de Supabase en el proyecto

En Supabase, **Project Settings** → **API**. Copia:

- **Project URL**
- **anon public** key
- **service_role** key (esta es secreta)

En `data/config.json`, rellena solo las dos primeras:

```json
"supabase": {
  "url": "https://xxxxx.supabase.co",
  "anon_key": "eyJhbGci..."
}
```

La `service_role` **no va aquí ni en ningún archivo del repositorio**. Va en
Cloudflare, en el paso J.

```bash
node build.js
git add . && git commit -m "Configurar Supabase" && git push
```

---

## H. Publicar en Cloudflare Pages

1. dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Autoriza GitHub y elige `susana-dibre-web`.
3. Configuración de compilación:
   - Framework preset: **None**
   - Build command: `node build.js`
   - Build output directory: `public`
   - Production branch: `main`
4. **Save and Deploy**.

**Comprueba:** el despliegue termina en verde y la web abre en
`susana-dibre-web.pages.dev`.

---

## I. Comprobar que la función de eventos existe

Abre `https://susana-dibre-web.pages.dev` y luego, en Cloudflare, el proyecto
→ **Functions**.

**Comprueba:** aparece la ruta `/api/track`.

Todavía no guardará nada: faltan las variables del paso siguiente.

---

## J. Variables de entorno

Proyecto en Cloudflare → **Settings** → **Variables and secrets** → **Add**,
para el entorno **Production**:

| Nombre | Valor | Tipo |
|---|---|---|
| `SUPABASE_URL` | Project URL | Texto |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **Secreto** |

Repite lo mismo para el entorno **Preview**.

Vuelve a desplegar: **Deployments** → último → **Retry deployment**.

**Comprueba:** entra en la web, pulsa "Reservar cita", y en Supabase mira
`select * from events order by created_at desc limit 5;`. Debe haber al menos
un `page_view` y un `booking_click`.

Si no aparece nada, mira los logs en Cloudflare → **Functions** → **Logs**.

---

## K. Dominio y DNS

Solo con la autorización del negocio, y solo si el dominio ya está comprado.

1. En Cloudflare Pages → **Custom domains** → **Set up a custom domain** →
   `www.susanadibre.es`.
2. Cloudflare indica el registro CNAME a crear. Si el dominio está registrado
   fuera de Cloudflare, hay que crearlo en el panel del registrador.
3. Repite para `susanadibre.es` y configura la redirección al `www`.
4. Repite para `panel.susanadibre.es`.

**Comprueba:** las tres direcciones abren y el candado del navegador sale sin
avisos. El certificado puede tardar hasta 15 minutos.

Si `panel.susanadibre.es` apunta al mismo proyecto, el panel queda en
`/admin/`. Para servirlo en la raíz del subdominio se añade una regla de
redirección en Cloudflare.

---

## L. Probar el panel

Abre `panel.susanadibre.es/admin/` y entra con el usuario del paso F.

**Comprueba:**
- Con las credenciales correctas entra y muestra el resumen.
- Con credenciales incorrectas da un error claro, no una pantalla en blanco.
- Si el mes aún no tiene datos, dice que no hay datos suficientes en vez de
  enseñar ceros o comparativas inventadas.
- El botón Salir cierra sesión y al recargar pide contraseña otra vez.

---

## M. Google Analytics 4 (opcional)

Solo si el negocio lo quiere. **Ojo:** GA4 usa cookies, así que a partir de
ahí hace falta banner de consentimiento y la política de cookies deja de ser
un trámite.

Si se decide que sí: crear propiedad en analytics.google.com, copiar el ID
`G-XXXXXXX` a `analytics.ga4_id` en `config.json`, y añadir el banner antes de
cargar el script. No pongas un ID de ejemplo: sin ID real, mejor sin GA4.

---

## N. Search Console

1. search.google.com/search-console → **Añadir propiedad** → **Prefijo de
   URL** → `https://www.susanadibre.es`.
2. Verifica con el método de etiqueta HTML: copia la etiqueta `<meta>` y
   añádela en la función `head()` de `build.js`. Recompila y sube.
3. Una vez verificado: **Sitemaps** → envía `sitemap.xml`.
4. **Inspección de URLs** → pega la portada → **Solicitar indexación**.

**Comprueba:** el sitemap aparece como "Correcto" con 7 URLs detectadas.

---

## O. Google Business Profile

En el perfil del negocio en Google, añade `https://www.susanadibre.es` como
sitio web. Es de los cambios que más tráfico mueve en un negocio local, y es
gratis.

Aprovecha para comprobar que el horario del perfil coincide con el de la web.

---

## P. Booksy

Comprueba que el enlace de `config.json` abre la ficha correcta.

Si el negocio quiere el widget oficial: en Booksy Biz, sección de marketing,
está el botón "Reservar" para webs. Pega el snippet en `config.json`
(`booking.widget`) y activa la opción.

No hace falta pedir nada a Booksy para el enlace directo, que es lo que hay
montado ahora.

---

## Q. Repaso final antes de dar la web por buena

**Web**
- [ ] Menú, enlaces internos y migas de pan funcionan
- [ ] "Reservar cita" abre la ficha correcta de Booksy en pestaña nueva
- [ ] Teléfono llama desde el móvil
- [ ] "Cómo llegar" abre la ubicación correcta
- [ ] Instagram abre el perfil correcto
- [ ] Precios y duraciones coinciden con Booksy

**Responsive** a 375, 430, 768, 1024 y 1440 px
- [ ] Sin scroll horizontal
- [ ] Texto legible, botones cómodos de pulsar
- [ ] La barra inferior no tapa contenido

**Accesibilidad**
- [ ] Se puede recorrer la web con el tabulador y se ve dónde está el foco
- [ ] Las imágenes tienen texto alternativo

**Panel**
- [ ] Login, logout y sesión funcionan
- [ ] Sin sesión no se ve ningún dato
- [ ] Aprobar y ocultar fotos funciona
- [ ] Crear y desactivar preguntas funciona

**Seguridad**
- [ ] Ninguna clave secreta en el repositorio: `git grep -i "service_role"`
      no debe devolver ninguna clave
- [ ] `/admin/` está en `robots.txt` como Disallow

**SEO**
- [ ] Cada página tiene su título y descripción propios
- [ ] `sitemap.xml` accesible y enviado
- [ ] Datos estructurados sin errores en
      search.google.com/test/rich-results

---

## Trabajo del día a día

```bash
git checkout dev
# cambios
node build.js
git add . && git commit -m "Actualizar precios" && git push
```

Cloudflare crea una URL de vista previa para la rama `dev`. Cuando el negocio
la valide, se fusiona en `main` y se publica:

```bash
git checkout main && git merge dev && git push
```
