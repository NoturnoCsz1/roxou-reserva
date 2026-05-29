import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/configuracoes")({
  component: Config,
});

function Config() {
  const [form, setForm] = useState({
    price_per_km: "2.50",
    reservation_fee: "20.00",
    min_price: "30.00",
    max_passengers: "4",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("ride_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) setForm({
        price_per_km: String(data.price_per_km),
        reservation_fee: String(data.reservation_fee),
        min_price: String(data.min_price),
        max_passengers: String(data.max_passengers),
      });
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("ride_settings").update({
      price_per_km: parseFloat(form.price_per_km),
      reservation_fee: parseFloat(form.reservation_fee),
      min_price: parseFloat(form.min_price),
      max_passengers: parseInt(form.max_passengers, 10),
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Configurações salvas");
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold mb-4">Configurações</h1>
      <form onSubmit={save} className="space-y-4 rounded-3xl border border-border bg-card p-5">
        <div className="space-y-2">
          <Label>Preço por km (R$)</Label>
          <Input inputMode="decimal" value={form.price_per_km} onChange={(e) => setForm({ ...form, price_per_km: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Taxa de reserva (R$)</Label>
          <Input inputMode="decimal" value={form.reservation_fee} onChange={(e) => setForm({ ...form, reservation_fee: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Valor mínimo (R$)</Label>
          <Input inputMode="decimal" value={form.min_price} onChange={(e) => setForm({ ...form, min_price: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Máximo de passageiros</Label>
          <Input inputMode="numeric" value={form.max_passengers} onChange={(e) => setForm({ ...form, max_passengers: e.target.value })} />
        </div>
        <Button type="submit" disabled={saving} size="lg" className="w-full h-14 rounded-2xl" style={{ background: "var(--gradient-primary)" }}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </form>
    </AppShell>
  );
}