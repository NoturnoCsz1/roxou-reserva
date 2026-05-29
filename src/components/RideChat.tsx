import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export function RideChat({ rideId }: { rideId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("ride_messages")
        .select("*")
        .eq("ride_id", rideId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Message[]);
    };
    load();

    const channel = supabase
      .channel(`chat:${rideId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ride_messages", filter: `ride_id=eq.${rideId}` },
        (payload) => {
          setMessages((m) => [...m, payload.new as Message]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [rideId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setSending(true);
    await supabase.from("ride_messages").insert({
      ride_id: rideId,
      sender_id: user.id,
      content: text.trim(),
    });
    setText("");
    setSending(false);
  };

  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold">Chat da reserva</h3>
      </div>
      <div className="flex-1 max-h-96 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma mensagem ainda.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 p-3 border-t border-border">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite uma mensagem…" />
        <Button type="submit" size="icon" disabled={sending || !text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}