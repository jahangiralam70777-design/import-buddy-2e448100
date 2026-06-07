import { LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { adminNavItems } from "@/lib/app-data";
import { useAppStore } from "@/stores/app-store";

export function AdminSidebar() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const logout = useAppStore((s) => s.logout);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    setSidebarOpen(false);
    toast.success("Logged out");
    navigate({ to: "/login" });
  };
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="bg-cta-gradient flex h-9 w-9 items-center justify-center rounded-xl shadow-glow">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-sm font-bold tracking-tight">
            CA Aspire BD<span className="text-gradient"> Admin</span>
          </p>
          <p className="text-[10px] text-muted-foreground">Control Center · v3.2</p>
        </div>
      </div>

      <nav className="mt-6 flex-1 overflow-y-auto">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Manage
        </p>
        <ul className="mt-2 space-y-1">
          {adminNavItems.map((m) => {
            const isActive = m.to === "/admin" ? currentPath === "/admin" : currentPath === m.to;
            return (
              <li key={m.title}>
                <Link
                  to={m.to as never}
                  activeOptions={{ exact: true }}
                  onClick={() => mobile && setSidebarOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                    isActive
                      ? "bg-cta-gradient text-white shadow-glow"
                      : "text-foreground/80 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <m.icon className="h-4 w-4" />
                  {m.title}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <button onClick={handleLogout} className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive">
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </>
  );
  return (
    <>
      <button type="button" onClick={() => setSidebarOpen(true)} className="glass fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl lg:hidden" aria-label="Open admin menu">
        <Menu className="h-4 w-4" />
      </button>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="glass shadow-card-soft pointer-events-auto relative z-10 flex h-full w-72 max-w-[85vw] flex-col p-4">
            <button aria-label="Close menu" onClick={() => setSidebarOpen(false)} className="absolute right-3 top-3 rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <SidebarContent mobile />
          </aside>
        </div>
      )}
      <aside className="glass shadow-card-soft sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-3xl p-4 lg:flex">
        <SidebarContent />
      </aside>
    </>
  );
}
