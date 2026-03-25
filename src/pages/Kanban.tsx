import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface KanbanTask {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  assignee: string;
  position: number;
}

const columns = [
  { id: "todo" as const, title: "📋 To Do", color: "border-blue-400" },
  { id: "in_progress" as const, title: "🔄 In Progress", color: "border-yellow-400" },
  { id: "done" as const, title: "✅ Done", color: "border-emerald-400" },
];

export default function Kanban() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignee: "" });
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("kanban_tasks")
      .select("*")
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }
    setTasks((data || []) as KanbanTask[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const addTask = async () => {
    if (!form.title.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("kanban_tasks").insert({
      title: form.title,
      description: form.description,
      assignee: form.assignee,
      status: "todo",
      position: tasks.length,
      user_id: user.id,
    });

    if (error) {
      toast({ title: "Қате", description: error.message, variant: "destructive" });
      return;
    }
    setForm({ title: "", description: "", assignee: "" });
    setModalOpen(false);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from("kanban_tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as KanbanTask["status"];

    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t))
    );

    await supabase
      .from("kanban_tasks")
      .update({ status: newStatus, position: destination.index })
      .eq("id", draggableId);
  };

  const getColumnTasks = (status: string) =>
    tasks.filter((t) => t.status === status);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Канбан-доска</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Жаңа тапсырма
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Жүктелуде...</p>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map((col) => (
              <div key={col.id} className={`rounded-lg border-t-4 ${col.color} bg-muted/30 p-3`}>
                <h2 className="font-semibold text-foreground mb-3 text-sm">
                  {col.title} ({getColumnTasks(col.id).length})
                </h2>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] space-y-2 transition-colors rounded-md p-1 ${
                        snapshot.isDraggingOver ? "bg-primary/5" : ""
                      }`}
                    >
                      {getColumnTasks(col.id).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`bg-card shadow-sm ${
                                snapshot.isDragging ? "ring-2 ring-primary shadow-lg" : ""
                              }`}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start gap-2">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-0.5 text-muted-foreground cursor-grab"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-foreground truncate">
                                      {task.title}
                                    </p>
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                    {task.assignee && (
                                      <p className="text-xs text-primary mt-1">👤 {task.assignee}</p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive shrink-0"
                                    onClick={() => deleteTask(task.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Жаңа тапсырма қосу</DialogTitle>
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
              <Label>Сипаттамасы (міндетті емес)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Сипаттамасы..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Орындаушы (міндетті емес)</Label>
              <Input
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                placeholder="Аты..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Болдырмау</Button>
            <Button onClick={addTask}>Қосу</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
