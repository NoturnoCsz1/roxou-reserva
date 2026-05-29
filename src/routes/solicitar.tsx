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
import { toast } from "sonner";

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
  passenger_count: z.number().int().min(1).max(4),
  notes: z.string().max(500).optional(),
});

function Solicitar() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    ride_date: "",
    ride_time: "",
    distance_km: "",
    trip_type: "one_way" as "one_way" | "round_trip",
    passenger_count: "1",
    notes: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    supabase.from("ride_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) setPricing(data as PricingSettings);
    });
  }, []);

  const distance = parseFloat(form.distance_km.replace(",", ".")) || 0;
  const estimate = useMemo(
    () => (distance > 0 ? calculatePrice(distance, form.trip_type, pricing) : 0),
    [distance, form.trip_type, pricing],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({
      ...form,
      distance_km: distance,
      passenger_count: parseInt(form.passenger_count, 10),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Dados inválidos");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("ride_requests")
      .insert({
        passenger_id: user.id,
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        ride_date: parsed.data.ride_date,
        ride_time: parsed.data.ride_time,
        distance_km: parsed.data.distance_km,
        trip_type: parsed.data.trip_type,
        passenger_count: parsed.data.passenger_count,
        notes: parsed.data.notes || null,
        estimated_price: estimate,
      })
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

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-4">Solicitar orçamento</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="origin">Origem</Label>
          <Input id="origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="Endereço de partida" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destination">Destino</Label>
          <Input id="destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Endereço de chegada" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="ride_date">Data</Label>
            <Input id="ride_date" type="date" value={form.ride_date} onChange={(e) => setForm({ ...form, ride_date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ride_time">Horário</Label>
            <Input id="ride_time" type="time" value={form.ride_time} onChange={(e) => setForm({ ...form, ride_time: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="distance_km">Distância (km)</Label>
            <Input id="distance_km" inputMode="decimal" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Passageiros</Label>
            <Select value={form.passenger_count} onValueChange={(v) => setForm({ ...form, passenger_count: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: pricing.max_passengers }).map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Tipo de viagem</Label>
          <Select value={form.trip_type} onValueChange={(v: "one_way" | "round_trip") => setForm({ ...form, trip_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="one_way">Ida</SelectItem>
              <SelectItem value="round_trip">Ida e volta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Observação</Label>
          <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Bagagem, paradas, etc." rows={3} />
        </div>

        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
          <p className="text-xs text-muted-foreground">Valor estimado</p>
          <p className="text-2xl font-bold text-primary">{formatBRL(estimate)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Cálculo: {pricing.price_per_km.toFixed(2).replace(".", ",")} R$/km × {form.trip_type === "round_trip" ? `${distance} × 2` : distance}km + R$ {pricing.reservation_fee.toFixed(2).replace(".", ",")} taxa. Mínimo R$ {pricing.min_price.toFixed(2).replace(".", ",")}.
          </p>
        </div>

        <Button type="submit" disabled={submitting} size="lg" className="w-full h-14 rounded-2xl" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
          {submitting ? "Enviando…" : "Enviar solicitação"}
        </Button>
      </form>
    </AppShell>
  );
}