import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Church } from "lucide-react";
import { isLoggedIn, login } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — TPH-MN Connect" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { if (isLoggedIn()) navigate({ to: "/" }); }, [navigate]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (login(u.trim(), p)) navigate({ to: "/" });
    else setErr("Invalid username or password");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, oklch(0.96 0.02 70), oklch(0.92 0.04 50))" }}>
      <Card className="w-full max-w-md shadow-lg" style={{ boxShadow: "var(--shadow-warm)" }}>
        <CardHeader className="text-center space-y-3">
          <div className="size-14 rounded-2xl mx-auto flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-warm)" }}>
            <Church className="size-7" />
          </div>
          <CardTitle className="text-2xl">The Potter's House — MN Connect</CardTitle>
          <CardDescription>Sign in to manage church communications</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" className="w-full">Sign in</Button>
            <p className="text-xs text-muted-foreground text-center">
              Default credentials: <span className="font-mono">admin / pottershouse</span>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
