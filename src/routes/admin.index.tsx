import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { RideStatusBadge } from "@/components/RideStatusBadge";
import { formatBRL } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { ChevronRight, Calendar, Settings } from "lucide-react";
import { toast } from "sonner";

type Status = "online" | "busy" | "offline";
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

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const [status, setStatus] = useState<Status>("offline");
  const [pending, setPending] = useState<Ride[]>([]);

  const loadAll = async () => {
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("driver_status").select("status").eq("id", 1).maybeSingle(),
      supabase
        .from("ride_requests")
        .select("id, origin, destination, ride_date, ride_time, status, estimated_price, final_price")
        .in("status", ["pending", "approved", "paid", "confirmed", "in_progress"])
        .order("created_at", { ascending: false }),
    ]);
    if (s) setStatus(s.status as Status);
    setPending((r ?? []) as Ride[]);
  };

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel("admin_home")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_status" }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const setDriverStatus = async (s: Status) => {
    const { error } = await supabase.from("driver_status").update({ status: s, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) toast.error(error.message);
    else { setStatus(s); toast.success("Status atualizado"); }
  };

  const buttons: { value: Status; label: string; cls: string }[] = [
    { value: "online", label: "Online", cls: "bg-success text-success-foreground" },
    { value: "busy", label: "Ocupado", cls: "bg-warning text-warning-foreground" },
    { value: "offline", label: "Offline", cls: "bg-muted text-muted-foreground" },
  ];

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-4">Painel do motorista</h1>

      <div className="rounded-3xl border border-border bg-card p-5 mb-4">
        <p className="text-xs text-muted-foreground mb-2">Meu status</p>
        <div className="grid grid-cols-3 gap-2">
          {buttons.map((b) => (
            <button
              key={b.value}
              onClick={() => setDriverStatus(b.value)}
              className={`h-12 rounded-xl text-sm font-medium transition ${b.cls} ${status === b.value ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "opacity-60"}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button asChild variant="secondary" className="h-12 rounded-2xl"><Link to="/admin/agenda"><Calendar className="mr-2 h-4 w-4" /> Agenda</Link></Button>
        <Button asChild variant="secondary" className="h-12 rounded-2xl"><Link to="/admin/configuracoes"><Settings className="mr-2 h-4 w-4" /> Configurações</Link></Button>
      </div>

      <h2 className="text-lg font-semibold mb-2">Solicitações ativas</h2>
      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma solicitação ativa.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((r) => (
            <li key={r.id}>
              <Link to="/reserva/$id" params={{ id: r.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/60 transition">
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