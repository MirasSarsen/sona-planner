import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  TrendingUp,
  Pause,
  Square,
  Play,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type DbPriority = "low" | "medium" | "high";
type DbStatus = "todo" | "in_progress" | "done";

interface Task {
  id: string;
  title: string;
  deadline: string | null;
  priority: DbPriority;
  status: DbStatus;
  is_completed: boolean;
  created_at?: string;
  completed_at?: string | null;
  user_id?: string;
}

interface TaskForm {
  title: string;
  deadline: string;
  priority: DbPriority;
  status: DbStatus;
}

const emptyTask: TaskForm = {
  title: "",
  deadline: "",
  priority: "medium",
  status: "todo",
};

const priorityLabel: Record<DbPriority, string> = {
  high: "Жоғары",
  medium: "Орташа",
  low: "Төмен",
};

const statusLabel: Record<DbStatus, string> = {
  todo: "Жасау керек",
  in_progress: "Орындалуда",
  done: "Аяқталды",
};

const priorityColors: Record<DbPriority, string> = {
  high: "bg-red-500 text-white hover:bg-red-600",
  medium: "bg-orange-400 text-white hover:bg-orange-500",
  low: "bg-emerald-500 text-white hover:bg-emerald-600",
};

const statusColors: Record<DbStatus, string> = {
  todo: "bg-muted text-foreground hover:bg-muted/80",
  in_progress: "bg-orange-400 text-white hover:bg-orange-500",
  done: "bg-emerald-500 text-white hover:bg-emerald-600",
};

