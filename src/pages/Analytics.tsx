import { TrendingUp, Eye, Heart, MessageCircle, Users, Calendar } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const overviewStats = [
  { icon: Eye, label: "Total Views", value: "45.2K", change: "+18%", positive: true },
  { icon: Heart, label: "Total Likes", value: "12.8K", change: "+24%", positive: true },
  { icon: MessageCircle, label: "Comentários", value: "2.1K", change: "+12%", positive: true },
  { icon: Users, label: "Novos Seguidores", value: "892", change: "+8%", positive: true },
];

const platformStats = [
  { name: "Instagram", views: "18.5K", engagement: "12.4%", color: "social-instagram" },
  { name: "TikTok", views: "22.1K", engagement: "15.8%", color: "social-tiktok" },
  { name: "YouTube", views: "4.6K", engagement: "8.2%", color: "social-youtube" },
];

const topVideos = [
  { title: "Como criar conteúdo viral", views: "8.2K", likes: "1.8K", platform: "TikTok" },
  { title: "Dicas de edição para iniciantes", views: "5.4K", likes: "1.2K", platform: "Instagram" },
  { title: "Minha rotina de criador", views: "3.1K", likes: "890", platform: "YouTube" },
];

const timeFilters = ["7 dias", "30 dias", "90 dias", "1 ano"];

export default function Analytics() {
  return (
    <AppLayout>
      <div className="px-4 pt-6 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              <span className="gradient-text">Analytics</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Acompanhe seu desempenho
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            30 dias
          </Button>
        </header>

        {/* Time Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {timeFilters.map((filter, index) => (
            <Button
              key={filter}
              variant={index === 1 ? "default" : "ghost"}
              size="sm"
              className="shrink-0"
            >
              {filter}
            </Button>
          ))}
        </div>

        {/* Overview Stats */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Visão Geral
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {overviewStats.map((stat, index) => (
              <StatsCard
                key={stat.label}
                icon={stat.icon}
                label={stat.label}
                value={stat.value}
                change={stat.change}
                positive={stat.positive}
              />
            ))}
          </div>
        </section>

        {/* Performance Chart Placeholder */}
        <section className="card-elevated p-4">
          <h3 className="font-semibold text-foreground mb-4">
            Performance dos Últimos 30 Dias
          </h3>
          <div className="h-48 flex items-end justify-between gap-1">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/20 rounded-t transition-all duration-300 hover:bg-primary/40"
                style={{
                  height: `${Math.random() * 80 + 20}%`,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>1 Nov</span>
            <span>15 Nov</span>
            <span>30 Nov</span>
          </div>
        </section>

        {/* Platform Breakdown */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Por Plataforma
          </h2>
          <div className="space-y-3">
            {platformStats.map((platform) => (
              <div
                key={platform.name}
                className="card-elevated p-4 flex items-center gap-4"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground font-bold",
                    platform.color
                  )}
                >
                  {platform.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{platform.name}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{platform.views} views</span>
                    <span>{platform.engagement} engajamento</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top Performing Videos */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Top Vídeos
          </h2>
          <div className="space-y-3">
            {topVideos.map((video, index) => (
              <div
                key={index}
                className="card-elevated p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-bold text-primary">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {video.title}
                  </p>
                  <div className="flex gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {video.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {video.likes}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                  {video.platform}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
