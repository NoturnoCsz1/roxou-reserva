const LABELS: Record<string, string> = {
  pending: "Aguardando orçamento",
  approved: "Orçamento aprovado",
  rejected: "Recusada",
  paid: "Pago",
  confirmed: "Confirmada",
  in_progress: "Em viagem",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const STYLES: Record<string, string> = {
  pending: "bg-warning/20 text-warning border-warning/40",
  approved: "bg-primary/20 text-primary border-primary/40",
  rejected: "bg-destructive/20 text-destructive border-destructive/40",
  paid: "bg-accent text-accent-foreground border-border",
  confirmed: "bg-success/20 text-success border-success/40",
  in_progress: "bg-primary/30 text-primary-foreground border-primary",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive/80 border-destructive/30",
};

export function RideStatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STYLES[status] ?? STYLES.pending}`}>
      {LABELS[status] ?? status}
    </span>
  );
}