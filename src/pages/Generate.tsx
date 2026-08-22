import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Wand2,
  Square,
  RectangleVertical,
  Smartphone,
  ArrowRight,
  Copy,
  Type,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type RatioKey = "1:1" | "4:5" | "9:16";
type ToneKey = "descontraido" | "profissional" | "vendas";
type TextPosition = "top" | "center" | "bottom";

const RATIOS: Record<RatioKey, { label: string; width: number; height: number; icon: typeof Square; className: string }> = {
  "1:1": { label: "Quadrado", width: 1024, height: 1024, icon: Square, className: "aspect-square" },
  "4:5": { label: "Vertical", width: 1024, height: 1280, icon: RectangleVertical, className: "aspect-[4/5]" },
  "9:16": { label: "Reels", width: 1024, height: 1820, icon: Smartphone, className: "aspect-[9/16]" },
};

const TONES: { key: ToneKey; label: string }[] = [
  { key: "descontraido", label: "Descontraído" },
  { key: "profissional", label: "Profissional" },
  { key: "vendas", label: "Vendas" },
];

type EngineKey = "flux" | "turbo" | "kontext";
type StyleKey = "ilustracao" | "pintura" | "foto";

const ENGINES: { key: EngineKey; label: string; hint: string }[] = [
  { key: "flux", label: "Flux", hint: "Realista" },
  { key: "turbo", label: "Turbo", hint: "Rápido" },
  { key: "kontext", label: "Kontext", hint: "Criativo" },
];

const STYLES: { key: StyleKey; label: string; hint: string }[] = [
  { key: "ilustracao", label: "Ilustração", hint: "Cinemática" },
  { key: "pintura", label: "Pintura", hint: "Clássica" },
  { key: "foto", label: "Foto", hint: "Realista" },
];

const TEXT_POSITIONS: { key: TextPosition; label: string; icon: typeof AlignVerticalJustifyCenter }[] = [
  { key: "top", label: "Topo", icon: AlignVerticalJustifyStart },
  { key: "center", label: "Meio", icon: AlignVerticalJustifyCenter },
  { key: "bottom", label: "Base", icon: AlignVerticalJustifyEnd },
];

