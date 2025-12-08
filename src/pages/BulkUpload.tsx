import { useState, useRef } from "react";
import { Upload, FolderUp, Play, Calendar, Clock, Trash2, RefreshCw, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useConnectedAccounts } from "@/hooks/useConnectedAccounts";
import { useBulkUpload, BulkUploadConfig } from "@/hooks/useBulkUpload";
import { VideoQueueItem } from "@/components/bulk-upload/VideoQueueItem";
import { BulkUploadProgress } from "@/components/bulk-upload/BulkUploadProgress";
import { DateTimePicker } from "@/components/scheduler/DateTimePicker";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  FacebookIcon,
} from "@/components/icons/SocialIcons";
import { cn } from "@/lib/utils";

const platformIcons: Record<string, typeof InstagramIcon> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  facebook: FacebookIcon,
};

const INTERVAL_OPTIONS = [
  { value: "1", label: "1 hora" },
  { value: "2", label: "2 horas" },
  { value: "4", label: "4 horas" },
  { value: "6", label: "6 horas" },
  { value: "12", label: "12 horas" },
  { value: "24", label: "1 dia" },
  { value: "48", label: "2 dias" },
];

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
    MAX_VIDEOS,
  } = useBulkUpload();

  // Config state
  const [baseTitle, setBaseTitle] = useState("Vídeo #{n}");
  const [description, setDescription] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduleMode, setScheduleMode] = useState<"immediate" | "scheduled">("scheduled");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [intervalHours, setIntervalHours] = useState("6");

  const connectedAccounts = accounts?.filter(a => a.is_connected) || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const result = addToQueue(files);
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

    const result = addToQueue(files);
    if (!result.success) {
      toast({
        title: "Erro ao adicionar vídeos",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const validateConfig = (): boolean => {
    if (queue.length === 0) {
      toast({
        title: "Nenhum vídeo selecionado",
        description: "Adicione vídeos à fila para continuar.",
        variant: "destructive",
      });
      return false;
    }

    if (!baseTitle.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Adicione um título base para os vídeos.",
        variant: "destructive",
      });
      return false;
    }

    if (selectedPlatforms.length === 0) {
      toast({
        title: "Selecione uma plataforma",
        description: "Escolha pelo menos uma rede social.",
        variant: "destructive",
      });
      return false;
    }

    if (scheduleMode === "scheduled" && !startDate) {
      toast({
        title: "Data obrigatória",
        description: "Selecione uma data de início para o agendamento.",
        variant: "destructive",
      });
      return false;
    }

    if (scheduleMode === "scheduled" && startDate) {
      const minDate = new Date();
      minDate.setMinutes(minDate.getMinutes() + 5);
      if (startDate < minDate) {
        toast({
          title: "Data inválida",
          description: "A data deve ser pelo menos 5 minutos no futuro.",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleStartUpload = async () => {
    if (!validateConfig()) return;

    const config: BulkUploadConfig = {
      baseTitle,
      description,
      platforms: selectedPlatforms,
      scheduleMode,
      startDate,
      intervalHours: parseInt(intervalHours),
    };

    await processQueue(config);

    toast({
      title: "Processamento concluído!",
      description: `${progress.completed} vídeos processados com sucesso.`,
    });
  };

  const handleRetry = async () => {
    const config: BulkUploadConfig = {
      baseTitle,
      description,
      platforms: selectedPlatforms,
      scheduleMode,
      startDate,
      intervalHours: parseInt(intervalHours),
    };

    await retryFailed(config);
  };

  const hasQueue = queue.length > 0;
  const hasFailed = progress.failed > 0;
  const isComplete = progress.completed + progress.failed === progress.total && progress.total > 0;

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
              <h2 className="text-sm font-medium">
                Fila de vídeos ({queue.length})
              </h2>
              {!isProcessing && (
                <Button variant="ghost" size="sm" onClick={clearQueue}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {queue.map((item, index) => (
                <VideoQueueItem
                  key={item.id}
                  item={item}
                  index={index}
                  onRemove={removeFromQueue}
                  disabled={isProcessing}
                />
              ))}
            </div>
          </div>
        )}

        {/* Configuration */}
        {hasQueue && !isComplete && (
          <div className="space-y-4 p-4 rounded-xl bg-card border border-border">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Configuração em Lote
            </h2>

            {/* Title template */}
            <div className="space-y-2">
              <Label htmlFor="baseTitle">Título base</Label>
              <Input
                id="baseTitle"
                value={baseTitle}
                onChange={(e) => setBaseTitle(e.target.value)}
                placeholder="Ex: Vídeo #{n} ou Minha Série"
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{n}"} para numerar automaticamente (ex: "Vídeo #1", "Vídeo #2")
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição padrão para todos os vídeos..."
                rows={2}
                disabled={isProcessing}
              />
            </div>

            {/* Platforms */}
            <div className="space-y-2">
              <Label>Plataformas</Label>
              <div className="grid grid-cols-2 gap-2">
                {connectedAccounts.map((account) => {
                  const Icon = platformIcons[account.platform];
                  const isSelected = selectedPlatforms.includes(account.platform);
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => handlePlatformToggle(account.platform)}
                      disabled={isProcessing}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Checkbox checked={isSelected} />
                      {Icon && <Icon className="w-4 h-4" />}
                      <span className="text-sm capitalize">{account.platform}</span>
                    </button>
                  );
                })}
              </div>
              {connectedAccounts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma conta conectada.{" "}
                  <Link to="/profile" className="text-primary hover:underline">
                    Conectar conta
                  </Link>
                </p>
              )}
            </div>

            {/* Schedule mode */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Agendar publicações</Label>
                <Switch
                  checked={scheduleMode === "scheduled"}
                  onCheckedChange={(v) => setScheduleMode(v ? "scheduled" : "immediate")}
                  disabled={isProcessing}
                />
              </div>

              {scheduleMode === "scheduled" && (
                <div className="space-y-3 pl-1">
                  <div className="space-y-2">
                    <Label className="text-xs">Data e hora de início</Label>
                    <DateTimePicker
                      value={startDate}
                      onChange={setStartDate}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Intervalo entre posts</Label>
                    <Select value={intervalHours} onValueChange={setIntervalHours} disabled={isProcessing}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERVAL_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!isProcessing && !isComplete && hasQueue && (
            <Button
              onClick={handleStartUpload}
              className="flex-1"
              size="lg"
              disabled={selectedPlatforms.length === 0}
            >
              {scheduleMode === "immediate" ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Publicar {queue.length} vídeos agora
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Agendar {queue.length} vídeos
                </>
              )}
            </Button>
          )}

          {hasFailed && !isProcessing && (
            <Button variant="outline" onClick={handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente ({progress.failed})
            </Button>
          )}

          {isComplete && !hasFailed && (
            <div className="flex-1 text-center py-4">
              <p className="text-green-500 font-medium">
                ✓ Todos os {progress.completed} vídeos foram processados!
              </p>
              <Link to="/scheduled" className="text-sm text-primary hover:underline">
                Ver agenda
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
