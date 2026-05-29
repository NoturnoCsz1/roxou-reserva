import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/admin/agenda")({
  component: Agenda,
});

function Agenda() {
  const [rides, setRides] = useState<Ride[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("ride_requests")
        .select("id, origin, destination, ride_date, ride_time, status, estimated_price, final_price")
        .in("status", ["confirmed", "in_progress", "paid"])
        .order("ride_date", { ascending: true })
        .order("ride_time", { ascending: true });
      setRides((data ?? []) as Ride[]);
    };
    load();
    const ch = supabase
      .channel("agenda")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-4">Agenda</h1>
      {rides.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma reserva confirmada.</p>
      ) : (
        <ul className="space-y-3">
          {rides.map((r) => (
            <li key={r.id}>
              <Link to="/reserva/$id" params={{ id: r.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <RideStatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.ride_date).toLocaleDateString("pt-BR")} {r.ride_time.slice(0, 5)}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">{r.origin} → {r.destination}</p>
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