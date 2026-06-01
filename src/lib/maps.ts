export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  polyline?: string;
  source: "google_maps" | "manual_fallback";
}

export interface RouteInput {
  origin: string;
  destination: string;
  stops?: string[];
}

export const GOOGLE_MAPS_KEY: string | undefined =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || undefined;

export const mapsConfigured = (): boolean => Boolean(GOOGLE_MAPS_KEY);

// Log único na carga do módulo para diagnóstico
console.log("[MAPS] API KEY EXISTS:", !!GOOGLE_MAPS_KEY);

/**
 * Calcula a distância e duração de uma rota usando a Google Routes API (v2).
 * Lança erro se a chamada falhar ou se a chave não estiver configurada.
 */
export async function calculateRoute(input: RouteInput): Promise<RouteResult> {
  const key = GOOGLE_MAPS_KEY;
  console.log("[MAPS] API KEY EXISTS:", !!key);
  if (!key) throw new Error("GOOGLE_MAPS_NOT_CONFIGURED");

  const origin = input.origin.trim();
  const destination = input.destination.trim();
  if (!origin || !destination) throw new Error("Origem e destino obrigatórios");

  const intermediates = (input.stops ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({ address: s }));

  const body = {
    origin: { address: origin },
    destination: { address: destination },
    intermediates: intermediates.length ? intermediates : undefined,
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    units: "METRIC",
    languageCode: "pt-BR",
    regionCode: "BR",
  };

  console.log("[MAPS] ROUTE REQUEST", {
    origin,
    destination,
    stops: intermediates.length,
  });

  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("[MAPS] ERROR", res.status, txt.slice(0, 300));
    throw new Error(`Routes API ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    routes?: Array<{
      distanceMeters?: number;
      duration?: string;
      polyline?: { encodedPolyline?: string };
    }>;
  };

  const route = data.routes?.[0];
  if (!route || typeof route.distanceMeters !== "number") {
    console.error("[MAPS] ERROR", "Rota não encontrada", data);
    throw new Error("Rota não encontrada");
  }

  const distanceKm = Math.round((route.distanceMeters / 1000) * 10) / 10;
  const durationSec = route.duration ? parseInt(route.duration.replace("s", ""), 10) : 0;
  const durationMinutes = Math.max(1, Math.round(durationSec / 60));

  const result: RouteResult = {
    distanceKm,
    durationMinutes,
    polyline: route.polyline?.encodedPolyline,
    source: "google_maps",
  };
  console.log("[MAPS] ROUTE RESPONSE", {
    distanceKm: result.distanceKm,
    durationMinutes: result.durationMinutes,
  });
  return result;
}