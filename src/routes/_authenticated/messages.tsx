import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
  head: () => ({ meta: [{ title: "Messages — TPH-MN Connect" }] }),
});

type Msg = { id: string; title: string; body: string; updated_at: string };

function MessagesPage() {
  const [items, setItems] = useState<Msg[]>([]);
  const [editing, setEditing] = useState<Msg | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const load = async () => {
    const { data } = await supabase.from("messages").select("*").order("updated_at", { ascending: false });
    setItems((data ?? []) as Msg[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setTitle(""); setBody(""); setOpen(true); };
  const openEdit = (m: Msg) => { setEditing(m); setTitle(m.title); setBody(m.body); setOpen(true); };

  const save = async () => {
    if (!title.trim() || !body.trim()) { toast.error("Title and message are required"); return; }
    if (editing) {
      const { error } = await supabase.from("messages").update({ title, body, updated_at: new Date().toISOString() }).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Message updated");
    } else {
      const { error } = await supabase.from("messages").insert({ title, body });
      if (error) return toast.error(error.message);
      toast.success("Message created");
    }
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this message template?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Message Library</h1>
          <p className="text-muted-foreground mt-1">Reusable templates for prayer reminders, announcements, and more.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="size-4 mr-2" /> New message</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit message" : "New message"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" placeholder="e.g. 5:30AM Prayer Reminder" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea id="body" rows={6} placeholder="Type the SMS the congregation will receive…" value={body} onChange={(e) => setBody(e.target.value)} />
                <p className="text-xs text-muted-foreground">{body.length} characters</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>{editing ? "Save changes" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {items.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No messages yet. Create your first template above.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((m) => (
            <Card key={m.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <CardTitle className="text-lg">{m.title}</CardTitle>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-foreground/80">{m.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
