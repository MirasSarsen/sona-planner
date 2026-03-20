import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface MotivationalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string | null;
  imageUrl: string | null;
  isLoading: boolean;
  mood: number | null;
}

const moodEmojis = ["😢", "😟", "😐", "🙂", "😄"];
const moodLabels = ["Өте жаман", "Жаман", "Орташа", "Жақсы", "Өте жақсы"];

export default function MotivationalModal({
  open,
  onOpenChange,
  message,
  imageUrl,
  isLoading,
  mood,
}: MotivationalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {mood ? `${moodEmojis[mood - 1]} ${moodLabels[mood - 1]}` : "Мотивация"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* Image */}
          {isLoading ? (
            <Skeleton className="w-full h-48 rounded-lg" />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt="Мотивациялық сурет"
              className="w-full max-h-64 object-contain rounded-lg"
            />
          ) : (
            <div className="w-full h-48 rounded-lg bg-muted flex items-center justify-center text-4xl">
              {mood ? moodEmojis[mood - 1] : "✨"}
            </div>
          )}

          {/* AI Message */}
          {isLoading ? (
            <div className="w-full space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : message ? (
            <div className="w-full p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium text-foreground leading-relaxed text-center">
                🤖 {message}
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
