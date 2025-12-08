import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BulkUploadProgress as ProgressType } from "@/hooks/useBulkUpload";

interface BulkUploadProgressProps {
  progress: ProgressType;
  isProcessing: boolean;
}

export function BulkUploadProgress({ progress, isProcessing }: BulkUploadProgressProps) {
  const { total, completed, failed, uploading, currentFile } = progress;
  const percentage = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;
  const pending = total - completed - failed - uploading;

  // Estimate time remaining (rough estimate: 30s per video)
  const estimatedMinutes = Math.ceil((pending + uploading) * 0.5);

  return (
    <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
      {/* Main progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {isProcessing ? "Processando..." : completed === total && total > 0 ? "Concluído!" : "Aguardando início"}
          </span>
          <span className="text-muted-foreground">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-lg bg-muted/50">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <p className="text-lg font-semibold">{pending}</p>
          <p className="text-xs text-muted-foreground">Na fila</p>
        </div>

        <div className="p-2 rounded-lg bg-primary/10">
          <div className="flex items-center justify-center gap-1 text-primary mb-1">
            <Loader2 className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin" : ""}`} />
          </div>
          <p className="text-lg font-semibold text-primary">{uploading}</p>
          <p className="text-xs text-muted-foreground">Enviando</p>
        </div>

        <div className="p-2 rounded-lg bg-green-500/10">
          <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
            <CheckCircle className="w-3.5 h-3.5" />
          </div>
          <p className="text-lg font-semibold text-green-500">{completed}</p>
          <p className="text-xs text-muted-foreground">Concluído</p>
        </div>

        <div className="p-2 rounded-lg bg-destructive/10">
          <div className="flex items-center justify-center gap-1 text-destructive mb-1">
            <XCircle className="w-3.5 h-3.5" />
          </div>
          <p className="text-lg font-semibold text-destructive">{failed}</p>
          <p className="text-xs text-muted-foreground">Falhou</p>
        </div>
      </div>

      {/* Current file and time estimate */}
      {isProcessing && (
        <div className="text-xs text-muted-foreground space-y-1">
          {currentFile && (
            <p className="truncate">Processando: {currentFile}</p>
          )}
          {estimatedMinutes > 0 && (
            <p>Tempo estimado: ~{estimatedMinutes} min</p>
          )}
        </div>
      )}
    </div>
  );
}
