import { useState, useRef } from "react";
import { Upload as UploadIcon, X, Play, Scissors, Type, Share2, CalendarClock, Loader2, ChevronLeft, ChevronRight, Images } from "lucide-react";
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
import { compressImage, compressImages } from "@/hooks/useImageCompression";
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

// File size limits
const MAX_VIDEO_SIZE_MB = 100;
const MAX_IMAGE_SIZE_MB = 10;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_CAROUSEL_IMAGES = 10;

export default function Upload() {
  // Support for multiple files (carousel)
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"video" | "image" | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  
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

  const isValidMediaFile = (file: File) => {
    return file.type.startsWith("video/") || file.type.startsWith("image/");
  };

  const getMediaType = (file: File): "video" | "image" => {
    return file.type.startsWith("video/") ? "video" : "image";
  };

  const validateFileSize = (file: File): { valid: boolean; error?: string } => {
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    const maxSizeMB = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `O arquivo é muito grande. Máximo permitido: ${maxSizeMB}MB para ${isVideo ? 'vídeos' : 'imagens'}.`
      };
    }
    return { valid: true };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check if mixing videos and images
    const hasVideos = files.some(f => f.type.startsWith("video/"));
    const hasImages = files.some(f => f.type.startsWith("image/"));
    
    if (hasVideos && hasImages) {
      toast({
        title: "Tipo de mídia inválido",
        description: "Selecione apenas vídeos ou apenas imagens.",
        variant: "destructive",
      });
      return;
    }

    // If video, only allow one
    if (hasVideos && files.length > 1) {
      toast({
        title: "Apenas um vídeo",
        description: "Selecione apenas um vídeo por vez.",
        variant: "destructive",
      });
      return;
    }

    // Check carousel limit for images
    if (hasImages && files.length > MAX_CAROUSEL_IMAGES) {
      toast({
        title: "Limite de imagens",
        description: `Máximo de ${MAX_CAROUSEL_IMAGES} imagens por carrossel.`,
        variant: "destructive",
      });
      return;
    }

    // Validate all files
    for (const file of files) {
      if (!isValidMediaFile(file)) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione arquivos de vídeo ou imagem.",
          variant: "destructive",
        });
        return;
      }
      
      const sizeValidation = validateFileSize(file);
      if (!sizeValidation.valid) {
        toast({
          title: "Arquivo muito grande",
          description: sizeValidation.error,
          variant: "destructive",
        });
        return;
      }
    }

    // Compress images if needed
    let processedFiles = files;
    if (hasImages) {
      setIsCompressing(true);
      try {
        processedFiles = await compressImages(files);
        toast({
          title: "Imagens otimizadas",
          description: "Suas imagens foram comprimidas automaticamente.",
        });
      } catch (error) {
        console.error("Compression error:", error);
      } finally {
        setIsCompressing(false);
      }
    }

    // Set state
    setMediaFiles(processedFiles);
    setMediaPreviews(processedFiles.map(f => URL.createObjectURL(f)));
    setMediaType(getMediaType(processedFiles[0]));
    setCarouselIndex(0);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    // Reuse same logic
    const hasVideos = files.some(f => f.type.startsWith("video/"));
    const hasImages = files.some(f => f.type.startsWith("image/"));
    
    if (hasVideos && hasImages) {
      toast({
        title: "Tipo de mídia inválido",
        description: "Selecione apenas vídeos ou apenas imagens.",
        variant: "destructive",
      });
      return;
    }

    if (hasVideos && files.length > 1) {
      toast({
        title: "Apenas um vídeo",
        description: "Selecione apenas um vídeo por vez.",
        variant: "destructive",
      });
      return;
    }

    if (hasImages && files.length > MAX_CAROUSEL_IMAGES) {
      toast({
        title: "Limite de imagens",
        description: `Máximo de ${MAX_CAROUSEL_IMAGES} imagens por carrossel.`,
        variant: "destructive",
      });
      return;
    }

    for (const file of files) {
      if (!isValidMediaFile(file)) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione arquivos de vídeo ou imagem.",
          variant: "destructive",
        });
        return;
      }
      
      const sizeValidation = validateFileSize(file);
      if (!sizeValidation.valid) {
        toast({
          title: "Arquivo muito grande",
          description: sizeValidation.error,
          variant: "destructive",
        });
        return;
      }
    }

    let processedFiles = files;
    if (hasImages) {
      setIsCompressing(true);
      try {
        processedFiles = await compressImages(files);
        toast({
          title: "Imagens otimizadas",
          description: "Suas imagens foram comprimidas automaticamente.",
        });
      } catch (error) {
        console.error("Compression error:", error);
      } finally {
        setIsCompressing(false);
      }
    }

    setMediaFiles(processedFiles);
    setMediaPreviews(processedFiles.map(f => URL.createObjectURL(f)));
    setMediaType(getMediaType(processedFiles[0]));
    setCarouselIndex(0);
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

  const removeImage = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    if (carouselIndex >= mediaFiles.length - 1) {
      setCarouselIndex(Math.max(0, mediaFiles.length - 2));
    }
    if (mediaFiles.length === 1) {
      setMediaType(null);
    }
  };

  const validateForm = () => {
    if (mediaFiles.length === 0) {
      toast({
        title: "Nenhuma mídia selecionada",
        description: "Faça upload de um vídeo ou imagem para continuar.",
        variant: "destructive",
      });
      return false;
    }

    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Adicione um título ao seu conteúdo.",
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
    if (!validateForm() || mediaFiles.length === 0) return;

    setIsUploading(true);

    try {
      // Upload all media files
      const uploadedUrls: string[] = [];
      for (const file of mediaFiles) {
        const fileUrl = await uploadVideo.mutateAsync(file);
        uploadedUrls.push(fileUrl);
      }

      const primaryUrl = uploadedUrls[0];
      const primaryFileName = mediaFiles[0].name;

      if (isScheduled && scheduledDate) {
        // Create scheduled post with carousel support
        await createScheduledPost.mutateAsync({
          video_file_url: primaryUrl,
          video_name: primaryFileName,
          title,
          description: description || null,
          platforms: selectedPlatforms,
          scheduled_date: scheduledDate.toISOString(),
          video_id: null,
          media_urls: uploadedUrls.length > 1 ? uploadedUrls : null,
          media_type: mediaType,
        });

        toast({
          title: mediaType === "image" ? "Imagem agendada! 📅" : "Vídeo agendado! 📅",
          description: `Será publicado em ${selectedPlatforms.length} plataforma(s).`,
        });
        
        resetForm();
        navigate("/scheduled");
      } else {
        // Create video record (publish now)
        await createVideo.mutateAsync({
          file_url: primaryUrl,
          title,
          description: description || null,
          thumbnail_url: null,
          duration: null,
          status: "published",
        });

        toast({
          title: mediaType === "image" ? "Imagem publicada! 🎉" : "Vídeo publicado! 🎉",
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
    setMediaFiles([]);
    setMediaPreviews([]);
    setMediaType(null);
    setCarouselIndex(0);
    setTitle("");
    setDescription("");
    setSelectedPlatforms([]);
    setIsScheduled(false);
    setScheduledDate(undefined);
  };

  const clearMedia = () => {
    setMediaFiles([]);
    setMediaPreviews([]);
    setMediaType(null);
    setCarouselIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isCarousel = mediaPreviews.length > 1;

  return (
    <AppLayout>
      <div className="px-4 pt-6 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-foreground">
            <span className="gradient-text">Upload</span> de Mídia
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Selecione um vídeo ou até {MAX_CAROUSEL_IMAGES} imagens para carrossel
          </p>
        </header>

        {/* Upload Area */}
        <div
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden",
            mediaPreviews.length > 0
              ? "border-primary bg-card"
              : "border-border hover:border-primary/50 bg-secondary/30"
          )}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {mediaPreviews.length > 0 ? (
            <div className="relative aspect-video">
              {mediaType === "video" ? (
                <video
                  src={mediaPreviews[0]}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <img
                  src={mediaPreviews[carouselIndex]}
                  className="w-full h-full object-cover"
                  alt="Preview"
                />
              )}
              
              {/* Close button */}
              <button
                onClick={clearMedia}
                className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Carousel navigation */}
              {isCarousel && (
                <>
                  <button
                    onClick={() => setCarouselIndex(i => Math.max(0, i - 1))}
                    disabled={carouselIndex === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background disabled:opacity-50 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCarouselIndex(i => Math.min(mediaPreviews.length - 1, i + 1))}
                    disabled={carouselIndex === mediaPreviews.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background disabled:opacity-50 transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  
                  {/* Carousel counter */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm flex items-center gap-2">
                    <Images className="w-4 h-4" />
                    <span className="text-sm font-medium">{carouselIndex + 1} / {mediaPreviews.length}</span>
                  </div>

                  {/* Remove current image */}
                  <button
                    onClick={() => removeImage(carouselIndex)}
                    className="absolute top-3 left-3 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
              
              {/* Quick actions - only for videos */}
              {mediaType === "video" && (
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
              )}
            </div>
          ) : (
            <div 
              className="flex flex-col items-center justify-center py-16 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {isCompressing ? (
                <>
                  <div className="p-4 rounded-full bg-primary/10 mb-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <p className="font-semibold text-foreground mb-1">
                    Comprimindo imagens...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Aguarde um momento
                  </p>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-full bg-primary/10 mb-4 animate-pulse-glow">
                    <UploadIcon className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground mb-1">
                    Arraste sua mídia aqui
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Vídeos: máx. {MAX_VIDEO_SIZE_MB}MB | Imagens: máx. {MAX_IMAGE_SIZE_MB}MB (até {MAX_CAROUSEL_IMAGES} imagens)
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Escolher arquivo
                  </Button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Carousel thumbnail strip */}
        {isCarousel && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {mediaPreviews.map((preview, index) => (
              <button
                key={index}
                onClick={() => setCarouselIndex(index)}
                className={cn(
                  "relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all",
                  carouselIndex === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <img src={preview} alt={`Imagem ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

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
              placeholder="Descreva seu conteúdo, adicione hashtags..."
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
          disabled={isUploading || isCompressing}
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
                  Agendar
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

        {/* Spacing for bottom nav */}
        <div className="h-4" />
      </div>
    </AppLayout>
  );
}
