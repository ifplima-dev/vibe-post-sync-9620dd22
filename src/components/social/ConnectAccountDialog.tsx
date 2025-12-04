import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  FacebookIcon,
} from "@/components/icons/SocialIcons";

const platformInfo: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; name: string }> = {
  instagram: { icon: InstagramIcon, color: "from-purple-500 to-pink-500", name: "Instagram" },
  tiktok: { icon: TikTokIcon, color: "from-black to-gray-800", name: "TikTok" },
  youtube: { icon: YouTubeIcon, color: "from-red-500 to-red-600", name: "YouTube" },
  facebook: { icon: FacebookIcon, color: "from-blue-500 to-blue-600", name: "Facebook" },
};

interface ConnectAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: string | null;
}

export function ConnectAccountDialog({ open, onOpenChange, platform }: ConnectAccountDialogProps) {
  if (!platform) return null;

  const info = platformInfo[platform];
  if (!info) return null;

  const Icon = info.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${info.color}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            Conectar {info.name}
          </DialogTitle>
          <DialogDescription>
            Conecte sua conta do {info.name} para publicar vídeos diretamente.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ExternalLink className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Em desenvolvimento</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A integração OAuth com {info.name} está sendo implementada. 
                  Em breve você poderá conectar sua conta e publicar automaticamente.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button
            variant="gradient"
            className="flex-1"
            disabled
          >
            Conectar (Em breve)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
