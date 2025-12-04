import { useState, useRef } from "react";
import { Upload as UploadIcon, X, Play, Scissors, Type, Share2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  FacebookIcon,
} from "@/components/icons/SocialIcons";
import { cn } from "@/lib/utils";

const platforms = [
  { id: "instagram", name: "Instagram", icon: InstagramIcon, connected: true },
  { id: "tiktok", name: "TikTok", icon: TikTokIcon, connected: true },
  { id: "youtube", name: "YouTube", icon: YouTubeIcon, connected: false },
  { id: "facebook", name: "Facebook", icon: FacebookIcon, connected: false },
];

export default function Upload() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "tiktok"]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  const handlePublish = () => {
    if (!videoFile) {
      toast({
        title: "Nenhum vídeo selecionado",
        description: "Faça upload de um vídeo para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Adicione um título ao seu vídeo.",
        variant: "destructive",
      });
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast({
        title: "Selecione uma plataforma",
        description: "Escolha pelo menos uma rede social.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      toast({
        title: "Vídeo publicado! 🎉",
        description: `Publicado em ${selectedPlatforms.length} plataforma(s).`,
      });
      // Reset form
      setVideoFile(null);
      setVideoPreview(null);
      setTitle("");
      setDescription("");
    }, 2000);
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
                <Button variant="glass" size="sm" className="flex-1">
                  <Scissors className="w-4 h-4" />
                  Cortar
                </Button>
                <Button variant="glass" size="sm" className="flex-1">
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
          <div className="grid grid-cols-2 gap-3">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => platform.connected && handlePlatformToggle(platform.id)}
                disabled={!platform.connected}
                className={cn(
                  "card-elevated p-4 flex items-center gap-3 transition-all duration-300",
                  selectedPlatforms.includes(platform.id) && "border-primary glow",
                  !platform.connected && "opacity-50 cursor-not-allowed"
                )}
              >
                <Checkbox
                  checked={selectedPlatforms.includes(platform.id)}
                  disabled={!platform.connected}
                />
                <platform.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{platform.name}</span>
              </button>
            ))}
          </div>
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
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Publicando...
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5" />
              Publicar Agora
            </>
          )}
        </Button>
      </div>
    </AppLayout>
  );
}
