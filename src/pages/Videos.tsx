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
    title: "Как учиться в 10 раз быстрее и запоминать навсегда",
    url: "https://youtu.be/7_6U83nbN9g?si=KJtJUYj4iKKh51bh",
    description: "Видео про ускоренное обучение и лучшее запоминание информации.",
  },
  {
    id: "2",
    title: "A to Z Diary: Why You Need It and How to Keep It",
    url: "https://youtu.be/vvRDe8CdeUA?si=fGxODw5RfdVyDiRY",
    description: "Видео о том, зачем нужен ежедневник и как его правильно вести.",
  },
  {
    id: "3",
    title: "Car Camping Buried by an Extreme Blizzard",
    url: "https://youtu.be/o_L4algQxfg?si=ViiPDJaCfaRSNP8K",
    description: "Атмосферное видео про выезд и ночёвку в машине во время сильной метели.",
  },
  {
    id: "4",
    title: "Winter Storm Ambience with Icy Howling Wind Sounds",
    url: "https://youtu.be/sGkh1W5cbH4?si=CDbwA_MkjeUdkBFn",
    description: "Фоновое видео со звуками зимней бури для сна, отдыха и учёбы.",
  },
  {
    id: "5",
    title: "Powerful Thunderstorm Is Heading Your Way | Your Childhood Village | Calm Before the Storm | 3 HOURS",
    url: "https://youtu.be/Z5_-59tIG-8?si=NcuPgHnZy07mkveV",
    description: "Долгое атмосферное видео с грозой и спокойной деревенской обстановкой перед бурей.",
  },
  {
    id: "6",
    title: "Учись как одержимый — как понять любую тему за 7 дней",
    url: "https://youtu.be/26cyjMsjQ0E?si=efenaJntO6Cgaobk",
    description: "Видео о подходе к быстрому погружению в тему и интенсивному обучению.",
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
