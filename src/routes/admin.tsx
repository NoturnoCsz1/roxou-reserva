import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel — Reserva Roxou" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/login" });
      else if (!isAdmin) navigate({ to: "/" });
    }
  }, [loading, user, isAdmin, navigate]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Verificando acesso…
      </div>
    );
  }

  return <Outlet />;
}

export { Link };