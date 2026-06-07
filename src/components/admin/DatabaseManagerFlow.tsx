import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity,
  Database,
  Download,
  HardDrive,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
  ListChecks,
  Layers,
  Server,
  Clock,
  Eye,
  Search,
  Trash2,
  Loader2,
  Radio,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  adminGetDatabaseStats,
  type DatabaseManagerStats,
} from "@/lib/admin-database.functions";
import {
  adminListTableRows,
  adminDeleteTableRow,
  INSPECTABLE_TABLES,
  type InspectableTable,
} from "@/lib/admin-database-inspect.functions";

const DB_STATS_KEY = ["admin-database-stats"] as const;

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en").format(n ?? 0);
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "from-[var(--neon-purple)] to-[var(--neon-blue)]",
}: {
  icon: typeof Database;
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-glow`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{typeof value === "number" ? formatNumber(value) : value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function HealthBadge({ status }: { status: DatabaseManagerStats["systemHealth"]["status"] }) {
  const map = {
    healthy: { label: "Healthy", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", Icon: ShieldCheck },
    warning: { label: "Warning", className: "bg-amber-500/20 text-amber-300 border-amber-500/30", Icon: ShieldAlert },
    critical: { label: "Critical", className: "bg-rose-500/20 text-rose-300 border-rose-500/30", Icon: ShieldAlert },
  } as const;
  const { label, className, Icon } = map[status];
  return (
    <Badge variant="outline" className={`gap-1.5 ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}

function toCsv(stats: DatabaseManagerStats): string {
  const lines: string[] = [];
  lines.push("Section,Metric,Value");
  lines.push(`Users,Total,${stats.users.total}`);
  lines.push(`Users,Students,${stats.users.students}`);
  lines.push(`Users,Admins,${stats.users.admins}`);
  lines.push(`Users,Active 7d,${stats.users.active7d}`);
  lines.push(`Users,New 7d,${stats.users.new7d}`);
  lines.push(`Users,New 30d,${stats.users.new30d}`);
  for (const [k, v] of Object.entries(stats.content)) lines.push(`Content,${k},${v}`);
  lines.push(`Storage,Database size bytes,${stats.storage.dbSizeBytes}`);
  lines.push(`Storage,Capacity bytes,${stats.storage.capacityBytes}`);
  lines.push("");
  lines.push("Table,Size bytes,Row estimate");
  for (const t of stats.storage.tables) lines.push(`${t.table},${t.sizeBytes},${t.rows}`);
  lines.push("");
  lines.push("Subject,MCQ count");
  for (const s of stats.mcqBySubject) lines.push(`${s.name},${s.count}`);
  lines.push("");
  lines.push("Date,New users,New MCQs,Attempts");
  for (const d of stats.growthDaily) lines.push(`${d.date},${d.users},${d.mcqs},${d.attempts}`);
  return lines.join("\n");
}

