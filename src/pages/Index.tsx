import { Eye, Heart, Video, TrendingUp, Bell, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { SocialCard } from "@/components/dashboard/SocialCard";
import { VideoCard } from "@/components/dashboard/VideoCard";
import { Button } from "@/components/ui/button";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  FacebookIcon,
} from "@/components/icons/SocialIcons";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useConnectedAccounts } from "@/hooks/useConnectedAccounts";
import { useVideos } from "@/hooks/useVideos";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <InstagramIcon className="w-6 h-6" />,
  tiktok: <TikTokIcon className="w-6 h-6" />,
  youtube: <YouTubeIcon className="w-6 h-6" />,
  facebook: <FacebookIcon className="w-6 h-6" />,
};

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: accounts, isLoading: accountsLoading } = useConnectedAccounts();
  const { data: videos, isLoading: videosLoading } = useVideos();

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Creator";
  const recentVideos = videos?.slice(0, 2) || [];

  // Placeholder stats (will be dynamic with video_stats table later)
  const stats = [
    { icon: Eye, label: "Visualizações", value: "-", change: "-", positive: true },
    { icon: Heart, label: "Curtidas", value: "-", change: "-", positive: true },
    { icon: Video, label: "Vídeos", value: String(videos?.length || 0), change: "-", positive: true },
    { icon: TrendingUp, label: "Engajamento", value: "-", change: "-", positive: false },
  ];

  return (
    <AppLayout>
      <div className="px-4 pt-6 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Olá, <span className="gradient-text">{displayName}</span> 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Vamos publicar algo incrível hoje?
            </p>
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </Button>
        </header>

        {/* Quick Upload CTA */}
        <div className="gradient-border p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground mb-1">
                Novo vídeo pronto?
              </h2>
              <p className="text-sm text-muted-foreground">
                Publique em todas as redes com um clique
              </p>
            </div>
            <Button variant="gradient" onClick={() => navigate("/upload")}>
              Upload
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Resumo da Semana
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, index) => (
              <StatsCard
                key={stat.label}
                icon={stat.icon}
                label={stat.label}
                value={stat.value}
                change={stat.change}
                positive={stat.positive}
                className={`animation-delay-${index * 100}`}
              />
            ))}
          </div>
        </section>

        {/* Social Networks */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Redes Conectadas
          </h2>
          {accountsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {accounts?.map((account, index) => (
                <SocialCard
                  key={account.id}
                  name={account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                  icon={platformIcons[account.platform]}
                  connected={account.is_connected}
                  followers={account.platform_username || undefined}
                  className={`animation-delay-${index * 100}`}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recent Videos */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              Vídeos Recentes
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              Ver todos
            </Button>
          </div>
          {videosLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : recentVideos.length > 0 ? (
            <div className="space-y-4">
              {recentVideos.map((video, index) => (
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
                  className={`animation-delay-${index * 150}`}
                />
              ))}
            </div>
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
      </div>
    </AppLayout>
  );
}
