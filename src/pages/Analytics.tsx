import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useUserData } from "@/hooks/useUserData";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

type TaskStatus = "todo" | "in_progress" | "done";

type Task = {
  id: string;
  user_id: string;
  title: string;
  deadline: string | null;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  created_at: string | null;
  completed_at?: string | null;
};

type MoodEntry = {
  id: string;
  user_id: string;
  date: string;
  mood: number;
  created_at?: string | null;
};

type CustomMetric = {
  id: string;
  user_id: string;
  name: string;
  value: number;
  unit: string | null;
  color: string | null;
  created_at?: string | null;
};

const WEEK_LABELS = ["Дс", "Сс", "Ср", "Бс", "Жм", "Сн", "Жс"];
const MONTH_NAMES = [
  "Қаңтар",
  "Ақпан",
  "Наурыз",
  "Сәуір",
  "Мамыр",
  "Маусым",
  "Шілде",
  "Тамыз",
  "Қыркүйек",
  "Қазан",
  "Қараша",
  "Желтоқсан",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getMoodColor(mood: number | null) {
  if (!mood) return "bg-muted text-muted-foreground";
  if (mood >= 4) return "bg-emerald-400 text-white";
  if (mood === 3) return "bg-yellow-400 text-black";
  return "bg-red-400 text-white";
}

function getMoodText(mood: number | null) {
  if (!mood) return "Таңдалмаған";
  if (mood === 1) return "Өте жаман";
  if (mood === 2) return "Жаман";
  if (mood === 3) return "Орташа";
  if (mood === 4) return "Жақсы";
  return "Өте жақсы";
}

export default function Analytics() {
  const {
    userId,
    tasks,
    moods,
    metrics,
    loading,
    refetch,
  } = useUserData() as {
    userId: string | null;
    tasks: Task[];
    moods: MoodEntry[];
    metrics: CustomMetric[];
    loading: boolean;
    refetch: () => Promise<void>;
  };

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [savingMood, setSavingMood] = useState(false);

  const [metricModalOpen, setMetricModalOpen] = useState(false);
  const [metricName, setMetricName] = useState("");
  const [metricValue, setMetricValue] = useState("");
  const [metricUnit, setMetricUnit] = useState("");
  const [metricColor, setMetricColor] = useState("#22c55e");
  const [savingMetric, setSavingMetric] = useState(false);

  const todayStr = getTodayString();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  useEffect(() => {
    const todayMood = moods.find((m) => m.date.split("T")[0] === todayStr);
    if (todayMood) {
      setSelectedMood(todayMood.mood);
    } else {
      setSelectedMood(null);
    }
  }, [moods, todayStr]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const completionRate = total ? Math.round((done / total) * 100) : 0;

    return { total, done, inProgress, todo, completionRate };
  }, [tasks]);

  const weeklyData = useMemo(() => {
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(now.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    return WEEK_LABELS.map((name, i) => {
      const current = new Date(startOfWeek);
      current.setDate(startOfWeek.getDate() + i);
      const dayStr = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;

      return {
        name,
        count: tasks.filter((t) => t.deadline?.startsWith(dayStr)).length,
      };
    });
  }, [tasks, now]);

  const monthlyData = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const prefix = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;

      return {
        day,
        done: tasks.filter(
          (t) => t.status === "done" && t.completed_at?.startsWith(prefix)
        ).length,
      };
    });
  }, [tasks, currentMonth, currentYear]);

  const moodMap = useMemo(() => {
    const map: Record<string, number> = {};
    moods.forEach((m) => {
      map[m.date.split("T")[0]] = m.mood;
    });
    return map;
  }, [moods]);

  const currentMonthCalendar = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let startWeekday = firstDay.getDay();
    if (startWeekday === 0) startWeekday = 7;

    const blanks = Array.from({ length: startWeekday - 1 }, (_, i) => ({
      type: "blank" as const,
      key: `blank-${i}`,
    }));

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
      return {
        type: "day" as const,
        key: dateStr,
        day,
        dateStr,
        mood: moodMap[dateStr] ?? null,
        isToday: dateStr === todayStr,
      };
    });

    return [...blanks, ...days];
  }, [currentMonth, currentYear, moodMap, todayStr]);

  const averageMood = useMemo(() => {
    if (!moods.length) return 0;
    const sum = moods.reduce((acc, m) => acc + m.mood, 0);
    return Number((sum / moods.length).toFixed(1));
  }, [moods]);

  const handleSaveMood = async () => {
    if (!selectedMood || !userId) return;

    setSavingMood(true);

    try {
      const { error } = await supabase
        .from("mood_entries")
        .upsert(
          {
            user_id: userId,
            date: todayStr,
            mood: selectedMood,
          },
          { onConflict: "user_id,date" }
        );

      if (error) throw error;

      toast({
        title: "Сақталды",
        description: "Бүгінгі көңіл-күйіңіз сақталды",
      });

      await refetch();
    } catch (err: any) {
      toast({
        title: "Қате",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingMood(false);
    }
  };

  const handleAddMetric = async () => {
    if (!userId) return;

    if (!metricName.trim()) {
      toast({
        title: "Қате",
        description: "Метрика атауын енгізіңіз",
        variant: "destructive",
      });
      return;
    }

    if (metricValue === "" || Number.isNaN(Number(metricValue))) {
      toast({
        title: "Қате",
        description: "Метрика мәнін дұрыс енгізіңіз",
        variant: "destructive",
      });
      return;
    }

    setSavingMetric(true);

    try {
      const { error } = await supabase.from("custom_metrics").insert({
        user_id: userId,
        name: metricName.trim(),
        value: Number(metricValue),
        unit: metricUnit.trim() || null,
        color: metricColor || null,
      });

      if (error) throw error;

      toast({ title: "Метрика қосылды" });

      setMetricName("");
      setMetricValue("");
      setMetricUnit("");
      setMetricColor("#22c55e");
      setMetricModalOpen(false);

      await refetch();
    } catch (err: any) {
      toast({
        title: "Қате",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSavingMetric(false);
    }
  };

  const handleDeleteMetric = async (id: string) => {
    const { error } = await supabase.from("custom_metrics").delete().eq("id", id);

    if (error) {
      toast({
        title: "Қате",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Метрика өшірілді" });
    await refetch();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-foreground">Аналитика</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary text-primary-foreground border-0 shadow-md">
          <CardContent className="p-5">
            <p className="text-sm opacity-90">Барлық тапсырма</p>
            <p className="text-4xl font-bold mt-2">{taskStats.total}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-md">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Аяқталған</p>
            <p className="text-4xl font-bold mt-2">{taskStats.done}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-md">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Орындалуда</p>
            <p className="text-4xl font-bold mt-2">{taskStats.inProgress}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-md">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Орындау пайызы</p>
            <p className="text-4xl font-bold mt-2">{taskStats.completionRate}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5">
            <h2 className="text-xl font-semibold mb-4">Көңіл-күй күнтізбесі</h2>

            <div className="grid grid-cols-7 gap-2 text-center text-sm mb-3 text-muted-foreground">
              <div>Дс</div>
              <div>Сс</div>
              <div>Ср</div>
              <div>Бс</div>
              <div>Жм</div>
              <div>Сн</div>
              <div>Жс</div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {currentMonthCalendar.map((item) =>
                item.type === "blank" ? (
                  <div key={item.key} className="aspect-square rounded-md bg-transparent" />
                ) : (
                  <div
                    key={item.key}
                    className={`aspect-square rounded-md flex items-center justify-center text-sm border ${
                      item.isToday ? "ring-2 ring-primary" : ""
                    } ${getMoodColor(item.mood)}`}
                  >
                    {item.day}
                  </div>
                )
              )}
            </div>

            <div className="flex gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                <span>Жақсы (4-5)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
                <span>Орташа (3)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                <span>Нашар (1-2)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5">
            <h2 className="text-xl font-semibold mb-4">Бүгінгі көңіл-күй</h2>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((mood) => (
                <Button
                  key={mood}
                  type="button"
                  variant={selectedMood === mood ? "default" : "outline"}
                  onClick={() => setSelectedMood(mood)}
                >
                  {mood}
                </Button>
              ))}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Таңдалған күй:{" "}
              <span className="font-medium text-foreground">
                {getMoodText(selectedMood)}
              </span>
            </p>

            <Button onClick={handleSaveMood} disabled={!selectedMood || savingMood}>
              {savingMood ? "Сақталуда..." : "Көңіл-күйді сақтау"}
            </Button>

            <div className="mt-6">
              <p className="text-sm text-muted-foreground">Орташа көңіл-күй</p>
              <p className="text-3xl font-bold mt-1">
                {averageMood ? `${averageMood}/5` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5">
            <h2 className="text-xl font-semibold mb-4">Тапсырмалар — апталық жүктеме</h2>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5">
            <h2 className="text-xl font-semibold">Орындалған тапсырмалар — айлық</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Орындалды: {taskStats.done} / {taskStats.total} ({taskStats.completionRate}%)
            </p>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="done"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Өз метрикаларым
            </h2>

            <Button onClick={() => setMetricModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Метрика қосу
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Жүктелуде...</p>
          ) : metrics.length === 0 ? (
            <div className="border rounded-xl p-10 text-center text-muted-foreground">
              <TrendingUp className="w-10 h-10 mx-auto mb-4 opacity-40" />
              <p>Сіздің өз метрикаларыңыз жоқ.</p>
              <p className="text-sm mt-1">
                «Метрика қосу» батырмасын басып, бірінші метриканы жасаңыз.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {metrics.map((metric) => (
                <Card key={metric.id} className="border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">{metric.name}</p>
                        <p
                          className="text-3xl font-bold mt-2"
                          style={{ color: metric.color || undefined }}
                        >
                          {metric.value}
                          {metric.unit ? ` ${metric.unit}` : ""}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMetric(metric.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={metricModalOpen} onOpenChange={setMetricModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Метрика қосу</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Атауы</Label>
              <Input
                value={metricName}
                onChange={(e) => setMetricName(e.target.value)}
                placeholder="Мысалы: Оқу сағаты"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Мәні</Label>
              <Input
                type="number"
                value={metricValue}
                onChange={(e) => setMetricValue(e.target.value)}
                placeholder="12"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Өлшем бірлігі</Label>
              <Input
                value={metricUnit}
                onChange={(e) => setMetricUnit(e.target.value)}
                placeholder="сағ, %, бет"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Түсі</Label>
              <Input
                type="color"
                value={metricColor}
                onChange={(e) => setMetricColor(e.target.value)}
                className="h-11 p-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMetricModalOpen(false)}>
              Болдырмау
            </Button>
            <Button onClick={handleAddMetric} disabled={savingMetric}>
              {savingMetric ? "Сақталуда..." : "Қосу"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
