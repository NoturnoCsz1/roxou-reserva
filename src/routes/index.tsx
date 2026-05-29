import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { DriverStatusBadge } from "@/components/DriverStatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, List, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reserva Roxou — Início" },
      { name: "description", content: "Solicite seu motorista particular com poucos cliques." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section
          className="rounded-3xl p-6 border border-border"
          style={{ background: "var(--gradient-dark)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 text-xs text-primary font-medium mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Bem-vindo
          </div>
          <h1 className="text-2xl font-bold leading-tight">
            Reserve seu motorista <br /> com tranquilidade.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Solicite um orçamento e acompanhe sua reserva em tempo real.
          </p>
        </section>

        <DriverStatusBadge />

        <div className="grid grid-cols-1 gap-3">
          <Button asChild size="lg" className="h-14 text-base rounded-2xl" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
            <Link to="/solicitar"><Plus className="mr-2 h-5 w-5" /> Solicitar orçamento</Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="h-14 text-base rounded-2xl">
            <Link to="/minhas-reservas"><List className="mr-2 h-5 w-5" /> Minhas reservas</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
