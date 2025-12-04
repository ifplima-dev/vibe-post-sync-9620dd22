import { Heart, MessageCircle, Eye, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  thumbnail: string;
  title: string;
  views: string;
  likes: string;
  comments: string;
  platforms: string[];
  date: string;
  className?: string;
}

export function VideoCard({
  thumbnail,
  title,
  views,
  likes,
  comments,
  platforms,
  date,
  className,
}: VideoCardProps) {
  return (
    <div
      className={cn(
        "card-elevated overflow-hidden animate-slide-up hover:border-primary/30 transition-all duration-300 group",
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-secondary overflow-hidden">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Platform badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {platforms.map((platform) => (
            <span
              key={platform}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground",
                platform === "instagram" && "social-instagram",
                platform === "tiktok" && "social-tiktok",
                platform === "youtube" && "social-youtube",
                platform === "facebook" && "social-facebook"
              )}
            >
              {platform[0].toUpperCase()}
            </span>
          ))}
        </div>

        <button className="absolute top-2 right-2 p-1.5 rounded-full bg-background/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">{date}</p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{views}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{likes}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{comments}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
