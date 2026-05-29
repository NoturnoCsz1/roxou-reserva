import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { RideStatusBadge } from "@/components/RideStatusBadge";
import { formatBRL } from "@/lib/pricing";
import { ChevronRight } from "lucide-react";

type Ride = {
  id: string;
  origin: string;
  destination: string;
  ride_date: string;
  ride_time: string;
  status: string;
  estimated_price: number;
  final_price: number | null;
};

export const Route = createFileRoute("/minhas-reservas")({
  head: () => ({ meta: [{ title: "Minhas reservas — Reserva Roxou" }] }),
  component: MinhasReservas,
});

function MinhasReservas() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("ride_requests")
        .select("id, origin, destination, ride_date, ride_time, status, estimated_price, final_price")
        .order("created_at", { ascending: false });
      setRides((data ?? []) as Ride[]);
      setFetching(false);
    };
    load();

    const channel = supabase
      .channel("my_rides")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ride_requests" },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-4">Minhas reservas</h1>
      {fetching ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : rides.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Nenhuma reserva ainda.</p>
          <Link to="/solicitar" className="mt-3 inline-block text-primary font-medium">Fazer primeira solicitação →</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rides.map((r) => (
            <li key={r.id}>
              <Link
                to="/reserva/$id"
                params={{ id: r.id }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/60 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <RideStatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.ride_date).toLocaleDateString("pt-BR")} {r.ride_time.slice(0, 5)}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">{r.origin}</p>
                  <p className="text-sm text-muted-foreground truncate">→ {r.destination}</p>
                  <p className="text-sm font-bold text-primary mt-1">
                    {formatBRL(r.final_price ?? r.estimated_price)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}