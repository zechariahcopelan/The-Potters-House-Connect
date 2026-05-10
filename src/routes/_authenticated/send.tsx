import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useServerFn } from "@tanstack/react-start";
import { queueSend } from "@/lib/sms.functions";
import { toast } from "sonner";
import { Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/send")({
  component: SendPage,
  head: () => ({ meta: [{ title: "Send & Schedule — TPH-MN Connect" }] }),
});

type Msg = { id: string; title: string; body: string };
type Group = { id: string; name: string };

function SendPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [msgId, setMsgId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [when, setWhen] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const queueFn = useServerFn(queueSend);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const [m, g, c] = await Promise.all([
        supabase.from("messages").select("id, title, body").order("title"),
        supabase.from("contact_groups").select("id, name").order("name"),
        supabase.from("contacts").select("group_id"),
      ]);
      setMessages((m.data ?? []) as Msg[]);
      setGroups((g.data ?? []) as Group[]);
      const counts: Record<string, number> = {};
      (c.data ?? []).forEach((r: { group_id: string }) => { counts[r.group_id] = (counts[r.group_id] ?? 0) + 1; });
      setGroupCounts(counts);
    })();
  }, []);

  const selectedMsg = messages.find((m) => m.id === msgId);
  const selectedGroup = groups.find((g) => g.id === groupId);

  const submit = async () => {
    if (!msgId || !groupId) return toast.error("Select a message and group");
    let sendAtIso = new Date().toISOString();
    if (mode === "schedule") {
      if (!when) return toast.error("Choose a date and time");
      const d = new Date(when);
      if (isNaN(d.getTime()) || d.getTime() < Date.now() - 60_000) return toast.error("Pick a future time");
      sendAtIso = d.toISOString();
    }
    setSubmitting(true);
    try {
      const r = await queueFn({ data: { messageId: msgId, groupId, sendAt: sendAtIso, sendNow: mode === "now" } }) as { success?: number; total?: number };
      if (mode === "now") {
        toast.success(`Sent to ${r.success ?? 0} of ${r.total ?? 0} recipients`);
      } else {
        toast.success("Message scheduled");
      }
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-3xl font-semibold">Send & Schedule</h1>
        <p className="text-muted-foreground mt-1">Pick a saved message, choose a group, then send now or schedule for later.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Compose</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Message</Label>
            <Select value={msgId} onValueChange={setMsgId}>
              <SelectTrigger><SelectValue placeholder="Choose a saved message…" /></SelectTrigger>
              <SelectContent>
                {messages.length === 0
                  ? <div className="p-2 text-sm text-muted-foreground">No messages — create one in Messages.</div>
                  : messages.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedMsg && (
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{selectedMsg.body}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Contact group</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger><SelectValue placeholder="Choose a group…" /></SelectTrigger>
              <SelectContent>
                {groups.length === 0
                  ? <div className="p-2 text-sm text-muted-foreground">No groups yet.</div>
                  : groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name} ({groupCounts[g.id] ?? 0})</SelectItem>
                    ))}
              </SelectContent>
            </Select>
            {selectedGroup && (
              <p className="text-xs text-muted-foreground">{groupCounts[selectedGroup.id] ?? 0} recipient(s)</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>When</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as "now" | "schedule")} className="grid grid-cols-2 gap-3">
              <label className={`border rounded-md p-3 cursor-pointer flex items-center gap-2 ${mode === "now" ? "border-primary bg-secondary" : ""}`}>
                <RadioGroupItem value="now" /> <span>Send now</span>
              </label>
              <label className={`border rounded-md p-3 cursor-pointer flex items-center gap-2 ${mode === "schedule" ? "border-primary bg-secondary" : ""}`}>
                <RadioGroupItem value="schedule" /> <span>Schedule</span>
              </label>
            </RadioGroup>
            {mode === "schedule" && (
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            )}
          </div>

          <Button onClick={submit} disabled={submitting} className="w-full">
            <Send className="size-4 mr-2" />
            {submitting ? "Working…" : mode === "now" ? "Send now" : "Schedule message"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
