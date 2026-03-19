import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, Pause, Square, Play, Plus, Pencil, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabase";

interface Task {
  id: string;
  title: string;
  deadline: string | null;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500 text-white hover:bg-red-600",
  medium: "bg-orange-400 text-white hover:bg-orange-500",
  low: "bg-emerald-500 text-white hover:bg-emerald-600",
};

const priorityLabels: Record<string, string> = {
  high: "Жоғары",
  medium: "Орташа",
  low: "Төмен",
};

const statusColors: Record<string, string> = {
  todo: "bg-muted text-foreground hover:bg-muted/80",
  in_progress: "bg-orange-400 text-white hover:bg-orange-500",
  done: "bg-emerald-500 text-white hover:bg-emerald-600",
};

const statusLabels: Record<string, string> = {
  todo: "Жасау керек",
  in_progress: "Орындалуда",
  done: "Аяқталды",
};

const dayNames = ["Дс", "Сс", "Ср", "Бс", "Жм", "Сн", "Жс"];

const emptyForm = { title: "", deadline: "", priority: "medium" as Task["priority"], status: "todo" as Task["status"] };

function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return {
    time: fmt(seconds),
    running,
    play: () => setRunning(true),
    pause: () => setRunning(false),
    stop: () => { setRunning(false); setSeconds(0); },
  };
}

export default function Index() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm);
  const timer = useTimer();

  // Загрузка задач из Supabase
  const loadTasks = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const completed = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;

  const openAdd = () => { setEditingTask(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (t: Task) => {
    setEditingTask(t);
    setForm({ title: t.title, deadline: t.deadline ?? "", priority: t.priority, status: t.status });
    setModalOpen(true);
  };

    const saveTask = async () => {
    if (!form.title) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingTask) {
      await supabase.from("tasks").update({
        title: form.title,
        deadline: form.deadline || null,
        priority: form.priority,
        status: form.status,
      }).eq("id", editingTask.id);
    } else {
      await supabase.from("tasks").insert({
        user_id: user.id,   
        title: form.title,
        deadline: form.deadline || null,
        priority: form.priority,
        status: form.status,
      });
    }
    setModalOpen(false);
    loadTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((ts) => ts.filter((t) => t.id !== id));
  };

  const getWeeklyData = useCallback(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    return dayNames.map((name, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const dayStr = day.toISOString().split("T")[0];
      const count = tasks.filter((t) => t.deadline?.startsWith(dayStr)).length;
      return { name, count };
    });
  }, [tasks]);

  const formatDeadline = (d: string | null) => {
    if (!d) return "";
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}, ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-6 text-foreground">Dashboard</h1>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-primary text-primary-foreground border-0 shadow-md">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium opacity-90">Жоба саны</p>
              <TrendingUp className="h-4 w-4 opacity-70" />
            </div>
            <p className="text-4xl font-bold mt-2">{tasks.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-md">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-muted-foreground">Аяқталған жоба</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-4xl font-bold mt-2 text-foreground">{completed}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-md">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-muted-foreground">Жұмыс барысында</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-4xl font-bold mt-2 text-foreground">{inProgress}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md overflow-hidden relative" style={{ background: "linear-gradient(135deg, hsl(220 70% 35%), hsl(200 80% 40%))" }}>
          <CardContent className="p-5 relative z-10">
            <p className="text-sm font-medium text-white/80">Таймер</p>
            <p className="text-3xl md:text-4xl font-mono font-bold text-white mt-2 tracking-wider">{timer.time}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={timer.pause} className="h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"><Pause className="h-4 w-4" /></button>
              <button onClick={timer.stop} className="h-9 w-9 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white transition-colors"><Square className="h-4 w-4" /></button>
              <button onClick={timer.play} className="h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"><Play className="h-4 w-4" /></button>
            </div>
          </CardContent>
          <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 200 200">
            <path d="M0 80 Q50 40 100 80 T200 80 V200 H0Z" fill="white" />
            <path d="M0 120 Q50 80 100 120 T200 120 V200 H0Z" fill="white" opacity="0.5" />
          </svg>
        </Card>
      </div>

      {/* Tasks Section */}
      <Tabs defaultValue="list" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Тапсырмалар</h2>
          <TabsList className="bg-muted">
            <TabsTrigger value="list">Тізім</TabsTrigger>
            <TabsTrigger value="weekly">Апталық жүктеме</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list">
          <Card className="bg-card border shadow-sm">
            <CardContent className="p-5">
              <Button variant="outline" className="mb-4" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1" /> Жаңа тапсырма қосу
              </Button>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-3 px-2 font-medium">Тапсырма атауы</th>
                      <th className="text-left py-3 px-2 font-medium">Дедлайн</th>
                      <th className="text-left py-3 px-2 font-medium">Басымдық</th>
                      <th className="text-left py-3 px-2 font-medium">Күй</th>
                      <th className="text-right py-3 px-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Жүктелуде...</td></tr>
                    )}
                    {!loading && tasks.map((t) => (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-2 font-medium text-foreground">{t.title}</td>
                        <td className="py-3 px-2 text-muted-foreground">{formatDeadline(t.deadline)}</td>
                        <td className="py-3 px-2"><Badge className={`${priorityColors[t.priority]} text-xs`}>{priorityLabels[t.priority]}</Badge></td>
                        <td className="py-3 px-2"><Badge className={`${statusColors[t.status]} text-xs`}>{statusLabels[t.status]}</Badge></td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteTask(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && tasks.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Тапсырмалар жоқ</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly">
          <Card className="bg-card border shadow-sm">
            <CardContent className="p-5">
              <h3 className="text-base font-medium mb-4 text-foreground">Апталық оқу жүктемесі</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getWeeklyData()}>
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
        </TabsContent>
      </Tabs>

      {/* Recommendations */}
      <Card className="bg-card border shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold mb-3 text-foreground">Автоматты ұсыныстар</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Басымдығы жоғары тапсырмаларға көбірек уақыт бөліңіз.</li>
            <li>Дедлайнға жақын тапсырмаларды бірінші орындаңыз.</li>
            <li>Күнделікті 25 минуттық Pomodoro сессияларын қолданып көріңіз.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Тапсырманы өңдеу" : "Жаңа тапсырма қосу"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Тапсырма атауы</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Тапсырма атауы..." />
            </div>
            <div className="space-y-1.5">
              <Label>Дедлайн</Label>
              <Input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Басымдық</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Task["priority"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Жоғары</SelectItem>
                  <SelectItem value="medium">Орташа</SelectItem>
                  <SelectItem value="low">Төмен</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Күй</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Task["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Жасау керек</SelectItem>
                  <SelectItem value="in_progress">Орындалуда</SelectItem>
                  <SelectItem value="done">Аяқталды</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Болдырмау</Button>
            <Button onClick={saveTask}>Сақтау</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
