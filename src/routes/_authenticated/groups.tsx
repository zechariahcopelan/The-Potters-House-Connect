import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ChevronDown, ChevronRight, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/groups")({
  component: GroupsPage,
  head: () => ({ meta: [{ title: "Contact Groups — TPH-MN Connect" }] }),
});

type Group = { id: string; name: string };
type Contact = { id: string; group_id: string; name: string | null; phone: string };

function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [g, c] = await Promise.all([
      supabase.from("contact_groups").select("*").order("name"),
      supabase.from("contacts").select("*").order("created_at"),
    ]);
    setGroups((g.data ?? []) as Group[]);
    setContacts((c.data ?? []) as Contact[]);
  };
  useEffect(() => { load(); }, []);

  const createGroup = async () => {
    if (!newGroup.trim()) return;
    const { error } = await supabase.from("contact_groups").insert({ name: newGroup.trim() });
    if (error) return toast.error(error.message);
    setNewGroup(""); setOpen(false); toast.success("Group created"); load();
  };

  const removeGroup = async (id: string) => {
    if (!confirm("Delete this group and all its contacts?")) return;
    const { error } = await supabase.from("contact_groups").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Group deleted"); load();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Contact Groups</h1>
          <p className="text-muted-foreground mt-1">Organize members into groups you can text together.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-2" /> New group</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New contact group</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="gname">Group name</Label>
              <Input id="gname" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="e.g. Prayer Warriors" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={createGroup}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {groups.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No groups yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const groupContacts = contacts.filter((c) => c.group_id === g.id);
            const isOpen = expanded === g.id;
            return (
              <Card key={g.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 cursor-pointer" onClick={() => setExpanded(isOpen ? null : g.id)}>
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    <CardTitle className="text-lg">{g.name}</CardTitle>
                    <span className="text-sm text-muted-foreground">({groupContacts.length})</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); removeGroup(g.id); }}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </CardHeader>
                {isOpen && (
                  <CardContent>
                    <ContactList groupId={g.id} contacts={groupContacts} onChange={load} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContactList({ groupId, contacts, onChange }: { groupId: string; contacts: Contact[]; onChange: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const add = async () => {
    const cleaned = phone.trim();
    if (!cleaned) return toast.error("Phone number required");
    const { error } = await supabase.from("contacts").insert({ group_id: groupId, name: name.trim() || null, phone: cleaned });
    if (error) return toast.error(error.message);
    setName(""); setPhone(""); onChange();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input className="flex-1 min-w-[140px]" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input className="flex-1 min-w-[160px]" placeholder="+15551234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button onClick={add}><UserPlus className="size-4 mr-2" /> Add</Button>
      </div>
      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contacts in this group.</p>
      ) : (
        <ul className="divide-y border rounded-md">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <div className="text-sm font-medium">{c.name || "(no name)"}</div>
                <div className="text-xs text-muted-foreground font-mono">{c.phone}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="size-4 text-destructive" /></Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Use full international format (e.g. +15551234567).</p>
    </div>
  );
}
