import { useState, useRef } from "react";
import { Upload as UploadIcon, X, Play, Scissors, Type, Share2, CalendarClock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useConnectedAccounts } from "@/hooks/useConnectedAccounts";
import { useCreateScheduledPost } from "@/hooks/useScheduledPosts";
import { useUploadVideo, useCreateVideo } from "@/hooks/useVideos";
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

export default function Upload() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: accounts, isLoading: accountsLoading } = useConnectedAccounts();
  const createScheduledPost = useCreateScheduledPost();
  const uploadVideo = useUploadVideo();
  const createVideo = useCreateVideo();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo de vídeo.",
          variant: "destructive",
        });
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleCutVideo = () => {
    toast({
      title: "Em desenvolvimento",
      description: "A funcionalidade de corte será implementada em breve.",
    });
  };

  const handlePreview = () => {
    toast({
      title: "Em desenvolvimento",
      description: "A funcionalidade de preview será implementada em breve.",
    });
  };

  const validateForm = () => {
    if (!videoFile) {
      toast({
        title: "Nenhum vídeo selecionado",
        description: "Faça upload de um vídeo para continuar.",
        variant: "destructive",
      });
      return false;
    }

    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Adicione um título ao seu vídeo.",
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

    if (isScheduled && !scheduledDate) {
      toast({
        title: "Data obrigatória",
        description: "Selecione uma data e hora para agendar.",
        variant: "destructive",
      });
      return false;
    }

    if (isScheduled && scheduledDate) {
      const minDate = new Date();
      minDate.setMinutes(minDate.getMinutes() + 5);
      if (scheduledDate < minDate) {
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

  const handlePublish = async () => {
    if (!validateForm() || !videoFile) return;

    setIsUploading(true);

    try {
      // Upload video to storage
      const fileUrl = await uploadVideo.mutateAsync(videoFile);

      if (isScheduled && scheduledDate) {
        // Create scheduled post
        await createScheduledPost.mutateAsync({
          video_file_url: fileUrl,
          video_name: videoFile.name,
          title,
          description: description || null,
          platforms: selectedPlatforms,
          scheduled_date: scheduledDate.toISOString(),
          video_id: null,
        });

        toast({
          title: "Vídeo agendado! 📅",
          description: `Será publicado em ${selectedPlatforms.length} plataforma(s).`,
        });
        
        resetForm();
        navigate("/scheduled");
      } else {
        // Create video record (publish now)
        await createVideo.mutateAsync({
          file_url: fileUrl,
          title,
          description: description || null,
          thumbnail_url: null,
          duration: null,
          status: "published",
        });

        toast({
          title: "Vídeo publicado! 🎉",
          description: `Publicado em ${selectedPlatforms.length} plataforma(s).`,
        });
        
        resetForm();
        navigate("/profile");
      }
    } catch (error) {
      toast({
        title: "Erro ao publicar",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setTitle("");
    setDescription("");
    setSelectedPlatforms([]);
    setIsScheduled(false);
    setScheduledDate(undefined);
  };

  const clearVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-foreground">
            <span className="gradient-text">Upload</span> de Vídeo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Selecione um vídeo e publique nas suas redes
          </p>
        </header>

        {/* Upload Area */}
        <div
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden",
            videoPreview
              ? "border-primary bg-card"
              : "border-border hover:border-primary/50 bg-secondary/30"
          )}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {videoPreview ? (
            <div className="relative aspect-video">
              <video
                src={videoPreview}
                className="w-full h-full object-cover"
                controls
              />
              <button
                onClick={clearVideo}
                className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Quick actions */}
              <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                <Button variant="glass" size="sm" className="flex-1" onClick={handleCutVideo}>
                  <Scissors className="w-4 h-4" />
                  Cortar
                </Button>
                <Button variant="glass" size="sm" className="flex-1" onClick={handlePreview}>
                  <Play className="w-4 h-4" />
                  Preview
                </Button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center py-16 cursor-pointer">
              <div className="p-4 rounded-full bg-primary/10 mb-4 animate-pulse-glow">
                <UploadIcon className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold text-foreground mb-1">
                Arraste seu vídeo aqui
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                ou clique para selecionar
              </p>
              <Button variant="outline" size="sm">
                Escolher arquivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Video Details */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
              <Type className="w-4 h-4" />
              Título
            </label>
            <Input
              placeholder="Adicione um título chamativo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {title.length}/100
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Descrição (opcional)
            </label>
            <Textarea
              placeholder="Descreva seu vídeo, adicione hashtags..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {description.length}/500
            </p>
          </div>
        </div>

        {/* Platform Selection */}
        <div>
          <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
            <Share2 className="w-4 h-4" />
            Publicar em
          </label>
          {accountsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {accounts?.map((account) => {
                const Icon = platformIcons[account.platform];
                return (
                  <div
                    key={account.id}
                    onClick={() => account.is_connected && handlePlatformToggle(account.platform)}
                    role="button"
                    tabIndex={account.is_connected ? 0 : -1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        account.is_connected && handlePlatformToggle(account.platform);
                      }
                    }}
                    className={cn(
                      "card-elevated p-4 flex items-center gap-3 transition-all duration-300 cursor-pointer",
                      selectedPlatforms.includes(account.platform) && "border-primary glow",
                      !account.is_connected && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Checkbox
                      checked={selectedPlatforms.includes(account.platform)}
                      disabled={!account.is_connected}
                      onCheckedChange={() => account.is_connected && handlePlatformToggle(account.platform)}
                    />
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium capitalize">{account.platform}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Schedule Toggle */}
        <div className="card-elevated p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Agendar publicação</p>
                <p className="text-sm text-muted-foreground">
                  Escolha quando publicar
                </p>
              </div>
            </div>
            <Switch checked={isScheduled} onCheckedChange={setIsScheduled} />
          </div>

          {isScheduled && (
            <DateTimePicker
              value={scheduledDate}
              onChange={setScheduledDate}
              minDate={new Date()}
            />
          )}
        </div>

        {/* Publish Button */}
        <Button
          variant="gradient"
          size="xl"
          className="w-full"
          onClick={handlePublish}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isScheduled ? "Agendando..." : "Publicando..."}
            </>
          ) : (
            <>
              {isScheduled ? (
                <>
                  <CalendarClock className="w-5 h-5" />
                  Agendar Publicação
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  Publicar Agora
                </>
              )}
            </>
          )}
        </Button>
      </div>
    </AppLayout>
  );
}
