import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  url: string;
  description: string;
  created_at: string;
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/
  );
  return match ? match[1] : null;
}

export default function Videos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", description: "" });
  const [loading, setLoading] = useState(true);

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching videos:", error);
      return;
    }
    setVideos((data || []) as Video[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const addVideo = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Қате", description: "Алдымен кіріңіз", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("videos").insert({
      title: form.title,
      url: form.url,
      description: form.description,
      user_id: user.id,
    });

    if (error) {
      toast({ title: "Қате", description: error.message, variant: "destructive" });
      return;
    }
    setForm({ title: "", url: "", description: "" });
    setModalOpen(false);
    fetchVideos();
  };

  const deleteVideo = async (id: string) => {
    await supabase.from("videos").delete().eq("id", id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Бейнелер</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Бейне қосу
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Жүктелуде...</p>
      ) : videos.length === 0 ? (
        <Card className="bg-card border shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="text-lg mb-2">Бейнелер жоқ</p>
            <p className="text-sm">YouTube сілтемелерін қосу үшін "Бейне қосу" батырмасын басыңыз</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => {
            const ytId = extractYoutubeId(video.url);
            return (
              <Card key={video.id} className="bg-card border shadow-sm overflow-hidden">
                {ytId ? (
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title={video.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <ExternalLink className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{video.title}</h3>
                      {video.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {video.description}
                        </p>
                      )}
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                      >
                        YouTube-де ашу ↗
                      </a>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive shrink-0"
                      onClick={() => deleteVideo(video.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Бейне қосу</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Атауы</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Бейне атауы..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>YouTube сілтемесі</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Болдырмау</Button>
            <Button onClick={addVideo}>Қосу</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
