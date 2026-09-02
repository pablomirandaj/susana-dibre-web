/* =========================================================================
   Panel privado. Autenticación real con Supabase Auth; los datos están
   protegidos por RLS en la base de datos, no por esconder esta pantalla.
   ========================================================================= */
(function () {
  "use strict";

  var CFG = window.PANEL_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };

  if (!CFG.supabaseUrl || !CFG.supabaseKey) {
    document.body.innerHTML =
      '<p style="font-family:sans-serif;padding:2rem;max-width:40rem">' +
      "Falta la configuración de Supabase. Rellena <code>supabase.url</code> y " +
      "<code>supabase.anon_key</code> en <code>data/config.json</code> y vuelve a " +
      "ejecutar <code>node build.js</code>.</p>";
    return;
  }

  var sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey);
  var negocioId = null;

  /* ------------------------------------------------------------ utilidades */
  function num(n) { return (n || 0).toLocaleString("es-ES"); }

  function variacion(actual, previo) {
    if (!previo) return null;              // división entre cero controlada
    return ((actual - previo) / previo) * 100;
  }

  function pintaVariacion(v) {
    if (v === null) return '<span class="kpi__var igual">Sin mes anterior para comparar</span>';
    var cls = v > 0.05 ? "sube" : v < -0.05 ? "baja" : "igual";
    var sig = v > 0.05 ? "↑ +" : v < -0.05 ? "↓ " : "= ";
    return '<span class="kpi__var ' + cls + '">' + sig + v.toFixed(1).replace(".", ",") + "%</span>";
  }

  function tarjetaKpi(etiqueta, actual, previo) {
    return (
      '<div class="kpi"><div class="kpi__etiqueta">' + etiqueta + "</div>" +
      '<div class="kpi__cifra">' + num(actual) + "</div>" +
      pintaVariacion(variacion(actual, previo)) + "</div>"
    );
  }

  function listaBarras(filas) {
    if (!filas || !filas.length) return '<p class="estado">Sin datos todavía.</p>';
    var max = Math.max.apply(null, filas.map(function (f) { return f.total; }));
    return '<ul class="barras">' + filas.map(function (f) {
      var pct = max ? (f.total / max) * 100 : 0;
      return "<li><span>" + f.nombre + "</span><b>" + num(f.total) + "</b>" +
        '<span class="pista"><span class="relleno" style="width:' + pct + '%"></span></span></li>';
    }).join("") + "</ul>";
  }

  /* ---------------------------------------------------------------- acceso */
  $("form-login").addEventListener("submit", async function (e) {
    e.preventDefault();
    var err = $("error-login");
    err.hidden = true;
    var r = await sb.auth.signInWithPassword({ email: $("email").value, password: $("pass").value });
    if (r.error) {
      err.textContent = "No hemos podido entrar con esos datos. Revisa el correo y la contraseña.";
      err.hidden = false;
      return;
    }
    arrancar();
  });

  $("salir").addEventListener("click", async function () {
    await sb.auth.signOut();
    location.reload();
  });

  async function arrancar() {
    var s = await sb.auth.getSession();
    if (!s.data.session) {
      $("acceso").hidden = false;
      $("panel").hidden = true;
      return;
    }
    var admin = await sb.from("admins").select("business_id, email").single();
    if (admin.error || !admin.data) {
      await sb.auth.signOut();
      $("acceso").hidden = false;
      $("error-login").textContent = "Esta cuenta no tiene permisos sobre el negocio.";
      $("error-login").hidden = false;
      return;
    }
    negocioId = admin.data.business_id;
    $("quien").textContent = s.data.session.user.email;
    $("acceso").hidden = true;
    $("panel").hidden = false;
    prepararMeses();
    cargarResumen();
  }

  /* ------------------------------------------------------------- pestañas */
  $("pestanas").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-vista]");
    if (!b) return;
    [].forEach.call($("pestanas").children, function (x) { x.classList.toggle("activa", x === b); });
    document.querySelectorAll("main section[data-vista]").forEach(function (s) {
      s.hidden = s.dataset.vista !== b.dataset.vista;
    });
    if (b.dataset.vista === "contenido") cargarGaleria();
    if (b.dataset.vista === "faq") cargarFaq();
    if (b.dataset.vista === "informes") cargarInformes();
  });

  /* -------------------------------------------------------------- resumen */
  function prepararMeses() {
    var sel = $("mes");
    var hoy = new Date();
    for (var i = 0; i < 12; i++) {
      var d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      var o = document.createElement("option");
      o.value = d.toISOString().slice(0, 10);
      o.textContent = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
      sel.appendChild(o);
    }
    sel.addEventListener("change", cargarResumen);
  }

  async function cargarResumen() {
    var estado = $("estado-resumen");
    estado.hidden = false;
    estado.textContent = "Cargando datos…";
    $("kpis").hidden = true;

    var r = await sb.rpc("kpis_mes", { p_mes: $("mes").value });
    if (r.error) {
      estado.textContent = "No se han podido cargar los datos. Vuelve a intentarlo en un momento.";
      return;
    }
    var d = r.data, a = d.actual, p = d.previo;

    if (!a.visitas && !a.reservar) {
      estado.textContent = "Todavía no hay datos de este mes. Aparecerán en cuanto la web reciba visitas.";
      return;
    }
    estado.hidden = true;

    var comparable = d.hay_comparativa;
    $("kpis").innerHTML =
      tarjetaKpi("Personas que visitaron la web", a.personas, comparable ? p.personas : 0) +
      tarjetaKpi("Quisieron reservar", a.reservar, comparable ? p.reservar : 0) +
      tarjetaKpi("Contactos por WhatsApp", a.whatsapp, comparable ? p.whatsapp : 0) +
      tarjetaKpi("Llamadas", a.telefono, comparable ? p.telefono : 0) +
      tarjetaKpi("Buscaron cómo llegar", a.maps, comparable ? p.maps : 0);
    $("kpis").hidden = false;

    $("periodo").textContent = comparable
      ? "Comparado con el mes anterior"
      : "Todavía no hay datos suficientes para comparar con el mes anterior";

    $("servicios").innerHTML = listaBarras(d.servicios);
    $("origen").innerHTML = listaBarras(d.origen);

    var h = await sb.rpc("serie_meses", { p_meses: 6 });
    if (!h.error && h.data && h.data.length) {
      var max = Math.max.apply(null, h.data.map(function (m) { return m.visitas; })) || 1;
      $("historico").className = "historico";
      $("historico").innerHTML = h.data.map(function (m) {
        return "<div><b>" + num(m.visitas) + '</b><span class="col" style="height:' +
          (m.visitas / max) * 100 + '%"></span><span>' + m.mes.slice(5) + "/" + m.mes.slice(2, 4) + "</span></div>";
      }).join("");
    }
  }

  /* ------------------------------------------------------------- galería */
  async function cargarGaleria() {
    var c = $("galeria");
    c.textContent = "Cargando…";
    var r = await sb.from("gallery").select("*").order("position").order("created_at", { ascending: false });
    if (r.error) { c.textContent = "No se ha podido cargar la galería."; return; }
    if (!r.data.length) { c.className = "estado"; c.textContent = "Aún no hay fotos. Añade la primera con el formulario de arriba."; return; }

    c.className = "rejilla";
    c.innerHTML = r.data.map(function (f) {
      var ok = f.status === "approved";
      return '<div class="item"><img src="' + f.image_url + '" alt="' + (f.alt || "") + '" loading="lazy">' +
        '<div class="item__pie"><span class="marca-estado ' + (ok ? "aprobada" : "") + '">' +
        (ok ? "Publicada" : "Oculta") + "</span>" +
        '<span><button class="btn--mini" data-accion="alternar" data-id="' + f.id + '" data-estado="' + f.status + '">' +
        (ok ? "Ocultar" : "Publicar") + "</button> " +
        '<button class="btn--mini" data-accion="borrar" data-id="' + f.id + '">Borrar</button></span></div></div>';
    }).join("");
  }

  $("form-foto").addEventListener("submit", async function (e) {
    e.preventDefault();
    await sb.from("gallery").insert({
      business_id: negocioId,
      image_url: $("foto-url").value,
      alt: $("foto-alt").value,
      status: "pending"
    });
    this.reset();
    cargarGaleria();
  });

  $("galeria").addEventListener("click", async function (e) {
    var b = e.target.closest("button[data-accion]");
    if (!b) return;
    if (b.dataset.accion === "alternar") {
      await sb.from("gallery")
        .update({ status: b.dataset.estado === "approved" ? "pending" : "approved" })
        .eq("id", b.dataset.id);
    } else if (confirm("¿Borrar esta foto de la galería?")) {
      await sb.from("gallery").delete().eq("id", b.dataset.id);
    }
    cargarGaleria();
  });

  /* ------------------------------------------------------------------ faq */
  async function cargarFaq() {
    var c = $("lista-faq");
    c.textContent = "Cargando…";
    var r = await sb.from("faq").select("*").order("position");
    if (r.error) { c.textContent = "No se han podido cargar las preguntas."; return; }
    if (!r.data.length) { c.className = "estado"; c.textContent = "Todavía no hay preguntas guardadas aquí."; return; }
    c.className = "";
    c.innerHTML = r.data.map(function (f) {
      return '<div class="faq-item"><h4>' + f.question_es + "</h4><p>" + f.answer_es + "</p>" +
        '<button class="btn--mini" data-accion="activar" data-id="' + f.id + '" data-activo="' + f.active + '">' +
        (f.active ? "Desactivar" : "Activar") + "</button> " +
        '<button class="btn--mini" data-accion="borrar" data-id="' + f.id + '">Borrar</button></div>';
    }).join("");
  }

  $("form-faq").addEventListener("submit", async function (e) {
    e.preventDefault();
    await sb.from("faq").insert({
      business_id: negocioId,
      question_es: $("faq-p").value,
      answer_es: $("faq-r").value
    });
    this.reset();
    cargarFaq();
  });

  $("lista-faq").addEventListener("click", async function (e) {
    var b = e.target.closest("button[data-accion]");
    if (!b) return;
    if (b.dataset.accion === "activar") {
      await sb.from("faq").update({ active: b.dataset.activo !== "true" }).eq("id", b.dataset.id);
    } else if (confirm("¿Borrar esta pregunta?")) {
      await sb.from("faq").delete().eq("id", b.dataset.id);
    }
    cargarFaq();
  });

  /* -------------------------------------------------------------- informes */
  async function cargarInformes() {
    var c = $("informes");
    c.textContent = "Cargando…";
    var r = await sb.from("monthly_reports").select("*").order("month", { ascending: false });
    if (r.error) { c.textContent = "No se han podido cargar los informes."; return; }
    if (!r.data.length) {
      c.className = "estado";
      c.textContent = "El primer informe se guardará al cerrar el mes en curso.";
      return;
    }
    c.className = "";
    c.innerHTML = r.data.map(function (i) {
      var k = i.kpis || {};
      return '<div class="tarjeta"><h3>' +
        new Date(i.month).toLocaleDateString("es-ES", { month: "long", year: "numeric" }) + "</h3>" +
        "<p>" + num(k.visitas) + " visitas · " + num(k.reservar) + " clics en reservar · " +
        num(k.whatsapp) + " WhatsApp · " + num(k.telefono) + " llamadas</p>" +
        "<ul>" + (i.conclusions || []).map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></div>";
    }).join("");
  }

  /* --------------------------------------------------------------- inicio */
  arrancar();
})();
