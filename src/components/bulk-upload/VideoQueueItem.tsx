import { useState, useEffect } from "react";
import { X, CheckCircle, Loader2, AlertCircle, Clock, Upload, Calendar, Pencil, ChevronDown, ChevronUp, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkUploadItem } from "@/hooks/useBulkUpload";
import { DateTimePicker } from "@/components/scheduler/DateTimePicker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  FacebookIcon,
} from "@/components/icons/SocialIcons";

interface ConnectedAccount {
  id: string;
  platform: string;
  is_connected: boolean;
  platform_username?: string | null;
}

interface VideoQueueItemProps {
  item: BulkUploadItem;
  index: number;
  onRemove: (id: string) => void;
  onUpdate?: (id: string, updates: { 
    title?: string; 
    description?: string;
    scheduleMode?: "immediate" | "scheduled";
    individualScheduledDate?: Date;
    platforms?: string[];
  }) => void;
  disabled?: boolean;
  connectedAccounts: ConnectedAccount[];
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

const platformIcons: Record<string, typeof InstagramIcon> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  facebook: FacebookIcon,
};

export function VideoQueueItem({ item, index, onRemove, onUpdate, disabled, connectedAccounts }: VideoQueueItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localTitle, setLocalTitle] = useState(item.title || "");
  const [localDescription, setLocalDescription] = useState(item.description || "");
  const [localScheduleMode, setLocalScheduleMode] = useState<"immediate" | "scheduled">(
    item.scheduleMode || "scheduled"
  );
  const [localScheduledDate, setLocalScheduledDate] = useState<Date | undefined>(
    item.individualScheduledDate
  );
  const [localPlatforms, setLocalPlatforms] = useState<string[]>(item.platforms || []);

  // Sync local state when item changes
  useEffect(() => {
    if (item.scheduleMode) setLocalScheduleMode(item.scheduleMode);
    if (item.individualScheduledDate) setLocalScheduledDate(item.individualScheduledDate);
    if (item.platforms) setLocalPlatforms(item.platforms);
    if (item.title) setLocalTitle(item.title);
    if (item.description) setLocalDescription(item.description);
  }, [item.scheduleMode, item.individualScheduledDate, item.platforms, item.title, item.description]);

  const config = statusConfig[item.status];
  const StatusIcon = config.icon;
  const isLoading = ["uploading", "scheduling", "publishing"].includes(item.status);
  const isComplete = ["scheduled", "published"].includes(item.status);
  const canEdit = !isLoading && !isComplete && item.status !== "failed";

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpdate = (updates: Partial<{
    title: string;
    description: string;
    scheduleMode: "immediate" | "scheduled";
    individualScheduledDate?: Date;
    platforms: string[];
  }>) => {
    onUpdate?.(item.id, {
      title: updates.title ?? localTitle,
      description: updates.description ?? localDescription,
      scheduleMode: updates.scheduleMode ?? localScheduleMode,
      individualScheduledDate: updates.individualScheduledDate ?? localScheduledDate,
      platforms: updates.platforms ?? localPlatforms,
    });
  };

  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    handleUpdate({ title: value });
  };

  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value);
    handleUpdate({ description: value });
  };

  const handleScheduleModeChange = (mode: "immediate" | "scheduled") => {
    setLocalScheduleMode(mode);
    handleUpdate({ 
      scheduleMode: mode,
      individualScheduledDate: mode === "scheduled" ? localScheduledDate : undefined,
    });
  };

  const handleDateChange = (date: Date | undefined) => {
    setLocalScheduledDate(date);
    handleUpdate({ individualScheduledDate: date });
  };

  const handlePlatformToggle = (platform: string) => {
    const newPlatforms = localPlatforms.includes(platform)
      ? localPlatforms.filter(p => p !== platform)
      : [...localPlatforms, platform];
    setLocalPlatforms(newPlatforms);
    handleUpdate({ platforms: newPlatforms });
  };

  const toggleExpand = () => {
    if (canEdit && !disabled) {
      setIsExpanded(!isExpanded);
    }
  };

  // Get schedule display label
  const getScheduleLabel = () => {
    if (item.scheduleMode === "immediate") {
      return "Publicar agora";
    }
    if (item.individualScheduledDate) {
      return format(item.individualScheduledDate, "dd/MM HH:mm", { locale: ptBR }) + " (BRT)";
    }
    return null;
  };

  const scheduleLabel = getScheduleLabel();
  const platformCount = item.platforms?.length || 0;

  return (
    <div 
      className={cn(
        "rounded-lg border transition-colors",
        item.status === "failed" && "border-destructive/50 bg-destructive/5",
        isComplete && "border-green-500/50 bg-green-500/5",
        isLoading && "border-primary/50 bg-primary/5",
        !isLoading && !isComplete && item.status !== "failed" && "border-border bg-card"
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Index */}
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
          {index + 1}
        </div>

        {/* Video info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{item.file.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatSize(item.file.size)}
            </span>
          </div>
          
          {/* Badges row */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {platformCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {platformCount} plataforma{platformCount > 1 ? "s" : ""}
              </Badge>
            )}
            {scheduleLabel && (
              <Badge variant="outline" className="text-xs">
                {item.scheduleMode === "immediate" ? (
                  <Play className="w-3 h-3 mr-1" />
                ) : (
                  <Calendar className="w-3 h-3 mr-1" />
                )}
                {scheduleLabel}
              </Badge>
            )}
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

        {/* Edit button */}
        {canEdit && onUpdate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={toggleExpand}
            disabled={disabled}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          </Button>
        )}

        {/* Remove button */}
        {canEdit && (
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

      {/* Expanded edit section */}
      {isExpanded && canEdit && (
        <div className="px-3 pb-3 pt-0 space-y-4 border-t border-border/50 mt-0">
          {/* Title */}
          <div className="pt-3 space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Título
            </label>
            <Input
              value={localTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={`Título do vídeo ${index + 1}`}
              disabled={disabled}
              className="h-9"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Descrição
            </label>
            <Textarea
              value={localDescription}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Descrição do vídeo..."
              rows={2}
              disabled={disabled}
              className="resize-none"
            />
          </div>

          {/* Platforms */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Plataformas
            </label>
            <div className="grid grid-cols-2 gap-2">
              {connectedAccounts.map((account) => {
                const Icon = platformIcons[account.platform];
                const isSelected = localPlatforms.includes(account.platform);
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => handlePlatformToggle(account.platform)}
                    disabled={disabled}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border transition-colors text-left",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    {Icon && <Icon className="w-4 h-4" />}
                    <span className="text-xs capitalize">{account.platform}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule Options */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground">
              Quando publicar
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={localScheduleMode === "immediate" ? "default" : "outline"}
                size="sm"
                onClick={() => handleScheduleModeChange("immediate")}
                disabled={disabled}
                className="flex-1"
              >
                <Play className="w-3 h-3 mr-1.5" />
                Agora
              </Button>
              <Button
                type="button"
                variant={localScheduleMode === "scheduled" ? "default" : "outline"}
                size="sm"
                onClick={() => handleScheduleModeChange("scheduled")}
                disabled={disabled}
                className="flex-1"
              >
                <Calendar className="w-3 h-3 mr-1.5" />
                Agendar
              </Button>
            </div>

            {/* Date picker for scheduled mode */}
            {localScheduleMode === "scheduled" && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Data e hora
                </label>
                <DateTimePicker
                  value={localScheduledDate}
                  onChange={handleDateChange}
                  minDate={new Date()}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
