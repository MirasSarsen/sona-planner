import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import MotivationalModal from "@/components/MotivationalModal";
import { Plus, Pencil, Trash2, TrendingUp, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ───────────────────────────────────────────────────────────────────

type MoodEntry = {
  id: string;
  user_id: string;
  date: string;
  mood: number;
};

type CustomMetric = {
  id: string;
  user_id: string;
  name: string;
  value: number;
  unit: string;
  color: string;
  created_at: string | null;
};

type KanbanTask = {
  id: string;
  status: string;
  created_at: string | null;
};

type MetricForm = {
  name: string;
  value: string;
  unit: string;
  color: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_EMOJIS = ["😢", "😟", "😐", "🙂", "😄"];
const MOOD_LABELS = ["Өте жаман", "Жаман", "Орташа", "Жақсы", "Өте жақсы"];
const MONTH_NAMES = [
  "Қаңтар", "Ақпан", "Наурыз", "Сәуір", "Мамыр", "Маусым",
  "Шілде", "Тамыз", "Қыркүйек", "Қазан", "Қараша", "Желтоқсан",
];
const DAY_HEADERS = ["Дс", "Сс", "Ср", "Бс", "Жм", "Сн", "Жс"];
const WEEK_LABELS = ["Дүс", "Сей", "Сәр", "Бей", "Жұм", "Сен", "Жек"];

const METRIC_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

const METRIC_COLOR_HEX: Record<string, string> = {
  "bg-blue-500": "#3b82f6",
  "bg-emerald-500": "#10b981",
  "bg-violet-500": "#8b5cf6",
  "bg-amber-500": "#f59e0b",
  "bg-rose-500": "#f43f5e",
  "bg-cyan-500": "#06b6d4",
};

const EMPTY_FORM: MetricForm = { name: "", value: "", unit: "", color: METRIC_COLORS[0] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function moodColorClass(mood: number) {
  if (mood >= 4) return "bg-emerald-400 text-white";
  if (mood === 3) return "bg-yellow-400 text-white";
  return "bg-red-400 text-white";
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const todayStr = toDateStr(year, month, today);

  const [userId, setUserId] = useState<string | null>(null);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [savingMood, setSavingMood] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState<string | null>(null);
  const [motivationalImage, setMotivationalImage] = useState<string | null>(null);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [showMetricDialog, setShowMetricDialog] = useState(false);
  const [editingMetric, setEditingMetric] = useState<CustomMetric | null>(null);
  const [metricForm, setMetricForm] = useState<MetricForm>(EMPTY_FORM);
  const [savingMetric, setSavingMetric] = useState(false);

  const [deletingMetricId, setDeletingMetricId] = useState<string | null>(null);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineValue, setInlineValue] = useState("");

  // ── Auth ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  // ── Fetch ──
  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const startOfMonth = toDateStr(year, month, 1);
    const endOfMonth = toDateStr(year, month, new Date(year, month + 1, 0).getDate());

    try {
      const [moodsRes, metricsRes, tasksRes] = await Promise.all([
        supabase
          .from("mood_entries")
          .select("*")
          .eq("user_id", userId)
          .gte("date", startOfMonth)
          .lte("date", endOfMonth)
          .order("date"),
        supabase
          .from("custom_metrics")
          .select("*")
          .eq("user_id", userId)
          .order("created_at"),
        supabase
          .from("kanban_tasks")
          .select("id, status, created_at")
          .eq("user_id", userId),
      ]);

      if (!moodsRes.error) setMoodEntries((moodsRes.data as MoodEntry[]) ?? []);
      if (!metricsRes.error) setMetrics((metricsRes.data as CustomMetric[]) ?? []);
      if (!tasksRes.error) setTasks((tasksRes.data as KanbanTask[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [userId, year, month]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const todayMood = moodEntries.find((e) => e.date === todayStr);
  useEffect(() => {
    if (todayMood) setSelectedMood(todayMood.mood);
  }, [todayMood]);

  // ── Mood save ──
  const handleSaveMood = async () => {
    if (!selectedMood || !userId) return;
    setSavingMood(true);
    setIsLoadingMessage(true);
    setShowModal(true);
    setMotivationalMessage(null);
    setMotivationalImage(null);

    try {
      const { error } = await supabase.from("mood_entries").upsert(
        { user_id: userId, date: todayStr, mood: selectedMood },
        { onConflict: "user_id,date" }
      );
      if (error) throw error;
      await fetchAll();

      try {
        const { data: files } = await supabase.storage.from("content").list("motivation", { limit: 100 });
        if (files?.length) {
          const imgs = files.filter((f) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name));
          if (imgs.length) {
            const rand = imgs[Math.floor(Math.random() * imgs.length)];
            const { data: urlData } = supabase.storage.from("content").getPublicUrl(`motivation/${rand.name}`);
            if (urlData?.publicUrl) setMotivationalImage(urlData.publicUrl);
          }
        }
      } catch {}

      try {
        const { data, error: fnErr } = await supabase.functions.invoke("motivational-message", { body: { mood: selectedMood } });
        if (!fnErr && data?.message) setMotivationalMessage(data.message);
      } catch {}
    } catch (err: any) {
      toast({ title: "Қате", description: err.message, variant: "destructive" });
    } finally {
      setSavingMood(false);
      setIsLoadingMessage(false);
    }
  };

  // ── Metric CRUD ──
  const openAddMetric = () => {
    setEditingMetric(null);
    setMetricForm(EMPTY_FORM);
    setShowMetricDialog(true);
  };

  const openEditMetric = (m: CustomMetric) => {
    setEditingMetric(m);
    setMetricForm({ name: m.name, value: String(m.value), unit: m.unit, color: m.color });
    setShowMetricDialog(true);
  };

  const handleSaveMetric = async () => {
    if (!userId || !metricForm.name.trim()) return;
    setSavingMetric(true);
    const payload = {
      user_id: userId,
      name: metricForm.name.trim(),
      value: parseFloat(metricForm.value) || 0,
      unit: metricForm.unit.trim(),
      color: metricForm.color,
    };
    try {
      if (editingMetric) {
        const { error } = await supabase.from("custom_metrics").update(payload).eq("id", editingMetric.id);
        if (error) throw error;
        toast({ title: "Метрика жаңартылды" });
      } else {
        const { error } = await supabase.from("custom_metrics").insert(payload);
        if (error) throw error;
        toast({ title: "Метрика қосылды" });
      }
      setShowMetricDialog(false);
      setEditingMetric(null);
      setMetricForm(EMPTY_FORM);
      await fetchAll();
    } catch (err: any) {
      toast({ title: "Қате", description: err.message, variant: "destructive" });
    } finally {
      setSavingMetric(false);
    }
  };

  const handleDeleteMetric = async () => {
    if (!deletingMetricId) return;
    const { error } = await supabase.from("custom_metrics").delete().eq("id", deletingMetricId);
    if (error) {
      toast({ title: "Қате", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Метрика жойылды" });
      await fetchAll();
    }
    setDeletingMetricId(null);
  };

  const startInlineEdit = (m: CustomMetric) => {
    setInlineEditId(m.id);
    setInlineValue(String(m.value));
  };

  const commitInlineEdit = async (m: CustomMetric) => {
    const newVal = parseFloat(inlineValue);
    if (!isNaN(newVal) && newVal !== m.value) {
      const { error } = await supabase.from("custom_metrics").update({ value: newVal }).eq("id", m.id);
      if (error) {
        toast({ title: "Қате", description: error.message, variant: "destructive" });
      } else {
        await fetchAll();
      }
    }
    setInlineEditId(null);
  };

  // ── Computed data ──
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const calendarDays: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const moodMap: Record<string, number> = {};
  moodEntries.forEach((e) => { moodMap[e.date.split("T")[0]] = e.mood; });

  const weeklyData = WEEK_LABELS.map((name, i) => ({
    name,
    count: tasks.filter((t) => {
      if (!t.created_at) return false;
      return ((new Date(t.created_at).getDay() + 6) % 7) === i;
    }).length,
  }));

  const monthlyData = Array.from({ length: today }, (_, i) => {
    const d = i + 1;
    const prefix = `${year}-${pad(month + 1)}-${pad(d)}`;
    return {
      day: d,
      done: tasks.filter((t) => t.status === "done" && t.created_at?.startsWith(prefix)).length,
    };
  });

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const completionPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const moodValues = moodEntries.map((e) => e.mood);
  const avgMood = moodValues.length ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length : 0;

  const tooltipStyle = {
    contentStyle: {
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 8,
      color: "hsl(var(--foreground))",
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-3xl font-semibold text-foreground">АНАЛИТИКА</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="gap-1">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Жаңарту
          </Button>
          <Button size="sm" onClick={openAddMetric} className="gap-1">
            <Plus className="w-4 h-4" />
            Метрика қосу
          </Button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card border shadow-sm">
              <CardContent className="p-4">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-card border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Барлық тапсырма</p>
                <p className="text-4xl font-bold text-foreground">{totalTasks}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Орындалды</p>
                <p className="text-4xl font-bold text-emerald-500">{doneTasks}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Орындалу %</p>
                <p className="text-4xl font-bold text-foreground">{completionPct}%</p>
              </CardContent>
            </Card>
            <Card className="bg-card border shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Орт. көңіл-күй</p>
                <p className="text-4xl font-bold text-foreground">
                  {avgMood ? `${avgMood.toFixed(1)} ${MOOD_EMOJIS[Math.round(avgMood) - 1]}` : "—"}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Mood tracker + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Күнделікті көңіл-күй</h3>
            <div className="flex justify-center gap-2 sm:gap-4 mb-5 flex-wrap">
              {MOOD_EMOJIS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedMood(i + 1)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    selectedMood === i + 1
                      ? "bg-primary/10 ring-2 ring-primary scale-110"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="text-3xl">{emoji}</span>
                  <span className="text-xs text-muted-foreground">{MOOD_LABELS[i]}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-center">
              <Button onClick={handleSaveMood} disabled={!selectedMood || savingMood}>
                {savingMood ? "Жүктелуде..." : todayMood ? "Жаңарту" : "Сақтау"}
              </Button>
            </div>
            {todayMood && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                Бүгінгі көңіл-күй:{" "}
                <span className="font-medium">
                  {MOOD_EMOJIS[todayMood.mood - 1]} {MOOD_LABELS[todayMood.mood - 1]}
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Көңіл-күй күнтізбесі — {MONTH_NAMES[month]} {year}
            </h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-muted-foreground font-medium">
              {DAY_HEADERS.map((d) => <div key={d}>{d}</div>)}
            </div>
            {loading ? (
              <Skeleton className="h-32 w-full rounded-lg" />
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const dayStr = day ? toDateStr(year, month, day) : null;
                  const mood = dayStr ? moodMap[dayStr] : undefined;
                  return (
                    <div
                      key={i}
                      title={mood ? `${day} — ${MOOD_LABELS[mood - 1]}` : undefined}
                      className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-all ${
                        day
                          ? mood
                            ? `${moodColorClass(mood)} cursor-default`
                            : "bg-muted/50 text-muted-foreground"
                          : ""
                      }`}
                    >
                      {day || ""}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400" /> Жақсы (4-5)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400" /> Орташа (3)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> Нашар (1-2)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Тапсырмалар — апталық жүктеме</h3>
            {loading ? (
              <Skeleton className="h-56 w-full rounded-lg" />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="count" name="Тапсырма" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold mb-1 text-foreground">Орындалған тапсырмалар — айлық</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Орындалды: {doneTasks} / {totalTasks} ({completionPct}%)
            </p>
            {loading ? (
              <Skeleton className="h-56 w-full rounded-lg" />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip {...tooltipStyle} />
                    <Line type="monotone" dataKey="done" name="Орындалды" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custom Metrics */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Өз метрикаларым</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="bg-card border shadow-sm">
                <CardContent className="p-4">
                  <Skeleton className="h-1 w-8 rounded-full mb-2" />
                  <Skeleton className="h-3 w-24 mb-2" />
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : metrics.length === 0 ? (
          <Card className="bg-card border border-dashed shadow-sm">
            <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
              <TrendingUp className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">
                Сіздің өз метрикаларыңыз жоқ.<br />
                «Метрика қосу» батырмасын басып, бірінші метриканы жасаңыз.
              </p>
              <Button size="sm" onClick={openAddMetric} className="gap-1 mt-1">
                <Plus className="w-4 h-4" />
                Метрика қосу
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m) => (
              <Card key={m.id} className="bg-card border shadow-sm group relative overflow-hidden">
                <CardContent className="p-4">
                  <div className={`w-8 h-1 rounded-full ${m.color} mb-3`} />
                  <p className="text-xs text-muted-foreground truncate mb-1">{m.name}</p>

                  {inlineEditId === m.id ? (
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        className="w-20 text-3xl font-bold bg-transparent border-b border-primary outline-none text-foreground"
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        onBlur={() => commitInlineEdit(m)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitInlineEdit(m);
                          if (e.key === "Escape") setInlineEditId(null);
                        }}
                        autoFocus
                      />
                      {m.unit && <span className="text-sm text-muted-foreground">{m.unit}</span>}
                    </div>
                  ) : (
                    <button
                      className="flex items-baseline gap-1 hover:opacity-80 transition-opacity"
                      onClick={() => startInlineEdit(m)}
                      title="Мәнді өзгерту үшін басыңыз"
                    >
                      <span className="text-3xl font-bold text-foreground">{m.value}</span>
                      {m.unit && <span className="text-sm text-muted-foreground ml-0.5">{m.unit}</span>}
                      <Pencil className="w-3 h-3 text-muted-foreground/40 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}

                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditMetric(m)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Өзгерту"
                    >
                      <Pencil className="w-3 h-3 text-foreground/70" />
                    </button>
                    <button
                      onClick={() => setDeletingMetricId(m.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                      title="Жою"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}

            <button
              onClick={openAddMetric}
              className="h-full min-h-[100px] rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="w-6 h-6" />
              <span className="text-xs font-medium">Қосу</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Metric Dialog */}
      <Dialog open={showMetricDialog} onOpenChange={setShowMetricDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMetric ? "Метриканы өзгерту" : "Жаңа метрика қосу"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Атауы *</label>
              <Input
                placeholder="мыс: Оқу сағаты, Дене жаттығуы..."
                value={metricForm.name}
                onChange={(e) => setMetricForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">Мән</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={metricForm.value}
                  onChange={(e) => setMetricForm((f) => ({ ...f, value: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">Өлшем</label>
                <Input
                  placeholder="сағ, км, рет..."
                  value={metricForm.unit}
                  onChange={(e) => setMetricForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Карточка түсі</label>
              <div className="flex gap-2">
                {METRIC_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setMetricForm((f) => ({ ...f, color: c }))}
                    style={{ backgroundColor: METRIC_COLOR_HEX[c] }}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      metricForm.color === c
                        ? "ring-2 ring-offset-2 ring-foreground scale-110"
                        : "hover:scale-105"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="pt-2">
              <label className="text-sm text-muted-foreground mb-2 block">Алдын ала қарау</label>
              <div className="rounded-xl border bg-card p-4 inline-block min-w-[140px]">
                <div className={`w-8 h-1 rounded-full ${metricForm.color} mb-2`} />
                <p className="text-xs text-muted-foreground truncate">
                  {metricForm.name || "Метрика атауы"}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {metricForm.value || "0"}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {metricForm.unit}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMetricDialog(false)}>
              Бас тарту
            </Button>
            <Button onClick={handleSaveMetric} disabled={!metricForm.name.trim() || savingMetric}>
              {savingMetric ? "Сақталуда..." : editingMetric ? "Жаңарту" : "Қосу"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deletingMetricId} onOpenChange={(open) => !open && setDeletingMetricId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Метриканы жою</AlertDialogTitle>
            <AlertDialogDescription>
              Бұл метриканы жойғыңыз келетінін растайсыз ба? Бұл әрекетті қайтару мүмкін емес.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Бас тарту</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMetric}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Жою
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Motivational Modal */}
      <MotivationalModal
        open={showModal}
        onOpenChange={setShowModal}
        message={motivationalMessage}
        imageUrl={motivationalImage}
        isLoading={isLoadingMessage}
        mood={selectedMood}
      />
    </div>
  );
}
