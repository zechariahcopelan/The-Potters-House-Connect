import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/_authenticated")({
  component: Authed,
});

function Authed() {
  const { authed, ready } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && !authed) navigate({ to: "/login" });
  }, [authed, ready, navigate]);
  if (!ready || !authed) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  return <AppLayout />;
}
