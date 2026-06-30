import { useState, useRef, useEffect } from "react";
import { Upload as UploadIcon, X, Play, Scissors, Type, Share2, CalendarClock, Loader2, ChevronLeft, ChevronRight, Images, Square, RectangleVertical, Smartphone, Monitor } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  FacebookIcon,
} from "@/components/icons/SocialIcons";
import { cn } from "@/lib/utils";
import { brasiliaToUTC } from "@/lib/timezone";

const platformIcons: Record<string, typeof InstagramIcon> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  facebook: FacebookIcon,
};

// Instagram aspect ratios with dimensions
type AspectRatioKey = "1:1" | "4:5" | "9:16" | "16:9";

const ASPECT_RATIOS: Record<AspectRatioKey, { 
  label: string; 
  width: number; 
  height: number; 
  icon: typeof Square;
  description: string;
  tailwindClass: string;
}> = {
  "1:1": { label: "Quadrado", width: 1080, height: 1080, icon: Square, description: "Feed", tailwindClass: "aspect-square" },
  "4:5": { label: "Vertical", width: 1080, height: 1350, icon: RectangleVertical, description: "Feed", tailwindClass: "aspect-[4/5]" },
  "9:16": { label: "Reels/Stories", width: 1080, height: 1920, icon: Smartphone, description: "Reels/Stories", tailwindClass: "aspect-[9/16]" },
  "16:9": { label: "Paisagem", width: 1920, height: 1080, icon: Monitor, description: "Horizontal", tailwindClass: "aspect-video" },
};

// Caption limits for Instagram
const MAX_CAPTION_LENGTH = 2200;

// File size limits - Instagram supports up to 4GB but we limit to 1GB for practical upload
const MAX_VIDEO_SIZE_MB = 1024; // 1GB - covers Reels (650MB) and most feed videos
const MAX_IMAGE_SIZE_MB = 10;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_CAROUSEL_IMAGES = 10;
const LARGE_FILE_WARNING_MB = 500; // Warn user about long upload times

