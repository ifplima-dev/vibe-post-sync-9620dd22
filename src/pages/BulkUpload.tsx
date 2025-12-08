import { useState, useRef } from "react";
import { Upload, FolderUp, Play, Calendar, Trash2, RefreshCw, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useConnectedAccounts } from "@/hooks/useConnectedAccounts";
import { useBulkUpload } from "@/hooks/useBulkUpload";
import { VideoQueueItem } from "@/components/bulk-upload/VideoQueueItem";
import { BulkUploadProgress } from "@/components/bulk-upload/BulkUploadProgress";
import { cn } from "@/lib/utils";

export default function BulkUpload() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: accounts } = useConnectedAccounts();
  
  const {
    queue,
    progress,
    isProcessing,
    addToQueue,
    removeFromQueue,
    clearQueue,
    processQueue,
    retryFailed,
    updateItem,
    MAX_VIDEOS,
  } = useBulkUpload();

  const connectedAccounts = accounts?.filter(a => a.is_connected) || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Get default platforms from connected accounts
    const defaultPlatforms = connectedAccounts.map(a => a.platform);

    const result = addToQueue(files, defaultPlatforms);
    if (!result.success) {
      toast({
        title: "Erro ao adicionar vídeos",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    const defaultPlatforms = connectedAccounts.map(a => a.platform);

    const result = addToQueue(files, defaultPlatforms);
    if (!result.success) {
      toast({
        title: "Erro ao adicionar vídeos",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const validateQueue = (): boolean => {
    if (queue.length === 0) {
      toast({
        title: "Nenhum vídeo selecionado",
        description: "Adicione vídeos à fila para continuar.",
        variant: "destructive",
      });
      return false;
    }

    // Check each video
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      
      if (!item.title?.trim()) {
        toast({
          title: `Vídeo ${i + 1}: Título obrigatório`,
          description: `Edite o vídeo "${item.file.name}" e adicione um título.`,
          variant: "destructive",
        });
        return false;
      }

      if (item.platforms.length === 0) {
        toast({
          title: `Vídeo ${i + 1}: Plataforma obrigatória`,
          description: `Selecione pelo menos uma plataforma para "${item.file.name}".`,
          variant: "destructive",
        });
        return false;
      }

      if (item.scheduleMode === "scheduled" && !item.individualScheduledDate) {
        toast({
          title: `Vídeo ${i + 1}: Data obrigatória`,
          description: `Selecione uma data de agendamento para "${item.file.name}".`,
          variant: "destructive",
        });
        return false;
      }

      if (item.scheduleMode === "scheduled" && item.individualScheduledDate) {
        const minDate = new Date();
        minDate.setMinutes(minDate.getMinutes() + 5);
        if (item.individualScheduledDate < minDate) {
          toast({
            title: `Vídeo ${i + 1}: Data inválida`,
            description: `A data deve ser pelo menos 5 minutos no futuro.`,
            variant: "destructive",
          });
          return false;
        }
      }
    }

    return true;
  };

  const handleConfirm = async () => {
    if (!validateQueue()) return;

    await processQueue();

    toast({
      title: "Processamento concluído!",
      description: `${progress.completed} vídeos processados com sucesso.`,
    });
  };

  const handleRetry = async () => {
    await retryFailed();
  };

  const hasQueue = queue.length > 0;
  const hasFailed = progress.failed > 0;
  const isComplete = progress.completed + progress.failed === progress.total && progress.total > 0;

  // Count immediate vs scheduled
  const immediateCount = queue.filter(item => item.scheduleMode === "immediate").length;
  const scheduledCount = queue.filter(item => item.scheduleMode === "scheduled").length;

  // Check if all items are configured
  const allConfigured = queue.every(item => 
    item.title?.trim() && 
    item.platforms.length > 0 && 
    (item.scheduleMode === "immediate" || item.individualScheduledDate)
  );

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/upload">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderUp className="w-6 h-6 text-primary" />
              Upload em Massa
            </h1>
            <p className="text-sm text-muted-foreground">
              Envie até {MAX_VIDEOS} vídeos de uma vez
            </p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
            !isProcessing && "cursor-pointer hover:border-primary hover:bg-primary/5",
            isProcessing && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={isProcessing}
          />
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">
            {hasQueue ? "Arraste mais vídeos ou clique para adicionar" : "Arraste vídeos aqui ou clique para selecionar"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Máximo {MAX_VIDEOS} vídeos • Apenas arquivos de vídeo
          </p>
        </div>

        {/* Progress panel */}
        {hasQueue && (
          <BulkUploadProgress progress={progress} isProcessing={isProcessing} />
        )}

        {/* Queue list */}
        {hasQueue && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium">
                  Fila de vídeos ({queue.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Clique em ✏️ para editar cada vídeo
                </p>
              </div>
              {!isProcessing && (
                <Button variant="ghost" size="sm" onClick={clearQueue}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {queue.map((item, index) => (
                <VideoQueueItem
                  key={item.id}
                  item={item}
                  index={index}
                  onRemove={removeFromQueue}
                  onUpdate={updateItem}
                  disabled={isProcessing}
                  connectedAccounts={connectedAccounts}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {hasQueue && !isComplete && (
          <div className="space-y-3">
            {/* Summary */}
            {!isProcessing && (
              <div className="text-center text-sm text-muted-foreground">
                {immediateCount > 0 && scheduledCount > 0 ? (
                  <span>{immediateCount} para publicar agora • {scheduledCount} para agendar</span>
                ) : immediateCount > 0 ? (
                  <span>{immediateCount} vídeo{immediateCount > 1 ? "s" : ""} para publicar agora</span>
                ) : scheduledCount > 0 ? (
                  <span>{scheduledCount} vídeo{scheduledCount > 1 ? "s" : ""} para agendar</span>
                ) : null}
              </div>
            )}

            {/* Confirm button */}
            {!isProcessing && (
              <Button
                onClick={handleConfirm}
                className="w-full"
                size="lg"
                disabled={!allConfigured}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar {queue.length} publicaç{queue.length > 1 ? "ões" : "ão"}
              </Button>
            )}

            {!allConfigured && !isProcessing && (
              <p className="text-xs text-center text-muted-foreground">
                Configure todos os vídeos antes de confirmar (título, plataforma e data)
              </p>
            )}
          </div>
        )}

        {/* Retry failed */}
        {hasFailed && !isProcessing && (
          <Button variant="outline" onClick={handleRetry} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente ({progress.failed} falha{progress.failed > 1 ? "s" : ""})
          </Button>
        )}

        {/* Complete message */}
        {isComplete && !hasFailed && (
          <div className="text-center py-4">
            <p className="text-green-500 font-medium">
              ✓ Todos os {progress.completed} vídeos foram processados!
            </p>
            <Link to="/scheduled" className="text-sm text-primary hover:underline">
              Ver agenda
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