function buildPollinationsUrl(prompt: string, ratio: RatioKey, seed: number, engine: EngineKey) {
  const { width, height } = RATIOS[ratio];
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    nologo: "true",
    enhance: "true",
    model: engine,
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

export default function Generate() {
  const [theme, setTheme] = useState("");
  const [tone, setTone] = useState<ToneKey>("descontraido");
  const [ratio, setRatio] = useState<RatioKey>("1:1");
  const [engine, setEngine] = useState<EngineKey>("flux");
  const [style, setStyle] = useState<StyleKey>("ilustracao");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);

  const [impactPhrase, setImpactPhrase] = useState("");
  const [textPosition, setTextPosition] = useState<TextPosition>("center");
  const [textSize, setTextSize] = useState([56]);
  const [textColor, setTextColor] = useState("#FFFFFF");

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  const fullDescription = [caption, hashtags.join(" ")].filter(Boolean).join("\n\n");

  const generate = async () => {
    if (theme.trim().length < 2) {
      toast({ title: "Informe um tema", description: "Escreva sobre o que a postagem deve falar.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-post", {
        body: {
          theme: theme.trim(),
          tone: aiSettings?.tone ?? tone,
          ratio,
          style,
          settings: aiSettings
            ? {
                enabled: aiSettings.enabled,
                captionLength: aiSettings.caption_length,
                useEmoji: aiSettings.use_emoji,
                hashtagCount: aiSettings.hashtag_count,
                cta: aiSettings.cta || undefined,
                extraInstructions: aiSettings.extra_instructions || undefined,
              }
            : undefined,
        },
      });


      if (error) {
        const contextMessage = await (async () => {
          try {
            const body = await (error as { context?: Response }).context?.clone().json();
            return body?.error as string | undefined;
          } catch {
            return undefined;
          }
        })();
        throw new Error(contextMessage || error.message);
      }
      if (data?.error) throw new Error(data.error);

      setImagePrompt(data.imagePrompt);
      setTitle(data.title);
      setCaption(data.caption);
      setHashtags(Array.isArray(data.hashtags) ? data.hashtags : []);
      setIsImageLoading(true);
      setImageLoaded(false);
      setImageUrl(buildPollinationsUrl(data.imagePrompt, ratio, Math.floor(Math.random() * 1_000_000), engine));

      if (data.notice) {
        toast({ title: "Modo simples", description: data.notice });
      }

    } catch (error) {
      toast({
        title: "Não foi possível gerar",
        description: error instanceof Error ? error.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateImage = () => {
    if (!imagePrompt) return;
    setIsImageLoading(true);
    setImageLoaded(false);
    setImageUrl(buildPollinationsUrl(imagePrompt, ratio, Math.floor(Math.random() * 1_000_000), engine));
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete || !img.naturalWidth) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.drawImage(img, 0, 0);

    const phrase = impactPhrase.trim();
    if (!phrase) return;

    const baseSize = Math.max(16, textSize[0]);
    const fontSize = Math.min(baseSize, canvas.width / 6);
    const padding = canvas.width * 0.08;
    const maxWidth = canvas.width - padding * 2;

    ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";

    const words = phrase.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = fontSize * 1.15;
    const totalHeight = lines.length * lineHeight;
    let startY = canvas.height / 2 - totalHeight / 2 + lineHeight / 2;
    if (textPosition === "top") startY = canvas.height * 0.12 + lineHeight / 2;
    if (textPosition === "bottom") startY = canvas.height * 0.88 - totalHeight + lineHeight / 2;

    const shadowBlur = fontSize * 0.25;
    const strokeWidth = Math.max(2, fontSize * 0.06);

    lines.forEach((line, i) => {
      const y = startY + i * lineHeight;

      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = fontSize * 0.04;

      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.lineWidth = strokeWidth;
      ctx.strokeText(line, canvas.width / 2, y);

      ctx.shadowColor = "transparent";
      ctx.fillStyle = textColor;
      ctx.fillText(line, canvas.width / 2, y);
    });
  };

  useEffect(() => {
    renderCanvas();
  }, [imageUrl, impactPhrase, textPosition, textSize, textColor]);

  const usePost = async () => {
    if (!canvasRef.current) return;
    setIsPreparing(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvasRef.current?.toBlob(resolve, "image/jpeg", 0.92);
      });
      if (!blob) throw new Error("Falha ao processar a imagem final.");

      const file = new File([blob], `gerado-${Date.now()}.jpg`, { type: "image/jpeg" });

      navigate("/upload", {
        state: {
          generated: {
            file,
            title,
            description: fullDescription,
            ratio,
          },
        },
      });
    } catch (error) {
      toast({
        title: "Erro ao preparar a postagem",
        description: error instanceof Error ? error.message : "Tente gerar a imagem novamente.",
        variant: "destructive",
      });
    } finally {
      setIsPreparing(false);
    }
  };

  const copyCaption = async () => {
    await navigator.clipboard.writeText([title, fullDescription].filter(Boolean).join("\n\n"));
    toast({ title: "Legenda copiada" });
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
        <header className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/20 glow">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Gerador de postagens</h1>
            <p className="text-xs text-muted-foreground">Tema → imagem + legenda pronta</p>
          </div>
        </header>

        <div className="glass rounded-2xl p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tema</label>
            <Input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex: café da manhã saudável"
              maxLength={300}
              onKeyDown={(e) => {
                if (e.key === "Enter") generate();
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tom da legenda</label>
            <div className="grid grid-cols-3 gap-2">
              {TONES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTone(t.key)}
                  className={cn(
                    "py-2 rounded-xl text-xs font-medium border transition-all",
                    tone === t.key
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Formato</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(RATIOS) as RatioKey[]).map((key) => {
                const Icon = RATIOS[key].icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRatio(key)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium border transition-all",
                      ratio === key
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border/50 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {key}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Motor de imagem (grátis)</label>
            <div className="grid grid-cols-3 gap-2">
              {ENGINES.map((e) => (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => setEngine(e.key)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium border transition-all",
                    engine === e.key
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {e.label}
                  <span className="text-[10px] opacity-70">{e.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estilo da imagem</label>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStyle(s.key)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium border transition-all",
                    style === s.key
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s.label}
                  <span className="text-[10px] opacity-70">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={generate} disabled={isGenerating} className="w-full gap-2">
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {isGenerating ? "Gerando..." : "Gerar postagem"}
          </Button>
        </div>

        {imageUrl && (
          <div className="glass rounded-2xl p-4 space-y-4">
            <div className={cn("relative w-full max-w-[350px] mx-auto overflow-hidden rounded-xl bg-muted", RATIOS[ratio].className)}>
              <img
                ref={imgRef}
                src={imageUrl}
                alt={`Imagem gerada sobre ${theme}`}
                className="hidden"
                crossOrigin="anonymous"
                onLoad={() => {
                  setIsImageLoading(false);
                  setImageLoaded(true);
                  renderCanvas();
                }}
                onError={() => {
                  setIsImageLoading(false);
                  setImageLoaded(false);
                  toast({
                    title: "A imagem não carregou",
                    description: "O serviço gratuito pode estar ocupado. Toque em regenerar.",
                    variant: "destructive",
                  });
                }}
              />
              <canvas
                ref={canvasRef}
                className={cn("w-full h-full object-cover transition-all duration-500", isImageLoading && "blur-lg scale-105")}
              />
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
            </div>

            <div className="space-y-3 border border-border/40 rounded-xl p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Type className="w-4 h-4 text-primary" />
                Frase de impacto na imagem
              </div>
              <Input
                value={impactPhrase}
                onChange={(e) => setImpactPhrase(e.target.value)}
                placeholder="Ex: Você não vai acreditar no que aconteceu..."
                maxLength={120}
              />

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Posição do texto</label>
                <div className="grid grid-cols-3 gap-2">
                  {TEXT_POSITIONS.map((pos) => {
                    const Icon = pos.icon;
                    return (
                      <button
                        key={pos.key}
                        type="button"
                        onClick={() => setTextPosition(pos.key)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all",
                          textPosition === pos.key
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border/50 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {pos.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tamanho da fonte</span>
                  <span>{textSize[0]}px</span>
                </div>
                <Slider value={textSize} onValueChange={setTextSize} min={20} max={120} step={4} />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Cor do texto</label>
                <div className="flex items-center gap-3">
                  {["#FFFFFF", "#FEF08A", "#F9A8D4", "#000000"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setTextColor(color)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        textColor === color ? "border-primary scale-110" : "border-transparent",
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Cor ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt da imagem (inglês)</label>
              <Textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={3}
                className="text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Ajuste o prompt e toque em "Imagem" para gerar de novo.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={regenerateImage}>
                <RefreshCw className="w-4 h-4" /> Imagem
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={generate} disabled={isGenerating}>
                <RefreshCw className="w-4 h-4" /> Legenda
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={copyCaption}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Legenda</label>
                <span className="text-xs text-muted-foreground">
                  {title.length + fullDescription.length + 2}/2200
                </span>
              </div>
              <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={6} />
            </div>

            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <Button onClick={usePost} disabled={isPreparing || isImageLoading || !imageLoaded} className="w-full gap-2">
              {isPreparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Usar nesta postagem
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