export default function Upload() {
  // Support for multiple files (carousel)
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<"video" | "image" | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioKey>("1:1");
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [autoPostAll, setAutoPostAll] = useState(() => {
    return localStorage.getItem('autoPostAll') === 'true';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate total caption length
  const captionLength = title.length + (description ? 2 + description.length : 0); // +2 for "\n\n"
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: accounts, isLoading: accountsLoading } = useConnectedAccounts();
  const { user } = useAuth();
  const createScheduledPost = useCreateScheduledPost();
  const uploadVideo = useUploadVideo();
  const createVideo = useCreateVideo();

  // Get connected accounts
  const connectedAccounts = accounts?.filter(a => a.is_connected) || [];
  const connectedCount = connectedAccounts.length;

  // Auto-select all connected platforms when autoPostAll is enabled
  useEffect(() => {
    if (autoPostAll && connectedAccounts.length > 0) {
      const connectedPlatforms = connectedAccounts.map(a => a.platform);
      setSelectedPlatforms(connectedPlatforms);
    }
  }, [autoPostAll, accounts]);

  // Handle auto-post toggle change with persistence
  const handleAutoPostChange = (value: boolean) => {
    setAutoPostAll(value);
    localStorage.setItem('autoPostAll', String(value));
    if (!value) {
      setSelectedPlatforms([]);
    }
  };

  const isValidMediaFile = (file: File) => {
    return file.type.startsWith("video/") || file.type.startsWith("image/");
  };

  const getMediaType = (file: File): "video" | "image" => {
    return file.type.startsWith("video/") ? "video" : "image";
  };

  const validateFileSize = (file: File): { valid: boolean; error?: string; isLarge?: boolean } => {
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    const maxSizeMB = isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB;
    const fileSizeMB = file.size / (1024 * 1024);
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `O arquivo é muito grande. Máximo permitido: ${isVideo ? '1GB' : maxSizeMB + 'MB'} para ${isVideo ? 'vídeos' : 'imagens'}.`
      };
    }
    return { valid: true, isLarge: fileSizeMB > LARGE_FILE_WARNING_MB };
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
    let hasLargeFile = false;
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
      if (sizeValidation.isLarge) hasLargeFile = true;
    }

    // Warn about large files
    if (hasLargeFile) {
      toast({
        title: "Arquivo grande detectado",
        description: "O upload pode demorar alguns minutos. Por favor, aguarde.",
      });
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

    let hasLargeFile = false;
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
      if (sizeValidation.isLarge) hasLargeFile = true;
    }

    if (hasLargeFile) {
      toast({
        title: "Arquivo grande detectado",
        description: "O upload pode demorar alguns minutos. Por favor, aguarde.",
      });
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
        // Convert to UTC for storage (user selects in Brasília time)
        const utcDate = brasiliaToUTC(scheduledDate);
        
        // Create scheduled post with carousel support
        await createScheduledPost.mutateAsync({
          video_file_url: primaryUrl,
          video_name: primaryFileName,
          title,
          description: description || null,
          platforms: selectedPlatforms,
          scheduled_date: utcDate.toISOString(),
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
        // Publish immediately to each platform
        const caption = title + (description ? "\n\n" + description : "");
        
        for (const platform of selectedPlatforms) {
          const functionName =
            platform === "youtube"
              ? "youtube-publish"
              : platform === "tiktok"
              ? "tiktok-publish"
              : "meta-publish";

          const body =
            platform === "youtube"
              ? {
                  userId: user?.id,
                  videoUrl: primaryUrl,
                  title,
                  description: description || "",
                }
              : platform === "tiktok"
              ? {
                  userId: user?.id,
                  videoUrl: primaryUrl,
                  caption,
                }
              : {
                  userId: user?.id,
                  platform,
                  videoUrl: primaryUrl,
                  mediaUrls: uploadedUrls.length > 1 ? uploadedUrls : undefined,
                  caption,
                  mediaType,
                };

          const { data, error } = await supabase.functions.invoke(functionName, { body });

          if (error) {
            console.error(`Error publishing to ${platform}:`, error);
            throw new Error(`Erro ao publicar em ${platform}`);
          }
          console.log(`Published to ${platform}:`, data);
        }

        // Create video record for history
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
    setSelectedRatio("1:1");
    setTitle("");
    setDescription("");
    setSelectedPlatforms([]);
    setIsScheduled(false);
    setScheduledDate(undefined);
    // Don't reset autoPostAll - keep user preference
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
            <div className="flex justify-center p-4">
              <div 
                className={cn(
                  "relative w-full rounded-xl overflow-hidden bg-black/50 transition-all duration-300",
                  selectedRatio === "9:16" ? "max-w-[200px]" : "max-w-sm",
                  ASPECT_RATIOS[selectedRatio].tailwindClass
                )}
                style={{ maxHeight: selectedRatio === "9:16" ? "400px" : "350px" }}
              >
                {mediaType === "video" ? (
                  <video
                    src={mediaPreviews[0]}
                    className="w-full h-full object-contain"
                    controls
                  />
                ) : (
                  <img
                    src={mediaPreviews[carouselIndex]}
                    className="w-full h-full object-cover"
                    alt="Preview"
                  />
                )}

                {/* Safe zone indicator for Reels/Stories (9:16) */}
                {selectedRatio === "9:16" && (
                  <>
                    <div className="absolute inset-x-0 top-0 h-[12%] bg-black/40 pointer-events-none flex items-center justify-center">
                      <span className="text-[10px] text-white/60">Zona de corte</span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-[15%] bg-black/40 pointer-events-none flex items-center justify-center">
                      <span className="text-[10px] text-white/60">Zona de corte</span>
                    </div>
                  </>
                )}
                
                {/* Close button */}
                <button
                  onClick={clearMedia}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Carousel navigation */}
                {isCarousel && (
                  <>
                    <button
                      onClick={() => setCarouselIndex(i => Math.max(0, i - 1))}
                      disabled={carouselIndex === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background disabled:opacity-50 transition-all z-10"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCarouselIndex(i => Math.min(mediaPreviews.length - 1, i + 1))}
                      disabled={carouselIndex === mediaPreviews.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background disabled:opacity-50 transition-all z-10"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    
                    {/* Carousel counter */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm flex items-center gap-1.5 text-xs z-10">
                      <Images className="w-3 h-3" />
                      <span className="font-medium">{carouselIndex + 1}/{mediaPreviews.length}</span>
                    </div>

                    {/* Remove current image */}
                    <button
                      onClick={() => removeImage(carouselIndex)}
                      className="absolute top-2 left-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive transition-colors z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                
                {/* Quick actions - only for videos */}
                {mediaType === "video" && (
                  <div className="absolute bottom-2 left-2 right-2 flex gap-2 z-10">
                    <Button variant="glass" size="sm" className="flex-1 h-8 text-xs" onClick={handleCutVideo}>
                      <Scissors className="w-3 h-3" />
                      Cortar
                    </Button>
                    <Button variant="glass" size="sm" className="flex-1 h-8 text-xs" onClick={handlePreview}>
                      <Play className="w-3 h-3" />
                      Preview
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div 
              className="flex flex-col items-center justify-center py-10 cursor-pointer"
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
          <div className="flex gap-1.5 justify-center overflow-x-auto pb-2">
            {mediaPreviews.map((preview, index) => (
              <button
                key={index}
                onClick={() => setCarouselIndex(index)}
                className={cn(
                  "relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all",
                  carouselIndex === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <img src={preview} alt={`Imagem ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Aspect Ratio Selector */}
        {mediaPreviews.length > 0 && (
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              Formato
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(ASPECT_RATIOS) as [AspectRatioKey, typeof ASPECT_RATIOS["1:1"]][]).map(([key, ratio]) => {
                const Icon = ratio.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedRatio(key)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                      selectedRatio === key 
                        ? "border-primary bg-primary/10" 
                        : "border-border bg-secondary/30 hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", selectedRatio === key ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-xs font-medium", selectedRatio === key ? "text-primary" : "text-muted-foreground")}>
                      {ratio.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{key}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {ASPECT_RATIOS[selectedRatio].width} × {ASPECT_RATIOS[selectedRatio].height}px
            </p>
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
              maxLength={150}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Descrição (opcional)
            </label>
            <Textarea
              placeholder="Descreva seu conteúdo, adicione hashtags..."
              value={description}
              onChange={(e) => {
                const newDesc = e.target.value;
                const newTotal = title.length + (newDesc ? 2 + newDesc.length : 0);
                if (newTotal <= MAX_CAPTION_LENGTH) {
                  setDescription(newDesc);
                }
              }}
              rows={3}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-muted-foreground">
                Título + Descrição
              </p>
              <p className={cn(
                "text-xs",
                captionLength > MAX_CAPTION_LENGTH - 200 
                  ? captionLength > MAX_CAPTION_LENGTH - 50 
                    ? "text-destructive font-medium" 
                    : "text-yellow-500"
                  : "text-muted-foreground"
              )}>
                {captionLength.toLocaleString()} / {MAX_CAPTION_LENGTH.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Platform Selection */}
        <div>
          <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
            <Share2 className="w-4 h-4" />
            Publicar em
          </label>
          
          {/* Auto-Post All Toggle */}
          {!accountsLoading && connectedCount > 0 && (
            <div className="flex items-center justify-between p-3 mb-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" />
                <div>
                  <span className="text-sm font-medium text-foreground">Publicar em todas</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({connectedCount} {connectedCount === 1 ? 'conectada' : 'conectadas'})
                  </span>
                </div>
              </div>
              <Switch 
                checked={autoPostAll} 
                onCheckedChange={handleAutoPostChange} 
              />
            </div>
          )}

          {accountsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {accounts?.map((account) => {
                const Icon = platformIcons[account.platform];
                const isSelected = selectedPlatforms.includes(account.platform);
                const isDisabled = !account.is_connected;
                
                const handleClick = () => {
                  if (isDisabled) return;
                  if (autoPostAll) {
                    setAutoPostAll(false);
                    localStorage.setItem('autoPostAll', 'false');
                    setSelectedPlatforms([account.platform]);
                  } else {
                    handlePlatformToggle(account.platform);
                  }
                };

                return (
                  <div
                    key={account.id}
                    onClick={handleClick}
                    role="button"
                    tabIndex={!isDisabled ? 0 : -1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleClick();
                      }
                    }}
                    className={cn(
                      "card-elevated p-4 flex items-center gap-3 transition-all duration-300",
                      isSelected && "border-primary glow",
                      !account.is_connected && "opacity-50 cursor-not-allowed",
                      account.is_connected && "cursor-pointer",
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={handleClick}
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
