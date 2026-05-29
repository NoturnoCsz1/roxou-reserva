import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, Car, Calendar, Settings, Home, Plus, List } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-primary-foreground font-bold"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              R
            </div>
            <span className="font-bold tracking-tight">Reserva Roxou</span>
          </Link>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/"><Home className="mr-2 h-4 w-4" /> Início</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/solicitar"><Plus className="mr-2 h-4 w-4" /> Solicitar</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/minhas-reservas"><List className="mr-2 h-4 w-4" /> Minhas reservas</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin"><Car className="mr-2 h-4 w-4" /> Painel</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/agenda"><Calendar className="mr-2 h-4 w-4" /> Agenda</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/configuracoes"><Settings className="mr-2 h-4 w-4" /> Configurações</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}