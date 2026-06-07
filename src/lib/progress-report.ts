import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Client-side learning report generation (PDF + Excel) from the real
 * Daily Progress Center dataset. No data is fabricated — every value comes
 * straight from the server aggregate that powers the dashboard.
 */

export type ReportPeriod = "daily" | "weekly" | "monthly";

type Totals = {
  correct: number;
  wrong: number;
  accuracy: number;
  avgScore: number;
  studyMinutes: number;
  mcqs: number;
  quizzes: number;
  mocks: number;
  chaptersCompleted: number;
  subjectsCovered: number;
};

type PeriodBlock = {
  attempts?: number;
  mcqs?: number;
  quizzes?: number;
  mocks?: number;
  accuracy?: number;
  studyMinutes?: number;
  correct?: number;
  wrong?: number;
};

export type ReportData = {
  today?: PeriodBlock & { streak?: number; bestStreak?: number; chaptersTouched?: number };
  week?: PeriodBlock;
  month?: PeriodBlock & { activeDays?: number };
  totals?: Totals;
  subjects?: {
    name: string;
    level: string;
    completionPct: number;
    avgScore: number;
    weakChapters: number;
    completedChapters: number;
    totalChapters: number;
  }[];
};

function fmtMinutes(min = 0) {
  if (!min) return "0m";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

function blockFor(period: ReportPeriod, data: ReportData): PeriodBlock | undefined {
  if (period === "daily") return data.today;
  if (period === "weekly") return data.week;
  return data.month;
}

function summaryRows(period: ReportPeriod, data: ReportData): [string, string][] {
  const b = blockFor(period, data) ?? {};
  const t = data.totals;
  const rows: [string, string][] = [
    ["MCQ practice sessions", String(b.mcqs ?? 0)],
    ["Quizzes completed", String(b.quizzes ?? 0)],
    ["Mock tests completed", String(b.mocks ?? 0)],
    ["Total sessions", String(b.attempts ?? 0)],
    ["Accuracy", `${b.accuracy ?? 0}%`],
    ["Study time", fmtMinutes(b.studyMinutes ?? 0)],
  ];
  if (period === "daily" && data.today) {
    rows.push(["Current streak", `${data.today.streak ?? 0} days`]);
    rows.push(["Best streak", `${data.today.bestStreak ?? 0} days`]);
  }
  if (period === "monthly" && data.month) {
    rows.push(["Active days", `${data.month.activeDays ?? 0} / 30`]);
  }
  if (t) {
    rows.push(["Lifetime correct answers", String(t.correct)]);
    rows.push(["Lifetime wrong answers", String(t.wrong)]);
    rows.push(["Lifetime average score", `${t.avgScore}%`]);
    rows.push(["Chapters completed", String(t.chaptersCompleted)]);
    rows.push(["Subjects covered", String(t.subjectsCovered)]);
  }
  return rows;
}

export function downloadProgressPdf(period: ReportPeriod, data: ReportData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const now = new Date();
  const title = `${PERIOD_LABEL[period]} Learning Report`;

  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(title, 40, 38);
  doc.setFontSize(10);
  doc.text(`Generated ${now.toLocaleString()}`, 40, 56);

  doc.setTextColor(30, 30, 30);
  autoTable(doc, {
    startY: 92,
    head: [["Metric", "Value"]],
    body: summaryRows(period, data),
    theme: "striped",
    headStyles: { fillColor: [124, 58, 237] },
    styles: { fontSize: 10, cellPadding: 6 },
  });

  const subjects = (data.subjects ?? []).filter(
    (s) => s.completedChapters > 0 || s.avgScore > 0,
  );
  if (subjects.length) {
    autoTable(doc, {
      // @ts-expect-error lastAutoTable is injected by the plugin
      startY: (doc.lastAutoTable?.finalY ?? 120) + 24,
      head: [["Subject", "Level", "Completion", "Avg score", "Weak chapters"]],
      body: subjects.map((s) => [
        s.name,
        s.level,
        `${s.completionPct}%`,
        `${s.avgScore}%`,
        String(s.weakChapters),
      ]),
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9, cellPadding: 5 },
    });
  }

  doc.save(`learning-report-${period}-${now.toISOString().slice(0, 10)}.pdf`);
}

export function downloadProgressExcel(period: ReportPeriod, data: ReportData) {
  const now = new Date();
  const wb = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    [`${PERIOD_LABEL[period]} Learning Report`],
    [`Generated`, now.toLocaleString()],
    [],
    ["Metric", "Value"],
    ...summaryRows(period, data),
  ]);
  summary["!cols"] = [{ wch: 30 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, summary, "Summary");

  const subjects = data.subjects ?? [];
  if (subjects.length) {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Subject", "Level", "Completion %", "Avg score %", "Weak chapters", "Chapters done", "Total chapters"],
      ...subjects.map((s) => [
        s.name,
        s.level,
        s.completionPct,
        s.avgScore,
        s.weakChapters,
        s.completedChapters,
        s.totalChapters,
      ]),
    ]);
    sheet["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 13 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, sheet, "Subjects");
  }

  XLSX.writeFile(wb, `learning-report-${period}-${now.toISOString().slice(0, 10)}.xlsx`);
}

export function downloadProgressCsv(period: ReportPeriod, data: ReportData) {
  const now = new Date();
  const rows = summaryRows(period, data);
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = [];
  lines.push(`${PERIOD_LABEL[period]} Learning Report`);
  lines.push(`Generated,${esc(now.toLocaleString())}`);
  lines.push("");
  lines.push("Metric,Value");
  for (const [k, v] of rows) lines.push(`${esc(k)},${esc(v)}`);
  const subjects = data.subjects ?? [];
  if (subjects.length) {
    lines.push("");
    lines.push("Subject,Level,Completion %,Avg score %,Weak chapters,Chapters done,Total chapters");
    for (const s of subjects) {
      lines.push([s.name, s.level, s.completionPct, s.avgScore, s.weakChapters, s.completedChapters, s.totalChapters].map(esc).join(","));
    }
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `learning-report-${period}-${now.toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
