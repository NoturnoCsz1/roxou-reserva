/**
 * Lazy loader para Google Maps JS SDK com a biblioteca `places`.
 * Carrega uma única vez e devolve a mesma Promise em chamadas subsequentes.
 */
const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

declare global {
  interface Window {
    google?: typeof google;
    __gmapsLoader?: Promise<typeof google>;
  }
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadGoogleMaps deve rodar no browser"));
  }
  if (!KEY) return Promise.reject(new Error("GOOGLE_MAPS_NOT_CONFIGURED"));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (window.__gmapsLoader) return window.__gmapsLoader;

  window.__gmapsLoader = new Promise((resolve, reject) => {
    const cbName = "__initGmaps_" + Math.random().toString(36).slice(2);
    (window as unknown as Record<string, unknown>)[cbName] = () => {
      if (window.google?.maps) {
        console.log("[GOOGLE] SDK LOADED", {
          maps: !!window.google.maps,
          places: !!window.google.maps.places,
        });
        resolve(window.google);
      } else {
        console.error("[GOOGLE] SDK LOAD ERROR: google.maps undefined após callback");
        reject(new Error("Google Maps falhou ao carregar"));
      }
      delete (window as unknown as Record<string, unknown>)[cbName];
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places&loading=async&callback=${cbName}&language=pt-BR&region=BR`;
    s.async = true;
    s.defer = true;
    s.onerror = (e) => {
      console.error("[GOOGLE] SDK SCRIPT TAG ERROR", e);
      reject(new Error("Falha ao carregar script do Google Maps"));
    };
    console.log("[GOOGLE] LOADING SDK", s.src.replace(KEY!, "***"));
    document.head.appendChild(s);
  });
  return window.__gmapsLoader;
}

// Centro aproximado de Presidente Prudente - SP, usado para enviesar resultados
export const PP_CENTER = { lat: -22.1207, lng: -51.3889 };
export const PP_RADIUS_METERS = 50_000;