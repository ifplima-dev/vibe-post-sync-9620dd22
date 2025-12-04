import { useState } from "react";
import { CalendarClock, Filter, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useScheduler } from "@/contexts/SchedulerContext";
import { ScheduledPostCard } from "@/components/scheduler/ScheduledPostCard";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterStatus = "all" | "scheduled" | "published" | "failed";

export default function Scheduled() {
  const { scheduledPosts, cancelScheduledPost, publishNow } = useScheduler();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  const filteredPosts = scheduledPosts
    .filter((post) => filterStatus === "all" || post.status === filterStatus)
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  const pendingCount = scheduledPosts.filter((p) => p.status === "scheduled").length;

  const handlePublishNow = (id: string) => {
    publishNow(id);
    toast({
      title: "Publicando...",
      description: "Seu vídeo está sendo publicado agora.",
    });
  };

  const handleCancel = (id: string) => {
    cancelScheduledPost(id);
    toast({
      title: "Agendamento cancelado",
      description: "O post foi removido da agenda.",
    });
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              <span className="gradient-text">Agenda</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {pendingCount} post{pendingCount !== 1 ? "s" : ""} agendado{pendingCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Button variant="gradient" size="sm" onClick={() => navigate("/upload")}>
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </header>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="scheduled">Agendados</SelectItem>
              <SelectItem value="published">Publicados</SelectItem>
              <SelectItem value="failed">Falharam</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Posts List */}
        {filteredPosts.length > 0 ? (
          <div className="space-y-3 pb-24">
            {filteredPosts.map((post) => (
              <ScheduledPostCard
                key={post.id}
                post={post}
                onPublishNow={handlePublishNow}
                onCancel={handleCancel}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <CalendarClock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              Nenhum post agendado
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Agende seus vídeos para publicar automaticamente nas redes sociais.
            </p>
            <Button variant="gradient" onClick={() => navigate("/upload")}>
              <Plus className="h-4 w-4" />
              Agendar primeiro vídeo
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
