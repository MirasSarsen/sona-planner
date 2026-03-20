import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import MotivationalModal from "@/components/MotivationalModal";

// Mood data
const moodEmojis = ["😢", "😟", "😐", "🙂", "😄"];
const moodLabels = ["Өте жаман", "Жаман", "Орташа", "Жақсы", "Өте жақсы"];

// Weekly bar chart data
const weeklyData = [
  { name: "Дүс", count: 4 },
  { name: "Сей", count: 6 },
  { name: "Сәр", count: 3 },
  { name: "Бей", count: 5 },
  { name: "Жұм", count: 7 },
  { name: "Сен", count: 2 },
  { name: "Жек", count: 1 },
];

// Monthly line chart data
const monthlyData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  done: Math.min(15, Math.floor(Math.random() * 3 + (i / 2))),
}));

// Generate mock mood calendar for current month
function generateMoodCalendar(): Record<number, number> {
  const moods: Record<number, number> = {};
  const today = new Date().getDate();
  for (let d = 1; d <= today; d++) {
    moods[d] = Math.floor(Math.random() * 5) + 1;
  }
  return moods;
}

const moodColorClass = (mood: number) => {
  if (mood >= 4) return "bg-emerald-400";
  if (mood === 3) return "bg-yellow-400";
  if (mood >= 1) return "bg-red-400";
  return "bg-muted";
};

export default function Analytics() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [savedMood, setSavedMood] = useState<number | null>(null);
  const [moodCalendar] = useState(generateMoodCalendar);
  const [motivationalMessage, setMotivationalMessage] = useState<string | null>(null);
  const [motivationalImage, setMotivationalImage] = useState<string | null>(null);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Monday=0

  const calendarDays: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthNames = [
    "Қаңтар", "Ақпан", "Наурыз", "Сәуір", "Мамыр", "Маусым",
    "Шілде", "Тамыз", "Қыркүйек", "Қазан", "Қараша", "Желтоқсан",
  ];

  const fetchRandomMotivationImage = async () => {
    try {
      const { data: files, error } = await supabase.storage
        .from("content")
        .list("motivation", { limit: 100 });

      if (error || !files || files.length === 0) {
        console.log("No motivation images found:", error);
        return null;
      }

      // Filter only image files
      const imageFiles = files.filter((f) =>
        /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name)
      );
      if (imageFiles.length === 0) return null;

      const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
      const { data: urlData } = supabase.storage
        .from("content")
        .getPublicUrl(`motivation/${randomFile.name}`);

      return urlData?.publicUrl || null;
    } catch {
      return null;
    }
  };

  const handleSaveMood = async () => {
    if (!selectedMood) return;
    setSavedMood(selectedMood);
    setMotivationalMessage(null);
    setMotivationalImage(null);
    setIsLoadingMessage(true);
    setShowModal(true);

    // Fetch image and AI message in parallel
    const [imageUrl] = await Promise.all([
      fetchRandomMotivationImage(),
    ]);
    setMotivationalImage(imageUrl);

    try {
      const { data, error } = await supabase.functions.invoke("motivational-message", {
        body: { mood: selectedMood },
      });

      if (error) {
        console.error("Edge function error:", error);
        toast({
          title: "Қате",
          description: "Мотивациялық хабарламаны алу мүмкін болмады.",
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        toast({
          title: "Қате",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setMotivationalMessage(data.message);
    } catch (err) {
      console.error("Error fetching motivational message:", err);
      toast({
        title: "Қате",
        description: "Серверге қосылу мүмкін болмады.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMessage(false);
    }
  };

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
              <Button
                onClick={handleSaveMood}
                disabled={!selectedMood || isLoadingMessage}
              >
                {isLoadingMessage ? "Жүктелуде..." : "Сақтау"}
              </Button>
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
              {["Дс", "Сс", "Ср", "Бс", "Жм", "Сн", "Жс"].map((d) => (
                <div key={d}>{d}</div>
              ))}
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
        {/* Overall Condition - Donut */}
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5 flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-4 text-foreground self-start">Жалпы жағдай</h3>
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="10"
                  strokeDasharray={`${85 * 2.51} ${100 * 2.51}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-foreground">85%</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">Жалпы жағдай: 85%</p>
            <p className="text-sm text-primary font-medium">Оқуға дайындық: Жоғары</p>
          </CardContent>
        </Card>

        {/* Weekly Task Load */}
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
        {/* Monthly Completion Trend */}
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold mb-1 text-foreground">Орындалған тапсырмалар — айлық</h3>
            <p className="text-sm text-muted-foreground mb-4">Орындалды: 15 / 30 (50%)</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
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

        {/* Completion Percentage */}
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Орындалу пайызы</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: "50%" }} />
                </div>
              </div>
              <span className="text-4xl font-bold text-foreground">50%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">30 тапсырманың 15-і орындалды</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
