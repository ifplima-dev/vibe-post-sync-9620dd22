import { Settings, Grid, List, LogOut, Edit3, Link2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { VideoCard } from "@/components/dashboard/VideoCard";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/icons/SocialIcons";
import { cn } from "@/lib/utils";
import { useState } from "react";

const userVideos = [
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
  {
    thumbnail: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&h=300&fit=crop",
    title: "Minha rotina de criador de conteúdo",
    views: "3.1K",
    likes: "721",
    comments: "98",
    platforms: ["tiktok"],
    date: "Há 1 semana",
  },
  {
    thumbnail: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=300&fit=crop",
    title: "Setup tour: meu estúdio caseiro",
    views: "5.6K",
    likes: "1.2K",
    comments: "234",
    platforms: ["youtube", "instagram", "tiktok"],
    date: "Há 2 semanas",
  },
];

const connectedAccounts = [
  { name: "Instagram", icon: InstagramIcon, handle: "@creator_oficial", followers: "5.2K" },
  { name: "TikTok", icon: TikTokIcon, handle: "@creator_oficial", followers: "12.8K" },
  { name: "YouTube", icon: YouTubeIcon, handle: "Creator Oficial", followers: "2.1K" },
];

export default function Profile() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
            >
              <Settings className="w-5 h-5" />
            </Button>

            {/* Avatar */}
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-coral to-magenta p-1 mb-4">
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-3xl font-bold gradient-text">
                C
              </div>
            </div>

            <h1 className="text-xl font-bold text-foreground">Creator Oficial</h1>
            <p className="text-muted-foreground text-sm">@creator_oficial</p>

            {/* Stats */}
            <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">24</p>
                <p className="text-xs text-muted-foreground">Vídeos</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">20.1K</p>
                <p className="text-xs text-muted-foreground">Seguidores</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">45.2K</p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <Button variant="gradient" className="flex-1">
                <Edit3 className="w-4 h-4" />
                Editar Perfil
              </Button>
              <Button variant="outline" className="flex-1">
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
          <div className="space-y-2">
            {connectedAccounts.map((account) => (
              <div
                key={account.name}
                className="card-elevated p-3 flex items-center gap-3"
              >
                <account.icon className="w-5 h-5 text-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {account.handle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {account.followers} seguidores
                  </p>
                </div>
                <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                  {account.name}
                </span>
              </div>
            ))}
          </div>
        </section>

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

          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-2 gap-3"
                : "space-y-4"
            )}
          >
            {userVideos.map((video, index) => (
              <VideoCard
                key={index}
                {...video}
                className={viewMode === "grid" ? "!p-0 [&>div:last-child]:p-3" : ""}
              />
            ))}
          </div>
        </section>

        {/* Logout Button */}
        <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
          <LogOut className="w-4 h-4" />
          Sair da Conta
        </Button>
      </div>
    </AppLayout>
  );
}
