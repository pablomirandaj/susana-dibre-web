/* =========================================================================
   Susana Dibré — script público
   Sin dependencias. Sin cookies. Sin datos personales.
   ========================================================================= */
(function () {
  "use strict";

  var ENDPOINT = "/api/track";

  /* ------------------------------------------------------------ sesión
     Identificador anónimo, aleatorio, que vive solo en la pestaña actual.
     No es una cookie, no persiste entre visitas y no identifica a nadie.
     Sirve únicamente para no contar 8 clics de la misma persona como 8
     personas distintas dentro de la misma visita.                        */
  function sesion() {
    try {
      var s = sessionStorage.getItem("sd_s");
      if (!s) {
        s = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
        sessionStorage.setItem("sd_s", s);
      }
      return s;
    } catch (e) {
      return "sin-sesion";
    }
  }

  /* ------------------------------------------------------------- origen
     De dónde viene la visita. Se resuelve una vez por sesión: si alguien
     llega desde Google y luego navega, sigue siendo Google.              */
  function origen() {
    try {
      var g = sessionStorage.getItem("sd_o");
      if (g) return g;
      var utm = new URLSearchParams(location.search).get("utm_source");
      var r = document.referrer || "";
      var o = "directo";
      if (utm) o = utm.toLowerCase();
      else if (/google\./.test(r)) o = "google";
      else if (/instagram\./.test(r)) o = "instagram";
      else if (/facebook\.|fb\./.test(r)) o = "facebook";
      else if (/booksy\./.test(r)) o = "booksy";
      else if (r && r.indexOf(location.host) === -1) o = "otros";
      sessionStorage.setItem("sd_o", o);
      return o;
    } catch (e) {
      return "desconocido";
    }
  }

  function enviar(tipo, extra) {
    var d = {
      event_type: tipo,
      page: location.pathname,
      source: origen(),
      session: sesion(),
      ts: new Date().toISOString()
    };
    if (extra) for (var k in extra) if (extra[k]) d[k] = extra[k];

    var body = JSON.stringify(d);
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      } else {
        fetch(ENDPOINT, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "application/json" } });
      }
    } catch (e) { /* la analítica nunca debe romper la web */ }

    if (window.gtag) window.gtag("event", tipo, d);
  }

  /* --------------------------------------------------------- page_view */
  enviar("page_view");

  /* ------------------------------------ clics marcados con data-evento */
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-evento]");
    if (!el) return;
    enviar(el.dataset.evento, {
      element: el.dataset.origen || null,
      service: el.dataset.servicio || null
    });
  });

  /* --------------------- service_view: qué tratamiento se mira de verdad
     Se registra cuando un bloque de la carta lleva 2 segundos visible.
     Un scroll rápido no cuenta como interés.                            */
  var vistos = {};
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        var id = e.target.querySelector("h3") && e.target.querySelector("h3").id;
        if (!id) return;
        if (e.isIntersecting) {
          vistos[id] = setTimeout(function () {
            enviar("service_view", { service: id });
            io.unobserve(e.target);
          }, 2000);
        } else {
          clearTimeout(vistos[id]);
        }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll(".carta__bloque").forEach(function (b) { io.observe(b); });
  }

  /* ------------------------------------------------------ menú en móvil */
  var btn = document.getElementById("menu-btn");
  var nav = document.getElementById("nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var abierto = nav.classList.toggle("nav--abierto");
      btn.setAttribute("aria-expanded", String(abierto));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("nav--abierto");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ------------------------------------------------------ buscador FAQ */
  var q = document.getElementById("faq-q");
  if (q) {
    var items = [].slice.call(document.querySelectorAll("[data-faq]"));
    var vacio = document.getElementById("faq-vacio");

    var limpiar = function (s) {
      return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[¿?¡!.,]/g, "");
    };
    var vacias = ["que", "como", "cual", "donde", "cuando", "puedo", "para", "una", "los", "las", "del", "por", "con", "mi", "el", "la", "de", "en", "y", "es", "se"];

    var filtrar = function () {
      var t = limpiar(q.value).trim();
      var visibles = 0;

      if (!t) {
        items.forEach(function (i) { i.hidden = false; i.open = false; });
        vacio.hidden = true;
        return;
      }

      var palabras = t.split(/\s+/).filter(function (p) { return p.length > 2 && vacias.indexOf(p) === -1; });
      if (!palabras.length) palabras = [t];

      items.forEach(function (i) {
        var heno = limpiar(i.dataset.tags + " " + i.textContent);
        var hit = palabras.some(function (p) { return heno.indexOf(p) !== -1; });
        i.hidden = !hit;
        i.open = hit && palabras.length > 0;
        if (hit) visibles++;
      });

      vacio.hidden = visibles > 0;
      if (!visibles) enviar("faq_sin_resultado", { query: t.slice(0, 60) });
    };

    var temporizador;
    q.addEventListener("input", function () {
      clearTimeout(temporizador);
      temporizador = setTimeout(filtrar, 180);
    });
  }
})();
