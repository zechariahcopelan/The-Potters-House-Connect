import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — TPH-MN Connect" }] }),
});

function SettingsPage() {
  const [sid, setSid] = useState("");
  const [token, setToken] = useState("");
  const [from, setFrom] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("*").eq("id", 1).single();
      if (data) {
        setSid(data.twilio_account_sid ?? "");
        setToken(data.twilio_auth_token ?? "");
        setFrom(data.twilio_from_number ?? "");
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        twilio_account_sid: sid.trim() || null,
        twilio_auth_token: token.trim() || null,
        twilio_from_number: from.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your Twilio account for SMS delivery.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Twilio</CardTitle>
          <CardDescription>Find these in your Twilio console.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sid">Account SID</Label>
            <Input id="sid" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={sid} onChange={(e) => setSid(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="token">Auth Token</Label>
            <Input id="token" type="password" placeholder="••••••••••••••••" value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from">Sending phone number</Label>
            <Input id="from" placeholder="+15551234567" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Admin login</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Default credentials: <span className="font-mono">admin / pottershouse</span></p>
          <p>To change them, edit <span className="font-mono">src/lib/auth.ts</span>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
