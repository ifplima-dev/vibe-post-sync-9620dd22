import { useState } from "react";
import { Settings, Grid, List, LogOut, Edit3, Link2, Loader2, Video, RefreshCw } from "lucide-react";
import { ConnectAccountDialog } from "@/components/social/ConnectAccountDialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { VideoCard } from "@/components/dashboard/VideoCard";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  FacebookIcon,
} from "@/components/icons/SocialIcons";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useConnectedAccounts } from "@/hooks/useConnectedAccounts";
import { useVideos } from "@/hooks/useVideos";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const platformIcons: Record<string, typeof InstagramIcon> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  facebook: FacebookIcon,
};

export default function Profile() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<"instagram" | "facebook" | "tiktok" | "youtube" | null>(null);

  const handleReconnect = (platform: string) => {
    setSelectedPlatform(platform as "instagram" | "facebook" | "tiktok" | "youtube");
    setConnectDialogOpen(true);
  };
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: accounts, isLoading: accountsLoading } = useConnectedAccounts();
  const { data: videos, isLoading: videosLoading } = useVideos();
  const { toast } = useToast();

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Creator";
  const username = profile?.username || user?.email?.split("@")[0] || "creator";
  const connectedAccounts = accounts?.filter((a) => a.is_connected) || [];

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/profile/${username}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast({
        title: "Link copiado!",
        description: "O link do perfil foi copiado para a área de transferência.",
      });
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  const handleSettings = () => {
    toast({
      title: "Configurações",
      description: "Página de configurações em desenvolvimento.",
    });
  };

  if (profileLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 pt-6 space-y-6">
        {/* Profile Header */}
        <div className="card-elevated p-6 text-center relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 opacity-20" style={{ background: "var(--gradient-primary)" }} />
          
          <div className="relative">
            {/* Settings button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0"
              onClick={handleSettings}
            >
              <Settings className="w-5 h-5" />
            </Button>

            {/* Avatar */}
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-coral to-magenta p-1 mb-4">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-3xl font-bold gradient-text">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
            <p className="text-muted-foreground text-sm">@{username}</p>

            {/* Stats */}
            <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{videos?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Vídeos</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">-</p>
                <p className="text-xs text-muted-foreground">Seguidores</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">-</p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <Button variant="gradient" className="flex-1" onClick={() => setEditDialogOpen(true)}>
                <Edit3 className="w-4 h-4" />
                Editar Perfil
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleShare}>
                <Link2 className="w-4 h-4" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>

        {/* Connected Accounts */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Contas Conectadas
          </h2>
          {accountsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {(["instagram", "facebook", "tiktok", "youtube"] as const).map((platform) => {
                const Icon = platformIcons[platform];
                const connectedAccount = accounts?.find(
                  (a) => a.platform === platform && a.is_connected
                );
                const isComingSoon = platform === "tiktok" || platform === "youtube";
                const platformNames: Record<string, string> = {
                  instagram: "Instagram",
                  facebook: "Facebook",
                  tiktok: "TikTok",
                  youtube: "YouTube",
                };

                return (
                  <div
                    key={platform}
                    className="card-elevated p-3 flex items-center gap-3"
                  >
                    <Icon className="w-5 h-5 text-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {connectedAccount?.platform_username || platformNames[platform]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {connectedAccount 
                          ? "Conectado" 
                          : isComingSoon 
                            ? "Em breve" 
                            : "Não conectado"}
                      </p>
                    </div>
                    <Button
                      variant={connectedAccount ? "ghost" : "outline"}
                      size="sm"
                      className={connectedAccount 
                        ? "text-muted-foreground hover:text-foreground" 
                        : "text-primary border-primary/30 hover:bg-primary/10"}
                      onClick={() => handleReconnect(platform)}
                    >
                      {connectedAccount ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Reconectar
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4 mr-1" />
                          Conectar
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* AI Caption Settings */}
        <AiCaptionSettingsCard />



        {/* Videos Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              Meus Vídeos
            </h2>
            <div className="flex gap-1 bg-secondary rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-card text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-card text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {videosLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : videos && videos.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-3 gap-[2px] max-w-[640px] mx-auto">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="aspect-square relative bg-secondary overflow-hidden group cursor-pointer"
                  >
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : video.file_url ? (
                      <video
                        src={video.file_url}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    thumbnail={video.thumbnail_url || "/placeholder.svg"}
                    title={video.title}
                    views="-"
                    likes="-"
                    comments="-"
                    platforms={[]}
                    date={formatDistanceToNow(new Date(video.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="card-elevated p-8 text-center">
              <Video className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum vídeo ainda</p>
              <Button
                variant="gradient"
                size="sm"
                className="mt-4"
                onClick={() => navigate("/upload")}
              >
                Fazer Upload
              </Button>
            </div>
          )}
        </section>

        {/* Logout Button */}
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Sair da Conta
        </Button>
      </div>

      <EditProfileDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} />
      
      {selectedPlatform && (
        <ConnectAccountDialog
          open={connectDialogOpen}
          onOpenChange={setConnectDialogOpen}
          platform={selectedPlatform}
        />
      )}
    </AppLayout>
  );
}
