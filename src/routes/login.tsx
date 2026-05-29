import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Reserva Roxou" },
      { name: "description", content: "Faça login para reservar seu motorista." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Erro ao entrar: " + result.error.message);
      setLoading(false);
      return;
    }
    if (result.redirected) return;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-dark)" }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div
            className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-primary-foreground"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            R
          </div>
          <h1 className="text-3xl font-bold">Reserva Roxou</h1>
          <p className="text-sm text-muted-foreground">
            Motorista particular sob reserva
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <Button
            onClick={handleGoogle}
            disabled={loading}
            size="lg"
            className="w-full h-14 rounded-2xl text-base"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            {loading ? "Conectando…" : "Entrar com Google"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Acesso privado. Apenas usuários autorizados.
          </p>
        </div>
      </div>
    </div>
  );
}