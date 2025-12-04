import { useState } from "react";
import { TrendingUp, Eye, Heart, MessageCircle, Users, Calendar, Video } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVideos } from "@/hooks/useVideos";
import { useConnectedAccounts } from "@/hooks/useConnectedAccounts";

const timeFilters = ["7 dias", "30 dias", "90 dias", "1 ano"];

export default function Analytics() {
  const [selectedFilter, setSelectedFilter] = useState("30 dias");
  const { data: videos } = useVideos();
  const { data: accounts } = useConnectedAccounts();

  const connectedPlatforms = accounts?.filter((a) => a.is_connected) || [];

  // Placeholder stats - will be dynamic with video_stats later
  const overviewStats = [
    { icon: Eye, label: "Total Views", value: "-", change: "-", positive: true },
    { icon: Heart, label: "Total Likes", value: "-", change: "-", positive: true },
    { icon: MessageCircle, label: "Comentários", value: "-", change: "-", positive: true },
    { icon: Users, label: "Novos Seguidores", value: "-", change: "-", positive: true },
  ];

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
            {selectedFilter}
          </Button>
        </header>

        {/* Time Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {timeFilters.map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? "default" : "ghost"}
              size="sm"
              className="shrink-0"
              onClick={() => setSelectedFilter(filter)}
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
            {overviewStats.map((stat) => (
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
            Performance dos Últimos {selectedFilter}
          </h3>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Conecte suas redes para ver métricas</p>
            </div>
          </div>
        </section>

        {/* Platform Breakdown */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Por Plataforma
          </h2>
          {connectedPlatforms.length > 0 ? (
            <div className="space-y-3">
              {connectedPlatforms.map((platform) => (
                <div
                  key={platform.id}
                  className="card-elevated p-4 flex items-center gap-4"
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground font-bold bg-primary"
                    )}
                  >
                    {platform.platform[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground capitalize">
                      {platform.platform}
                    </p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>- views</span>
                      <span>- engajamento</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-elevated p-8 text-center">
              <p className="text-muted-foreground">Nenhuma plataforma conectada</p>
            </div>
          )}
        </section>

        {/* Top Performing Videos */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Top Vídeos
          </h2>
          {videos && videos.length > 0 ? (
            <div className="space-y-3">
              {videos.slice(0, 3).map((video, index) => (
                <div
                  key={video.id}
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
                        -
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        -
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-elevated p-8 text-center">
              <Video className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum vídeo publicado</p>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
