import { Eye, Heart, Video, TrendingUp, Bell } from "lucide-react";
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

const stats = [
  { icon: Eye, label: "Visualizações", value: "12.4K", change: "+12%", positive: true },
  { icon: Heart, label: "Curtidas", value: "3.2K", change: "+8%", positive: true },
  { icon: Video, label: "Vídeos", value: "24", change: "+2", positive: true },
  { icon: TrendingUp, label: "Engajamento", value: "8.5%", change: "-2%", positive: false },
];

const socialNetworks = [
  { name: "Instagram", icon: <InstagramIcon className="w-6 h-6" />, connected: true, followers: "5.2K" },
  { name: "TikTok", icon: <TikTokIcon className="w-6 h-6" />, connected: true, followers: "12.8K" },
  { name: "YouTube", icon: <YouTubeIcon className="w-6 h-6" />, connected: false },
  { name: "Facebook", icon: <FacebookIcon className="w-6 h-6" />, connected: false },
];

const recentVideos = [
  {
    thumbnail: "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400&h=300&fit=crop",
    title: "Como criar conteúdo viral em 2024",
    views: "4.2K",
    likes: "892",
    comments: "156",
    platforms: ["instagram", "tiktok"],
    date: "Há 2 dias",
  },
  {
    thumbnail: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400&h=300&fit=crop",
    title: "Dicas de edição para iniciantes",
    views: "2.8K",
    likes: "654",
    comments: "89",
    platforms: ["youtube", "instagram"],
    date: "Há 5 dias",
  },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="px-4 pt-6 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Olá, <span className="gradient-text">Creator</span> 👋
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
          <div className="grid grid-cols-2 gap-3">
            {socialNetworks.map((network, index) => (
              <SocialCard
                key={network.name}
                name={network.name}
                icon={network.icon}
                connected={network.connected}
                followers={network.followers}
                className={`animation-delay-${index * 100}`}
              />
            ))}
          </div>
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
          <div className="space-y-4">
            {recentVideos.map((video, index) => (
              <VideoCard
                key={index}
                {...video}
                className={`animation-delay-${index * 150}`}
              />
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
