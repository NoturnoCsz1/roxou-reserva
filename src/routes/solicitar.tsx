import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { calculatePrice, DEFAULT_PRICING, formatBRL, type PricingSettings } from "@/lib/pricing";
import { calculateRoute, mapsConfigured, type RouteResult } from "@/lib/maps";
import { toast } from "sonner";
import { MapPin, Plus, X, Loader2, Route as RouteIcon, Clock, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/solicitar")({
  head: () => ({ meta: [{ title: "Solicitar orçamento — Reserva Roxou" }] }),
  component: Solicitar,
});

const schema = z.object({
  origin: z.string().trim().min(2, "Informe a origem").max(200),
  destination: z.string().trim().min(2, "Informe o destino").max(200),
  ride_date: z.string().min(1, "Informe a data"),
  ride_time: z.string().min(1, "Informe o horário"),
  distance_km: z.number().min(0.1, "Distância inválida").max(2000),
  trip_type: z.enum(["one_way", "round_trip"]),
  passenger_count: z.number().int().min(1).max(8),
  notes: z.string().max(500).optional(),
});

function Solicitar() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const mapsOn = mapsConfigured();

  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);
  const [submitting, setSubmitting] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [routeData, setRouteData] = useState<RouteResult | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [manualKm, setManualKm] = useState("");

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [stops, setStops] = useState<string[]>([]);
  const [rideDate, setRideDate] = useState("");
  const [rideTime, setRideTime] = useState("");
  const [tripType, setTripType] = useState<"one_way" | "round_trip">("one_way");
  const [passengerCount, setPassengerCount] = useState("1");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    supabase.from("ride_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) setPricing(data as PricingSettings);
    });
  }, []);

  // Invalida rota se origem/destino/paradas mudarem
  useEffect(() => {
    setRouteData(null);
    setRouteError(null);
  }, [origin, destination, stops.join("|")]);

  const distance = routeData?.distanceKm ?? (parseFloat(manualKm.replace(",", ".")) || 0);
  const estimate = useMemo(
    () => (distance > 0 ? calculatePrice(distance, tripType, pricing) : 0),
    [distance, tripType, pricing],
  );

  const handleCalculate = async () => {
    if (!origin.trim() || !destination.trim()) {
      toast.error("Preencha origem e destino");
      return;
    }
    setCalculating(true);
    setRouteError(null);
    try {
      const r = await calculateRoute({ origin, destination, stops });
      setRouteData(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao calcular rota";
      setRouteError(msg);
      toast.error("Não foi possível calcular a rota");
    } finally {
      setCalculating(false);
    }
  };

  const addStop = () => setStops((s) => [...s, ""]);
  const updateStop = (i: number, v: string) =>
    setStops((s) => s.map((x, idx) => (idx === i ? v : x)));
  const removeStop = (i: number) => setStops((s) => s.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const finalDistance = routeData?.distanceKm ?? (parseFloat(manualKm.replace(",", ".")) || 0);
    const source: "google_maps" | "manual_fallback" = routeData ? "google_maps" : "manual_fallback";

    const parsed = schema.safeParse({
      origin, destination,
      ride_date: rideDate, ride_time: rideTime,
      distance_km: finalDistance,
      trip_type: tripType,
      passenger_count: parseInt(passengerCount, 10),
      notes,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Dados inválidos");
      return;
    }

    const cleanStops = stops.map((s) => s.trim()).filter(Boolean);

    setSubmitting(true);
    const { data, error } = await supabase
      .from("ride_requests")
      .insert({
        passenger_id: user.id,
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        stops: cleanStops,
        ride_date: parsed.data.ride_date,
        ride_time: parsed.data.ride_time,
        distance_km: parsed.data.distance_km,
        duration_minutes: routeData?.durationMinutes ?? null,
        route_source: source,
        trip_type: parsed.data.trip_type,
        passenger_count: parsed.data.passenger_count,
        notes: parsed.data.notes || null,
        estimated_price: estimate,
      } as never)
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao enviar: " + error.message);
      return;
    }
    toast.success("Solicitação enviada!");
    navigate({ to: "/reserva/$id", params: { id: data.id } });
  };

  const showManualFallback = !mapsOn || Boolean(routeError);
  const canSubmit = distance > 0 && rideDate && rideTime;

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-4">Solicitar orçamento</h1>

      {!mapsOn && (
        <div className="mb-4 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-3 flex gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <span>Google Maps não configurado. Distância manual temporária para testes.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="origin" className="text-sm font-medium">Origem</Label>
          <Input id="origin" className="h-12" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Endereço de partida" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="destination" className="text-sm font-medium">Destino</Label>
          <Input id="destination" className="h-12" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Endereço de chegada" />
        </div>

        {stops.map((s, i) => (
          <div key={i} className="space-y-2">
            <Label className="text-sm font-medium">Parada {i + 1}</Label>
            <div className="flex gap-2">
              <Input className="h-12" value={s} onChange={(e) => updateStop(i, e.target.value)} placeholder="Endereço da parada" />
              <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={() => removeStop(i)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" className="w-full h-11" onClick={addStop}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar parada
        </Button>

        {mapsOn && (
          <Button
            type="button"
            onClick={handleCalculate}
            disabled={calculating || !origin.trim() || !destination.trim()}
            className="w-full h-12 rounded-xl"
            variant="secondary"
          >
            {calculating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Calculando rota…</>
            ) : (
              <><RouteIcon className="h-4 w-4 mr-2" /> Calcular rota</>
            )}
          </Button>
        )}

        {showManualFallback && (
          <div className="space-y-2 rounded-2xl border border-dashed border-border p-3">
            <Label htmlFor="manualKm" className="text-sm font-medium">Distância aproximada (km)</Label>
            {routeError && (
              <p className="text-xs text-muted-foreground">
                Não conseguimos calcular automaticamente. Informe a distância aproximada para continuar.
              </p>
            )}
            <Input id="manualKm" inputMode="decimal" className="h-12" value={manualKm} onChange={(e) => setManualKm(e.target.value)} placeholder="0" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="ride_date" className="text-sm font-medium">Data</Label>
            <Input id="ride_date" type="date" className="h-12" value={rideDate} onChange={(e) => setRideDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ride_time" className="text-sm font-medium">Horário</Label>
            <Input id="ride_time" type="time" className="h-12" value={rideTime} onChange={(e) => setRideTime(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Passageiros</Label>
            <Select value={passengerCount} onValueChange={setPassengerCount}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: pricing.max_passengers }).map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo</Label>
            <Select value={tripType} onValueChange={(v: "one_way" | "round_trip") => setTripType(v)}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="one_way">Ida</SelectItem>
                <SelectItem value="round_trip">Ida e volta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium">Observação</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bagagem, paradas, etc." rows={3} />
        </div>

        {/* Resumo */}
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-primary font-semibold">Resumo da viagem</p>

          {origin && <p className="text-sm"><span className="text-muted-foreground">Origem:</span> {origin}</p>}
          {destination && <p className="text-sm"><span className="text-muted-foreground">Destino:</span> {destination}</p>}
          {stops.filter((s) => s.trim()).length > 0 && (
            <p className="text-sm"><span className="text-muted-foreground">Paradas:</span> {stops.filter((s) => s.trim()).join(" → ")}</p>
          )}

          {routeData ? (
            <div className="flex gap-4 text-sm pt-1">
              <span className="flex items-center gap-1"><RouteIcon className="h-3.5 w-3.5 text-primary" /> {routeData.distanceKm} km</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-primary" /> {routeData.durationMinutes} min</span>
            </div>
          ) : distance > 0 ? (
            <p className="text-sm"><span className="text-muted-foreground">Distância:</span> {distance} km (manual)</p>
          ) : (
            <p className="text-sm text-muted-foreground">Calcule a rota para ver distância e tempo.</p>
          )}

          <p className="text-sm pt-1">
            <span className="text-muted-foreground">Tipo:</span> {tripType === "round_trip" ? "Ida e volta" : "Ida"} · {passengerCount} pax
          </p>

          <div className="pt-2 border-t border-primary/20">
            <p className="text-xs text-muted-foreground">Valor estimado</p>
            <p className="text-3xl font-bold text-primary">{formatBRL(estimate)}</p>
            {distance > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {tripType === "round_trip" ? `${distance} × 2` : distance} km × R$ {pricing.price_per_km.toFixed(2).replace(".", ",")} + R$ {pricing.reservation_fee.toFixed(2).replace(".", ",")} taxa. Mínimo R$ {pricing.min_price.toFixed(2).replace(".", ",")}.
              </p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting || !canSubmit}
          size="lg"
          className="w-full h-14 rounded-2xl text-base font-semibold"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          {submitting ? "Enviando…" : "Enviar solicitação"}
        </Button>
      </form>
    </AppShell>
  );
}