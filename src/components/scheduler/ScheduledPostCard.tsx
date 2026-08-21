import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, MoreVertical, Play, Trash2, Edit, Image, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { utcToBrasilia } from "@/lib/timezone";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  FacebookIcon,
} from "@/components/icons/SocialIcons";

export interface ScheduledPost {
  id: string;
  videoFile: string;
  videoName: string;
  title: string;
  description: string;
  platforms: string[];
  scheduledDate: Date;
  status: "scheduled" | "publishing" | "published" | "failed";
  createdAt: Date;
  mediaUrls?: string[];
  mediaType?: "video" | "image";
  errorMessage?: string;
}

const platformIcons: Record<string, React.FC<{ className?: string }>> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  facebook: FacebookIcon,
};

const isImageUrl = (url: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  return imageExtensions.some(ext => url.toLowerCase().includes(ext));
};

interface ScheduledPostCardProps {
  post: ScheduledPost;
  onPublishNow: (id: string) => void;
  onCancel: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function ScheduledPostCard({
  post,
  onPublishNow,
  onCancel,
  onEdit,
}: ScheduledPostCardProps) {
  const statusColors = {
    scheduled: "bg-primary/20 text-primary",
    publishing: "bg-yellow-500/20 text-yellow-500",
    published: "bg-green-500/20 text-green-500",
    failed: "bg-destructive/20 text-destructive",
  };

  const statusLabels = {
    scheduled: "Agendado",
    publishing: "Publicando...",
    published: "Publicado",
    failed: "Falhou",
  };

  // Convert UTC date to Brasília for display
  const brasiliaDate = utcToBrasilia(post.scheduledDate);
  const isPast = new Date(post.scheduledDate) < new Date();
  
  // Determine media type from URL or explicit field
  const mediaIsImage = post.mediaType === "image" || isImageUrl(post.videoFile);
  const mediaCount = post.mediaUrls?.length || 1;
  const isCarousel = mediaCount > 1;

  return (
    <div className="card-elevated p-4 space-y-3">
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-secondary/50 flex-shrink-0">
          {mediaIsImage ? (
            <img
              src={post.mediaUrls?.[0] || post.videoFile}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={post.videoFile}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
          )}
          
          {/* Media type indicator */}
          <div className="absolute bottom-1 right-1 p-1 rounded bg-background/80 backdrop-blur-sm">
            {mediaIsImage ? (
              <Image className="w-3 h-3 text-foreground" />
            ) : (
              <Video className="w-3 h-3 text-foreground" />
            )}
          </div>
          
          {/* Carousel count badge */}
          {isCarousel && (
            <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-xs font-medium">
              {mediaCount}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{post.title}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {post.videoName}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={cn("text-xs", statusColors[post.status])}>
                {statusLabels[post.status]}
              </Badge>
              {post.status === "scheduled" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem onClick={() => onPublishNow(post.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Publicar agora
                    </DropdownMenuItem>
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(post.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onCancel(post.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancelar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Date and platforms */}
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(brasiliaDate, "dd MMM", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{format(brasiliaDate, "HH:mm")} (BRT)</span>
            </div>
            {isPast && post.status === "scheduled" && (
              <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500/50">
                Atrasado
              </Badge>
            )}
          </div>

          {post.status === "failed" && post.errorMessage && (
            <p className="mt-2 text-xs text-destructive break-words">
              {post.errorMessage}
            </p>
          )}
        </div>
      </div>

      {/* Platform icons */}
      <div className="flex items-center gap-2">
        {post.platforms.map((platform) => {
          const Icon = platformIcons[platform];
          return Icon ? (
            <div
              key={platform}
              className="p-1.5 rounded-lg bg-secondary/50"
              title={platform}
            >
              <Icon className="h-4 w-4" />
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}
