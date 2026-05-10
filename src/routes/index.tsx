import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { authed, ready } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!ready) return;
    navigate({ to: authed ? "/dashboard" : "/login" });
  }, [authed, ready, navigate]);
  return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
}
