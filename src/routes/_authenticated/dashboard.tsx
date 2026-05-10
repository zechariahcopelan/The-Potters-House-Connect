import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, CheckCircle2, AlertCircle, Send as SendIcon, Clock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { processDueScheduled, cancelScheduled } from "@/lib/sms.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — TPH-MN Connect" }] }),
});

type Row = {
  id: string; message_title: string; group_name: string; send_at: string;
  status: string; sent_at: string | null; recipient_count: number;
  success_count: number; failure_count: number; error: string | null;
};

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function statusBadge(s: string) {
  const map: Record<string, { v: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending: { v: "secondary", label: "Scheduled" },
    sending: { v: "secondary", label: "Sending…" },
    sent: { v: "default", label: "Sent" },
    partial: { v: "outline", label: "Partial" },
    failed: { v: "destructive", label: "Failed" },
    cancelled: { v: "outline", label: "Cancelled" },
  };
  const m = map[s] ?? { v: "outline" as const, label: s };
  return <Badge variant={m.v}>{m.label}</Badge>;
}

function Dashboard() {
  const [upcoming, setUpcoming] = useState<Row[]>([]);
  const [recent, setRecent] = useState<Row[]>([]);
  const [counts, setCounts] = useState({ messages: 0, groups: 0 });
  const processFn = useServerFn(processDueScheduled);
  const cancelFn = useServerFn(cancelScheduled);

  const load = async () => {
    const [up, re, mc, gc] = await Promise.all([
      supabase.from("scheduled_sends").select("*").eq("status", "pending").order("send_at", { ascending: true }).limit(20),
      supabase.from("scheduled_sends").select("*").not("status", "eq", "pending").order("created_at", { ascending: false }).limit(10),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("contact_groups").select("id", { count: "exact", head: true }),
    ]);
    setUpcoming((up.data ?? []) as Row[]);
    setRecent((re.data ?? []) as Row[]);
    setCounts({ messages: mc.count ?? 0, groups: gc.count ?? 0 });
  };

  useEffect(() => {
    load();
    // Trigger any due scheduled messages whenever the dashboard loads
    processFn({}).then((r) => { if (r?.processed) load(); }).catch(() => {});
    const t = setInterval(() => { processFn({}).then(load).catch(() => {}); }, 60_000);
    return () => clearInterval(t);
  }, [processFn]);

  const cancel = async (id: string) => {
    await cancelFn({ data: { id } });
    toast.success("Scheduled message cancelled");
    load();
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Welcome back</h1>
          <p className="text-muted-foreground mt-1">Manage your church communications at a glance.</p>
        </div>
        <Button asChild><Link to="/send"><SendIcon className="size-4 mr-2" /> Send a message</Link></Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<CalendarClock className="size-5" />} label="Scheduled" value={upcoming.length} />
        <StatCard icon={<CheckCircle2 className="size-5" />} label="Recent sends" value={recent.length} />
        <StatCard icon={<SendIcon className="size-5" />} label="Message templates" value={counts.messages} />
        <StatCard icon={<Clock className="size-5" />} label="Contact groups" value={counts.groups} />
      </div>

      <Card>
        <CardHeader><CardTitle>Upcoming scheduled messages</CardTitle></CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages scheduled. <Link to="/send" className="text-primary underline">Schedule one</Link>.</p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((r) => (
                <li key={r.id} className="py-3 flex flex-wrap gap-3 items-center justify-between">
                  <div>
                    <div className="font-medium">{r.message_title}</div>
                    <div className="text-sm text-muted-foreground">To {r.group_name} • {fmt(r.send_at)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(r.status)}
                    <Button size="sm" variant="outline" onClick={() => cancel(r.id)}>Cancel</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent sends</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sends yet.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((r) => (
                <li key={r.id} className="py-3 flex flex-wrap gap-3 items-center justify-between">
                  <div>
                    <div className="font-medium">{r.message_title}</div>
                    <div className="text-sm text-muted-foreground">
                      To {r.group_name} • {r.sent_at ? fmt(r.sent_at) : fmt(r.send_at)}
                      {r.recipient_count > 0 && (
                        <> • {r.success_count}/{r.recipient_count} delivered</>
                      )}
                    </div>
                    {r.error && <div className="text-sm text-destructive flex items-center gap-1 mt-1"><AlertCircle className="size-3.5" /> {r.error}</div>}
                  </div>
                  {statusBadge(r.status)}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="size-10 rounded-lg bg-secondary text-primary flex items-center justify-center">{icon}</div>
        <div>
          <div className="text-2xl font-semibold leading-tight">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