const dayNames = ["Дс", "Сс", "Ср", "Бс", "Жм", "Сн", "Жс"];

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
    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(sec).padStart(2, "0")}`;
  };

  return {
    time: fmt(seconds),
    running,
    play: () => setRunning(true),
    pause: () => setRunning(false),
    stop: () => {
      setRunning(false);
      setSeconds(0);
    },
  };
}

export default function Index() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyTask);
  const [loading, setLoading] = useState(true);

  const timer = useTimer();

  const fetchTasks = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Қате",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setTasks((data || []) as Task[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const completed = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const todo = tasks.filter((t) => t.status === "todo").length;

  const openAdd = () => {
    setEditingTask(null);
    setForm(emptyTask);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      deadline: task.deadline ? task.deadline.slice(0, 16) : "",
      priority: task.priority,
      status: task.status,
    });
    setModalOpen(true);
  };

  const deleteTask = async (id: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Қате",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Тапсырма өшірілді" });
  };

  const saveTask = async () => {
    if (!form.title.trim()) {
      toast({
        title: "Қате",
        description: "Тапсырма атауын енгізіңіз",
        variant: "destructive",
      });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Қате",
        description: "Алдымен кіріңіз",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      title: form.title.trim(),
      deadline: form.deadline || null,
      priority: form.priority,
      status: form.status,
      is_completed: form.status === "done",
      completed_at: form.status === "done" ? new Date().toISOString() : null,
      user_id: user.id,
    };

    if (editingTask) {
      const { error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", editingTask.id)
        .eq("user_id", user.id);

      if (error) {
        toast({
          title: "Қате",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Тапсырма жаңартылды" });
    } else {
      const { error } = await supabase.from("tasks").insert(payload);

      if (error) {
        toast({
          title: "Қате",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Тапсырма қосылды" });
    }

    setModalOpen(false);
    setEditingTask(null);
    setForm(emptyTask);
    fetchTasks();
  };

  const getWeeklyData = useCallback(() => {
    const now = new Date();
    const jsDay = now.getDay();
    const diffToMonday = jsDay === 0 ? 6 : jsDay - 1;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    return dayNames.map((name, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);

      const dayStr = day.toISOString().split("T")[0];

      const count = tasks.filter((t) =>
        t.deadline ? t.deadline.startsWith(dayStr) : false
      ).length;

      return { name, count };
    });
  }, [tasks]);

  const formatDeadline = (d: string | null) => {
    if (!d) return "—";
    const dt = new Date(d);

    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(dt.getDate()).padStart(2, "0")}, ${String(
      dt.getHours()
    ).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  };

  const getDynamicRecommendations = () => {
    const items: string[] = [];

    const highPriorityTodo = tasks.filter(
      (t) => t.priority === "high" && t.status !== "done"
    ).length;

    const overdue = tasks.filter((t) => {
      if (!t.deadline || t.status === "done") return false;
      return new Date(t.deadline) < new Date();
    }).length;

    if (highPriorityTodo > 0) {
      items.push(
        `Сізде ${highPriorityTodo} жоғары басымдықтағы аяқталмаған тапсырма бар.`
      );
    }

    if (overdue > 0) {
      items.push(`Мерзімі өтіп кеткен ${overdue} тапсырма бар — алдымен соларды жабыңыз.`);
    }

    if (inProgress > 3) {
      items.push("Орындалудағы тапсырмалар көп. Жаңасын қоспай, барларын аяқтауға назар аударыңыз.");
    }

    if (tasks.length === 0) {
      items.push("Әзірге тапсырмалар жоқ. Бірінші тапсырманы қосып, жұмысты бастаңыз.");
    }

    if (items.length === 0) {
      items.push("Жұмыс қарқыны жақсы. Осы темпті сақтаңыз.");
    }

    return items;
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-6 text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-primary text-primary-foreground border-0 shadow-md">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium opacity-90">Барлық тапсырма</p>
              <TrendingUp className="h-4 w-4 opacity-70" />
            </div>
            <p className="text-4xl font-bold mt-2">{tasks.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-md">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-muted-foreground">Аяқталған</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-4xl font-bold mt-2 text-foreground">{completed}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-md">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-muted-foreground">Орындалуда</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-4xl font-bold mt-2 text-foreground">{inProgress}</p>
          </CardContent>
        </Card>

        <Card
          className="border-0 shadow-md overflow-hidden relative"
          style={{
            background:
              "linear-gradient(135deg, hsl(220 70% 35%), hsl(200 80% 40%))",
          }}
        >
          <CardContent className="p-5 relative z-10">
            <p className="text-sm font-medium text-white/80">Таймер</p>
            <p className="text-3xl md:text-4xl font-mono font-bold text-white mt-2 tracking-wider">
              {timer.time}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={timer.pause}
                className="h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <Pause className="h-4 w-4" />
              </button>
              <button
                onClick={timer.stop}
                className="h-9 w-9 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
              >
                <Square className="h-4 w-4" />
              </button>
              <button
                onClick={timer.play}
                className="h-9 w-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <Play className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

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

              {loading ? (
                <p className="text-muted-foreground">Жүктелуде...</p>
              ) : (
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
                      {tasks.map((t) => (
                        <tr
                          key={t.id}
                          className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                        >
                          <td className="py-3 px-2 font-medium text-foreground">{t.title}</td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {formatDeadline(t.deadline)}
                          </td>
                          <td className="py-3 px-2">
                            <Badge className={`${priorityColors[t.priority]} text-xs`}>
                              {priorityLabel[t.priority]}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <Badge className={`${statusColors[t.status]} text-xs`}>
                              {statusLabel[t.status]}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(t)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteTask(t.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {tasks.length === 0 && !loading && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            Тапсырмалар жоқ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly">
          <Card className="bg-card border shadow-sm">
            <CardContent className="p-5">
              <h3 className="text-base font-medium mb-4 text-foreground">
                Апталық оқу жүктемесі
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getWeeklyData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-card border shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold mb-3 text-foreground">
            Автоматты ұсыныстар
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            {getDynamicRecommendations().map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <div className="mt-4 text-sm text-muted-foreground">
            Жасау керек: <span className="font-medium text-foreground">{todo}</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Тапсырманы өңдеу" : "Жаңа тапсырма қосу"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Тапсырма атауы</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Тапсырма атауы..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Дедлайн</Label>
              <Input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Басымдық</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm({ ...form, priority: v as DbPriority })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Жоғары</SelectItem>
                  <SelectItem value="medium">Орташа</SelectItem>
                  <SelectItem value="low">Төмен</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Күй</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as DbStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Жасау керек</SelectItem>
                  <SelectItem value="in_progress">Орындалуда</SelectItem>
                  <SelectItem value="done">Аяқталды</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Болдырмау
            </Button>
            <Button onClick={saveTask}>Сақтау</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
