import { useState } from "react";
import { CalendarClock, Filter, Plus, Loader2, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ScheduledPostCard } from "@/components/scheduler/ScheduledPostCard";
import { useScheduledPosts, useUpdateScheduledPost, useDeleteScheduledPost } from "@/hooks/useScheduledPosts";
import { useToast } from "@/hooks/use-toast";

type FilterStatus = "all" | "scheduled" | "published" | "failed";

export default function Scheduled() {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: posts, isLoading } = useScheduledPosts();
  const updatePost = useUpdateScheduledPost();
  const deletePost = useDeleteScheduledPost();

  const filteredPosts = posts?.filter((post) => {
    if (filter === "all") return true;
    return post.status === filter;
  }) || [];

  const pendingCount = posts?.filter((p) => p.status === "scheduled").length || 0;

  const handlePublishNow = async (id: string) => {
    await updatePost.mutateAsync({ id, updates: { status: "publishing" } });
    toast({ title: "Publicando...", description: "Seu vídeo está sendo publicado." });
    setTimeout(async () => {
      await updatePost.mutateAsync({ id, updates: { status: "published" } });
    }, 2000);
  };

  const handleCancel = async (id: string) => {
    await deletePost.mutateAsync(id);
    toast({ title: "Cancelado", description: "O agendamento foi removido." });
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              <span className="gradient-text">Agendamentos</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {pendingCount} {pendingCount === 1 ? "post pendente" : "posts pendentes"}
            </p>
          </div>
          <Button variant="gradient" size="sm" onClick={() => navigate("/upload")}>
            <Plus className="w-4 h-4" />
            Novo
          </Button>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {(["all", "scheduled", "published", "failed"] as FilterStatus[]).map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(status)}
              className="shrink-0"
            >
              <Filter className="w-4 h-4 mr-1" />
              {status === "all" ? "Todos" : status === "scheduled" ? "Agendados" : status === "published" ? "Publicados" : "Falhou"}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="space-y-4 pb-24">
            {filteredPosts.map((post) => (
              <ScheduledPostCard
                key={post.id}
                post={{
                  id: post.id,
                  videoFile: post.video_file_url,
                  videoName: post.video_name,
                  title: post.title,
                  description: post.description || "",
                  platforms: post.platforms,
                  scheduledDate: new Date(post.scheduled_date),
                  status: post.status as "scheduled" | "publishing" | "published" | "failed",
                  createdAt: new Date(post.created_at),
                }}
                onPublishNow={handlePublishNow}
                onCancel={handleCancel}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <Calendar className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum agendamento</h2>
            <p className="text-muted-foreground mb-6 max-w-xs">
              Agende seus vídeos para publicar automaticamente
            </p>
            <Button variant="gradient" onClick={() => navigate("/upload")}>
              <CalendarClock className="w-4 h-4" />
              Agendar Primeiro Vídeo
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}