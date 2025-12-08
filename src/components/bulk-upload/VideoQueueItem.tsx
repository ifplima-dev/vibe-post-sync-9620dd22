import { X, CheckCircle, Loader2, AlertCircle, Clock, Upload, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BulkUploadItem } from "@/hooks/useBulkUpload";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VideoQueueItemProps {
  item: BulkUploadItem;
  index: number;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const statusConfig = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "Na fila" },
  uploading: { icon: Upload, color: "text-primary", label: "Enviando..." },
  uploaded: { icon: CheckCircle, color: "text-blue-500", label: "Enviado" },
  scheduling: { icon: Calendar, color: "text-primary", label: "Agendando..." },
  scheduled: { icon: Calendar, color: "text-green-500", label: "Agendado" },
  publishing: { icon: Loader2, color: "text-primary", label: "Publicando..." },
  published: { icon: CheckCircle, color: "text-green-500", label: "Publicado" },
  failed: { icon: AlertCircle, color: "text-destructive", label: "Falhou" },
};

export function VideoQueueItem({ item, index, onRemove, disabled }: VideoQueueItemProps) {
  const config = statusConfig[item.status];
  const StatusIcon = config.icon;
  const isLoading = ["uploading", "scheduling", "publishing"].includes(item.status);
  const isComplete = ["scheduled", "published"].includes(item.status);
  const canRemove = !isLoading && !isComplete;

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        item.status === "failed" && "border-destructive/50 bg-destructive/5",
        isComplete && "border-green-500/50 bg-green-500/5",
        isLoading && "border-primary/50 bg-primary/5",
        !isLoading && !isComplete && item.status !== "failed" && "border-border bg-card"
      )}
    >
      {/* Index */}
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
        {index + 1}
      </div>

      {/* Video info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{item.file.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatSize(item.file.size)}
          </span>
        </div>
        
        {/* Progress bar */}
        {isLoading && (
          <Progress value={item.progress} className="h-1.5 mt-2" />
        )}

        {/* Scheduled date */}
        {item.status === "scheduled" && item.scheduledDate && (
          <p className="text-xs text-muted-foreground mt-1">
            {format(item.scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        )}

        {/* Error message */}
        {item.status === "failed" && item.error && (
          <p className="text-xs text-destructive mt-1 truncate">{item.error}</p>
        )}
      </div>

      {/* Status */}
      <div className={cn("flex items-center gap-1.5", config.color)}>
        <StatusIcon className={cn("w-4 h-4", isLoading && "animate-spin")} />
        <span className="text-xs font-medium hidden sm:inline">{config.label}</span>
      </div>

      {/* Remove button */}
      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onRemove(item.id)}
          disabled={disabled}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
