import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Status = "online" | "busy" | "offline";

const LABELS: Record<Status, string> = {
  online: "Motorista Online",
  busy: "Motorista Ocupado",
  offline: "Motorista Offline",
};

const COLORS: Record<Status, string> = {
  online: "bg-success text-success-foreground",
  busy: "bg-warning text-warning-foreground",
  offline: "bg-muted text-muted-foreground",
};

export function DriverStatusBadge() {
  const [status, setStatus] = useState<Status>("offline");

  useEffect(() => {
    supabase
      .from("driver_status")
      .select("status")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => data && setStatus(data.status as Status));

    const channel = supabase
      .channel("driver_status_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_status" },
        (payload) => {
          const newStatus = (payload.new as { status?: Status })?.status;
          if (newStatus) setStatus(newStatus);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <span className={`h-3 w-3 rounded-full ${status === "online" ? "bg-success animate-pulse" : status === "busy" ? "bg-warning" : "bg-muted-foreground"}`} />
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${COLORS[status]}`}>
        {LABELS[status]}
      </span>
    </div>
  );
}