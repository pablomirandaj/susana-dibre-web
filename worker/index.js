/**
 * Punto de entrada del Worker.
 *
 * Cloudflare despliega este proyecto como Worker con assets estáticos, no
 * como Pages. La diferencia práctica: en Pages la carpeta functions/ se
 * enruta sola, y aquí hay que decir explícitamente qué ruta atiende el
 * código y qué se sirve como archivo.
 *
 * Orden: si la petición coincide con un archivo de public/, se sirve el
 * archivo. Si no, llega aquí. La única ruta dinámica es /api/track.
 */
import { onRequestPost } from "../functions/api/track.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/track") {
      if (request.method !== "POST") {
        return new Response("Método no permitido", { status: 405 });
      }
      return onRequestPost({ request, env });
    }

    return env.ASSETS.fetch(request);
  }
};
