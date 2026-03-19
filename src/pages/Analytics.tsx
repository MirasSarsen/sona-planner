import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase";

const moodEmojis = ["😢", "😟", "😐", "🙂", "😄"];
const moodLabels = ["Өте жаман", "Жаман", "Орташа", "Жақсы", "Өте жақсы"];
const dayNames = ["Дс", "Сс", "Ср", "Бс", "Жм", "Сн", "Жс"];
const monthNames = ["Қаңтар","Ақпан","Наурыз","Сәуір","Мамыр","Маусым","Шілде","Тамыз","Қыркүйек","Қазан","Қараша","Желтоқсан"];

const moodColorClass = (mood: number) => {
  if (mood >= 4) return "bg-emerald-400";
  if (mood === 3) return "bg-yellow-400";
  return "bg-red-400";
};

export default function Analytics() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [moods, setMoods] = useState<any[]>([]);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [savedMood, setSavedMood] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  const calendarDays: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Загрузка данных
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*");

      const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
      const { data: moodsData } = await supabase
        .from("moods")
        .select("*")
        .gte("created_at", firstDay)
        .lte("created_at", lastDay);

      setTasks(tasksData || []);
      setMoods(moodsData || []);

      // Проверяем сохранено ли настроение сегодня
      const today = now.toISOString().split("T")[0];
      const todayMood = (moodsData || []).find((m: any) => m.created_at === today);
      if (todayMood) setSavedMood(todayMood.mood_score);

      setLoading(false);
    };
    load();
  }, []);

  // Сохранение настроения
  const saveMood = async () => {
    if (!selectedMood) return;
    const today = now.toISOString().split("T")[0];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("moods").upsert({
      user_id: user.id,
      mood_score: selectedMood,
      created_at: today,
    }, { onConflict: "user_id,created_at" });

    setSavedMood(selectedMood);
    // Обновляем список настроений
    setMoods((prev) => {
      const filtered = prev.filter((m) => m.created_at !== today);
      return [...filtered, { mood_score: selectedMood, created_at: today }];
    });
  };

  // Календарь настроений: { день -> оценка }
  const moodCalendar: Record<number, number> = {};
  moods.forEach((m) => {
    const day = new Date(m.created_at).getDate();
    moodCalendar[day] = m.mood_score;
  });

  // Апталық жүктеме — задачи по дням недели по дедлайну
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weeklyData = dayNames.map((name, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    const dayStr = day.toISOString().split("T")[0];
    const count = tasks.filter((t) => t.deadline?.startsWith(dayStr)).length;
    return { name, count };
  });

  // Айлық орындалу — нарастающий итог выполненных задач по дням
  const completedTasks = tasks.filter((t) => t.status === "done" && t.completed_at);
  const monthlyData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const done = completedTasks.filter((t) => t.completed_at?.startsWith(dayStr)).length;
    return { day, done };
  });
  // Нарастающий итог
  let cumulative = 0;
  const monthlyDataCumulative = monthlyData.map((d) => {
    cumulative += d.done;
    return { day: d.day, done: cumulative };
  });

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Жалпы жағдай — средний mood за месяц, переведённый в проценты
  const avgMood = moods.length > 0
    ? moods.reduce((sum, m) => sum + m.mood_score, 0) / moods.length
    : 0;
  const overallPct = Math.round((avgMood / 5) * 100);
  const overallLabel = overallPct >= 80 ? "Жоғары" : overallPct >= 50 ? "Орташа" : "Төмен";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Жүктелуде...
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-6 text-foreground">АНАЛИТИКА</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Mood Tracker */}
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Күнделікті көңіл-күй</h3>
            <div className="flex justify-center gap-4 mb-4">
              {moodEmojis.map((emoji, i) => (
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
                  <span className="text-xs text-muted-foreground">{moodLabels[i]}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-center">
              <Button onClick={saveMood} disabled={!selectedMood}>Сақтау</Button>
            </div>
            {savedMood && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                Бүгінгі көңіл-күй: {moodEmojis[savedMood - 1]} {moodLabels[savedMood - 1]}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Mood Calendar */}
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Көңіл-күй күнтізбесі — {monthNames[month]} {year}
            </h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-muted-foreground font-medium">
              {dayNames.map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium ${
                    day
                      ? moodCalendar[day]
                        ? `${moodColorClass(moodCalendar[day])} text-white`
                        : "bg-muted/50 text-muted-foreground"
                      : ""
                  }`}
                >
                  {day || ""}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400" /> Жақсы (4-5)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400" /> Орташа (3)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> Нашар (1-2)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Жалпы жағдай */}
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5 flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-4 text-foreground self-start">Жалпы жағдай</h3>
            {moods.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Әзірге көңіл-күй жоқ
              </p>
            ) : (
              <>
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="hsl(var(--primary))" strokeWidth="10"
                      strokeDasharray={`${overallPct * 2.51} ${100 * 2.51}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-foreground">{overallPct}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">Жалпы жағдай: {overallPct}%</p>
                <p className="text-sm text-primary font-medium">Оқуға дайындық: {overallLabel}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Апталық жүктеме */}
        <Card className="bg-card border shadow-sm lg:col-span-2">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Тапсырмалар жүктемесі — апталық</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Айлық тренд */}
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold mb-1 text-foreground">Орындалған тапсырмалар — айлық</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Орындалды: {doneTasks} / {totalTasks} ({completionPct}%)
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyDataCumulative}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="done" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Орындалу пайызы */}
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Орындалу пайызы</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
              <span className="text-4xl font-bold text-foreground">{completionPct}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {totalTasks} тапсырманың {doneTasks}-і орындалды
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
