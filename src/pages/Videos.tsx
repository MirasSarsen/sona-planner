import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface Video {
  id: string;
  title: string;
  url: string;
  description: string;
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/
  );
  return match ? match[1] : null;
}

const staticVideos: Video[] = [
  {
    id: "1",
    title: "Первое видео",
    url: "https://www.youtube.com/watch?v=XXXXXXXXXXX",
    description: "Описание первого видео",
  },
  {
    id: "2",
    title: "Второе видео",
    url: "https://www.youtube.com/watch?v=YYYYYYYYYYY",
    description: "Описание второго видео",
  },
];

export default function Videos() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Бейнелер</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staticVideos.map((video) => {
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
                <h3 className="font-semibold text-foreground">{video.title}</h3>
                {video.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {video.description}
                  </p>
                )}
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-2 inline-block"
                >
                  YouTube-де ашу ↗
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
