import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, MessageSquareText, Users, Send, Settings, LogOut, Church } from "lucide-react";
import { logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/messages", label: "Messages", icon: MessageSquareText },
  { to: "/groups", label: "Contact Groups", icon: Users },
  { to: "/send", label: "Send & Schedule", icon: Send },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-64 md:min-h-screen bg-sidebar border-b md:border-b-0 md:border-r border-sidebar-border flex md:flex-col">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border md:w-full">
          <div className="size-10 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-warm)" }}>
            <Church className="size-5" />
          </div>
          <div className="hidden md:block">
            <div className="font-semibold leading-tight text-sidebar-foreground">The Potter's House</div>
            <div className="text-xs text-muted-foreground">MN Connect</div>
          </div>
        </div>
        <nav className="flex md:flex-col gap-1 p-2 md:p-3 flex-1 overflow-x-auto">
          {nav.map((item) => {
            const active = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border hidden md:block">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => { logout(); navigate({ to: "/login" }); }}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-5 md:p-8 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