function downloadCsv(stats: DatabaseManagerStats) {
  const blob = new Blob([toCsv(stats)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `database-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function DatabaseManagerFlow() {
  const qc = useQueryClient();
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: DB_STATS_KEY,
    queryFn: () => adminGetDatabaseStats(),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const usagePct = useMemo(() => {
    if (!data) return 0;
    return Math.min(100, (data.storage.dbSizeBytes / data.storage.capacityBytes) * 100);
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-400" />
        <h2 className="text-lg font-semibold">Couldn't load database stats</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as Error)?.message ?? "No data available right now."}
        </p>
        <Button className="mt-4" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  const otherTablesShown = data.storage.tables.slice(0, 12);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass-card flex flex-col gap-3 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--neon-purple)] to-[var(--neon-blue)] text-white shadow-glow">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Database Manager</h1>
              <p className="text-xs text-muted-foreground">
                Live overview · refreshed {new Date(data.generatedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <Radio className={`h-3 w-3 ${isFetching ? "animate-pulse" : ""}`} /> Live · 5s
          </Badge>
          <HealthBadge status={data.systemHealth.status} />
          <Button variant="outline" size="sm" onClick={() => { qc.invalidateQueries({ queryKey: DB_STATS_KEY }); toast.success("Refreshing…"); }} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => { downloadCsv(data); toast.success("Report downloaded"); }}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* User KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Total Users" value={data.users.total} hint={`${data.users.new7d} new in 7d`} />
        <KpiCard icon={Users} label="Students" value={data.users.students} accent="from-blue-500 to-cyan-500" />
        <KpiCard icon={ShieldCheck} label="Admins" value={data.users.admins} accent="from-fuchsia-500 to-pink-500" />
        <KpiCard icon={Activity} label="Active (7d)" value={data.users.active7d} hint="Distinct users with attempts" accent="from-emerald-500 to-teal-500" />
      </div>

      {/* Content KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={ListChecks} label="Total MCQs" value={data.content.mcqs} />
        <KpiCard icon={Layers} label="Quiz Sets" value={data.content.quizzes} hint={`${formatNumber(data.content.mockTests)} mock tests`} />
        <KpiCard icon={TrendingUp} label="Exam Attempts" value={data.content.examAttempts} accent="from-amber-500 to-orange-500" />
        <KpiCard icon={Activity} label="Most Active Module" value={data.mostActiveModule.name} hint={`${formatNumber(data.mostActiveModule.value)} items`} accent="from-violet-500 to-fuchsia-500" />
      </div>

      {/* Storage Overview */}
      <SectionCard
        title="Storage usage"
        action={<Badge variant="outline" className="text-xs">{formatBytes(data.storage.dbSizeBytes)} / {formatBytes(data.storage.capacityBytes)}</Badge>}
      >
        <Progress value={usagePct} className="h-3" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Used: <strong className="text-foreground">{formatBytes(data.storage.dbSizeBytes)}</strong></span>
          <span>Free: <strong className="text-foreground">{formatBytes(Math.max(0, data.storage.capacityBytes - data.storage.dbSizeBytes))}</strong></span>
          <span>Usage: <strong className="text-foreground">{usagePct.toFixed(1)}%</strong></span>
        </div>
      </SectionCard>

      {/* Storage Breakdown + Growth */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Storage by table" action={<Badge variant="outline" className="text-xs">Top {otherTablesShown.length}</Badge>}>
          {otherTablesShown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available</p>
          ) : (
            <ul className="space-y-3">
              {otherTablesShown.map((t) => {
                const pct = data.storage.dbSizeBytes > 0 ? (t.sizeBytes / data.storage.dbSizeBytes) * 100 : 0;
                return (
                  <li key={t.table}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono">{t.table}</span>
                      <span className="text-muted-foreground">{formatBytes(t.sizeBytes)} · ~{formatNumber(t.rows)} rows</span>
                    </div>
                    <Progress value={pct} className="mt-1 h-1.5" />
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Daily growth (30 days)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.growthDaily}>
                <defs>
                  <linearGradient id="g-users" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-mcqs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "rgba(15,15,25,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="users" name="New users" stroke="#a78bfa" fill="url(#g-users)" />
                <Area type="monotone" dataKey="mcqs" name="New MCQs" stroke="#34d399" fill="url(#g-mcqs)" />
                <Area type="monotone" dataKey="attempts" name="Attempts" stroke="#60a5fa" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* MCQ breakdowns */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="MCQs by subject">
          {data.mcqBySubject.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.mcqBySubject} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip contentStyle={{ background: "rgba(15,15,25,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Top chapters by MCQ count">
          {data.mcqByChapter.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 text-left">Chapter</th>
                    <th className="py-2 text-left">Subject</th>
                    <th className="py-2 text-right">MCQs</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mcqByChapter.map((c) => (
                    <tr key={`${c.subject}-${c.name}`} className="border-t border-border/60">
                      <td className="py-2">{c.name}</td>
                      <td className="py-2 text-muted-foreground">{c.subject}</td>
                      <td className="py-2 text-right font-mono">{formatNumber(c.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {/* System health + extras */}
      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard title="System health">
          <div className="flex items-center gap-3">
            <Server className="h-8 w-8 text-muted-foreground" />
            <div>
              <HealthBadge status={data.systemHealth.status} />
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {data.systemHealth.notes.map((n) => <li key={n}>• {n}</li>)}
              </ul>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Peak usage time">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-display text-2xl font-bold">
                {data.peakHour ? `${String(data.peakHour.hour).padStart(2, "0")}:00` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.peakHour ? `${formatNumber(data.peakHour.attempts)} attempts at peak (last 7d)` : "No data available"}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Database">
          <div className="flex items-center gap-3">
            <HardDrive className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-display text-2xl font-bold">{formatBytes(data.storage.dbSizeBytes)}</p>
              <p className="text-xs text-muted-foreground">
                {data.storage.tables.length} tables · {formatNumber(data.storage.tables.reduce((s, t) => s + t.rows, 0))} estimated rows
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Table inspector */}
      <TableInspector tables={data.storage.tables.map((t) => t.table)} />
    </div>
  );
}

const PROTECTED_TABLES = new Set(["user_roles", "site_settings", "module_visibility"]);

function isInspectable(name: string): name is InspectableTable {
  return (INSPECTABLE_TABLES as readonly string[]).includes(name);
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.length > 80 ? value.slice(0, 77) + "…" : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const s = JSON.stringify(value);
    return s.length > 80 ? s.slice(0, 77) + "…" : s;
  } catch {
    return String(value);
  }
}

function TableInspector({ tables }: { tables: string[] }) {
  const qc = useQueryClient();
  const inspectable = useMemo(
    () => tables.filter(isInspectable).sort() as InspectableTable[],
    [tables],
  );
  const [selected, setSelected] = useState<InspectableTable | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deleteRow, setDeleteRow] = useState<{ id: string } | null>(null);
  const [confirmStage, setConfirmStage] = useState(0);
  const pageSize = 25;

  const queryKey = ["admin-table-rows", selected, page, search] as const;
  const { data: rows, isFetching, error } = useQuery({
    queryKey,
    queryFn: () =>
      adminListTableRows({
        data: { table: selected!, page, pageSize, search: search || undefined },
      }),
    enabled: !!selected,
    refetchInterval: selected ? 5_000 : false,
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      adminDeleteTableRow({ data: { table: selected!, id } }),
    onSuccess: () => {
      toast.success("Row deleted");
      qc.invalidateQueries({ queryKey: ["admin-table-rows", selected] });
      qc.invalidateQueries({ queryKey: ["admin-database-stats"] });
      setDeleteRow(null);
      setConfirmStage(0);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openTable(t: InspectableTable) {
    setSelected(t);
    setPage(0);
    setSearch("");
    setSearchInput("");
  }

  function close() {
    setSelected(null);
    setDeleteRow(null);
    setConfirmStage(0);
  }

  function exportJson() {
    if (!rows) return;
    const blob = new Blob([JSON.stringify(rows.rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rows.table}-page${page + 1}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Page exported");
  }

  const totalPages = rows ? Math.max(1, Math.ceil(rows.total / pageSize)) : 1;
  const canDelete = selected ? !PROTECTED_TABLES.has(selected) : false;

  return (
    <>
      <SectionCard
        title="Tables"
        action={<Badge variant="outline" className="text-xs">{inspectable.length} inspectable</Badge>}
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {inspectable.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => openTable(t)}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-left text-sm transition hover:border-primary/50 hover:bg-card/70"
            >
              <span className="font-mono">{t}</span>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </SectionCard>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono">
              <Database className="h-4 w-4" /> {selected}
            </DialogTitle>
            <DialogDescription>
              Live data · auto-refresh every 5s · {rows ? `${formatNumber(rows.total)} rows total` : "loading…"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { setSearch(searchInput); setPage(0); }
                }}
                placeholder="Search (name / title / email / key)…"
                className="pl-8"
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => { setSearch(searchInput); setPage(0); }}>
              Search
            </Button>
            <Button size="sm" variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["admin-table-rows", selected] })} disabled={isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={exportJson} disabled={!rows || rows.rows.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export JSON
            </Button>
          </div>

          <div className="mt-3 max-h-[55vh] overflow-auto rounded-lg border border-border/60">
            {error ? (
              <div className="p-4 text-sm text-rose-300">{(error as Error).message}</div>
            ) : !rows ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : rows.rows.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No rows</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card/95 backdrop-blur">
                  <tr>
                    {rows.columns.map((c) => (
                      <th key={c} className="whitespace-nowrap border-b border-border/60 px-2 py-2 text-left font-mono text-[10px] uppercase text-muted-foreground">
                        {c}
                      </th>
                    ))}
                    <th className="sticky right-0 border-b border-border/60 bg-card/95 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.rows.map((row, idx) => {
                    const rid = String((row as Record<string, unknown>).id ?? idx);
                    return (
                      <tr key={rid} className="border-b border-border/40 hover:bg-card/40">
                        {rows.columns.map((c) => (
                          <td key={c} className="whitespace-nowrap px-2 py-1.5 font-mono">
                            {formatCell((row as Record<string, unknown>)[c])}
                          </td>
                        ))}
                        <td className="sticky right-0 bg-card/95 px-2 py-1.5">
                          {canDelete && (row as Record<string, unknown>).id ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-rose-400 hover:bg-rose-500/10"
                              onClick={() => { setDeleteRow({ id: String((row as Record<string, unknown>).id) }); setConfirmStage(1); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page === 0 || isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Prev
              </Button>
              <Button size="sm" variant="outline" disabled={page + 1 >= totalPages || isFetching} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRow} onOpenChange={(o) => { if (!o) { setDeleteRow(null); setConfirmStage(0); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
              {confirmStage === 1 ? "Delete this row?" : "Are you absolutely sure?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmStage === 1
                ? `This will permanently delete row id ${deleteRow?.id} from "${selected}". This action cannot be undone.`
                : "Final confirmation. Click Delete forever to remove this row from the database."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            {confirmStage === 1 ? (
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); setConfirmStage(2); }}
                className="bg-rose-500 text-white hover:bg-rose-600"
              >
                Continue
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); if (deleteRow) deleteMutation.mutate(deleteRow.id); }}
                disabled={deleteMutation.isPending}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete forever
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
