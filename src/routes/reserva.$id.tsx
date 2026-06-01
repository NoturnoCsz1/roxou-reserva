import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { RideStatusBadge } from "@/components/RideStatusBadge";
import { RideChat } from "@/components/RideChat";
import { formatBRL } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MapPin, Calendar, Users, Route as RouteIcon, Clock, Navigation } from "lucide-react";

export const Route = createFileRoute("/reserva/$id")({
  head: () => ({ meta: [{ title: "Reserva — Reserva Roxou" }] }),
  component: ReservaDetalhe,
});

type Ride = {
  id: string;
  passenger_id: string;
  origin: string;
  destination: string;
  stops: string[] | null;
  ride_date: string;
  ride_time: string;
  distance_km: number;
  duration_minutes: number | null;
  route_source: string | null;
  trip_type: string;
  passenger_count: number;
  notes: string | null;
  estimated_price: number;
  final_price: number | null;
  status: string;
  rejection_reason: string | null;
};

function ReservaDetalhe() {
  const { id } = useParams({ from: "/reserva/$id" });
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [ride, setRide] = useState<Ride | null>(null);
  const [fetching, setFetching] = useState(true);
  const [finalPrice, setFinalPrice] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const load = async () => {
    const { data } = await supabase.from("ride_requests").select("*").eq("id", id).maybeSingle();
    if (data) {
      setRide(data as Ride);
      setFinalPrice(String(data.final_price ?? data.estimated_price));
    }
    setFetching(false);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel(`ride:${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ride_requests", filter: `id=eq.${id}` },
        (p) => setRide(p.new as Ride),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const update = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("ride_requests").update(patch as never).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Atualizado");
  };

  if (fetching) return <AppShell><p className="text-muted-foreground">Carregando…</p></AppShell>;
  if (!ride) return <AppShell><p>Reserva não encontrada.</p></AppShell>;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Reserva</h1>
          <RideStatusBadge status={ride.status} />
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
          <div className="flex gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Origem</p>
              <p className="font-medium">{ride.origin}</p>
              <p className="text-xs text-muted-foreground mt-2">Destino</p>
              <p className="font-medium">{ride.destination}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {new Date(ride.ride_date).toLocaleDateString("pt-BR")} {ride.ride_time.slice(0, 5)}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              {ride.passenger_count} pax
            </div>
            <div className="flex items-center gap-2 text-sm">
              <RouteIcon className="h-4 w-4 text-muted-foreground" />
              {ride.distance_km} km · {ride.trip_type === "round_trip" ? "Ida e volta" : "Ida"}
            </div>
            {ride.duration_minutes != null && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {ride.duration_minutes} min
              </div>
            )}
          </div>
          {Array.isArray(ride.stops) && ride.stops.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">Paradas</p>
              <p className="text-sm">{ride.stops.join(" → ")}</p>
            </div>
          )}
          {isAdmin && ride.route_source && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <Navigation className="h-3.5 w-3.5" />
              Rota: {ride.route_source === "google_maps" ? "Google Maps" : "Manual (fallback)"}
            </div>
          )}
          {ride.notes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">Observação</p>
              <p className="text-sm">{ride.notes}</p>
            </div>
          )}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="text-2xl font-bold text-primary">
              {formatBRL(ride.final_price ?? ride.estimated_price)}
            </p>
            {ride.final_price && ride.final_price !== ride.estimated_price && (
              <p className="text-xs text-muted-foreground">Estimado: {formatBRL(ride.estimated_price)}</p>
            )}
          </div>
          {ride.rejection_reason && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
              <p className="text-xs text-destructive font-medium">Motivo da recusa</p>
              <p className="text-sm">{ride.rejection_reason}</p>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="rounded-3xl border border-primary/40 bg-card p-5 space-y-3">
            <h3 className="font-semibold text-primary">Ações do motorista</h3>

            {ride.status === "pending" && (
              <>
                <div className="space-y-2">
                  <Label>Valor final (R$)</Label>
                  <Input inputMode="decimal" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} />
                </div>
                <Button
                  className="w-full"
                  onClick={() => update({ status: "approved", final_price: parseFloat(finalPrice) || ride.estimated_price })}
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Aprovar orçamento
                </Button>
                <div className="space-y-2">
                  <Label>Motivo da recusa</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
                </div>
                <Button variant="destructive" className="w-full"
                  onClick={() => update({ status: "rejected", rejection_reason: reason || "Sem motivo informado" })}>
                  Recusar
                </Button>
              </>
            )}

            {ride.status === "approved" && (
              <Button className="w-full" onClick={() => update({ status: "paid" })}>Confirmar pagamento</Button>
            )}
            {ride.status === "paid" && (
              <Button className="w-full" onClick={() => update({ status: "confirmed" })}>Confirmar reserva</Button>
            )}
            {ride.status === "confirmed" && (
              <Button className="w-full" onClick={() => update({ status: "in_progress" })}>Iniciar viagem</Button>
            )}
            {ride.status === "in_progress" && (
              <Button className="w-full" onClick={() => update({ status: "completed" })}>Concluir viagem</Button>
            )}
            {!["completed", "cancelled", "rejected"].includes(ride.status) && (
              <Button variant="outline" className="w-full" onClick={() => update({ status: "cancelled" })}>
                Cancelar reserva
              </Button>
            )}
          </div>
        )}

        <RideChat rideId={ride.id} />
      </div>
    </AppShell>
  );
}