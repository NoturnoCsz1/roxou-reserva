export interface PricingSettings {
  price_per_km: number;
  reservation_fee: number;
  min_price: number;
  max_passengers: number;
}

export const DEFAULT_PRICING: PricingSettings = {
  price_per_km: 2.5,
  reservation_fee: 20,
  min_price: 30,
  max_passengers: 4,
};

export function calculatePrice(
  distanceKm: number,
  tripType: "one_way" | "round_trip",
  settings: PricingSettings = DEFAULT_PRICING,
): number {
  const totalDistance = tripType === "round_trip" ? distanceKm * 2 : distanceKm;
  const raw = totalDistance * settings.price_per_km + settings.reservation_fee;
  return Math.max(raw, settings.min_price);
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}