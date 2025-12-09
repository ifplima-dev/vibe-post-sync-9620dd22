import { useState } from "react";
import { Video, Loader2, Plus, Play } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { NotificationsSheet } from "@/components/notifications/NotificationsSheet";
import { ConnectAccountDialog } from "@/components/social/ConnectAccountDialog";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  FacebookIcon,
} from "@/components/icons/SocialIcons";
import { useNavigate } from "react-router-dom";
import { useConnectedAccounts } from "@/hooks/useConnectedAccounts";
import { useVideos } from "@/hooks/useVideos";
import { cn } from "@/lib/utils";

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <InstagramIcon className="w-6 h-6" />,
  tiktok: <TikTokIcon className="w-6 h-6" />,
  youtube: <YouTubeIcon className="w-6 h-6" />,
  facebook: <FacebookIcon className="w-6 h-6" />,
};

const platformLabels: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
};

export default function Index() {
  const navigate = useNavigate();
  const { data: accounts, isLoading: accountsLoading } = useConnectedAccounts();
  const { data: videos, isLoading: videosLoading } = useVideos();

  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const handleConnectAccount = (platform: string) => {
    setSelectedPlatform(platform);
    setConnectDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header Compacto */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h1 className="text-lg font-semibold text-foreground">SocialHub</h1>
          <NotificationsSheet />
        </header>

        {/* Redes Sociais - Pills Horizontais */}
        <div className="px-4 py-4 border-b border-border/30">
          {accountsLoading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1">
              {accounts?.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleConnectAccount(account.platform)}
                  className="flex flex-col items-center gap-1.5 min-w-fit"
                >
                  <div
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                      account.is_connected
                        ? "bg-gradient-to-br from-primary/20 to-accent/20 ring-2 ring-primary"
                        : "border-2 border-dashed border-muted-foreground/40 hover:border-primary/60"
                    )}
                  >
                    {account.is_connected ? (
                      platformIcons[account.platform]
                    ) : (
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {platformLabels[account.platform]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid de Vídeos */}
        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-medium text-foreground">Seus Vídeos</h2>
            <button
              onClick={() => navigate("/profile")}
              className="text-xs text-primary hover:underline"
            >
              Ver todos
            </button>
          </div>

          {videosLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : videos && videos.length > 0 ? (
            <div className="grid grid-cols-3 gap-0.5">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="aspect-square relative bg-muted cursor-pointer group"
                  onClick={() => navigate("/profile")}
                >
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : video.file_url ? (
                    <video 
                      src={video.file_url} 
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Video className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Video className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Nenhum vídeo ainda
              </p>
              <button
                onClick={() => navigate("/upload")}
                className="text-sm text-primary hover:underline"
              >
                Fazer primeiro upload
              </button>
            </div>
          )}
        </div>
      </div>

      <ConnectAccountDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        platform={selectedPlatform}
      />
    </AppLayout>
  );
}
