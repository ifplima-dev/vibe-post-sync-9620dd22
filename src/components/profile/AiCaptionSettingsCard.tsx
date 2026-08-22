import { useEffect, useState } from "react";
import { Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AiCaptionSettings,
  CaptionLength,
  CaptionTone,
  defaultAiCaptionSettings,
  useAiCaptionSettings,
  useUpdateAiCaptionSettings,
} from "@/hooks/useAiCaptionSettings";

const TONES: { key: CaptionTone; label: string }[] = [
  { key: "descontraido", label: "Descontraído" },
  { key: "profissional", label: "Profissional" },
  { key: "vendas", label: "Vendas" },
];

const LENGTHS: { key: CaptionLength; label: string }[] = [
  { key: "curta", label: "Curta" },
  { key: "media", label: "Média" },
  { key: "longa", label: "Longa" },
];

export function AiCaptionSettingsCard() {
  const { data, isLoading } = useAiCaptionSettings();
  const { mutateAsync, isPending } = useUpdateAiCaptionSettings();
  const { toast } = useToast();
  const [form, setForm] = useState<AiCaptionSettings>(defaultAiCaptionSettings);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = async () => {
    try {
      await mutateAsync(form);
      toast({
        title: "Configuração salva",
        description: "As legendas serão geradas com essas preferências.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-3">Legendas com IA (GPT)</h2>

      <div className="card-elevated p-4 space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Gerar legendas com GPT</p>
                  <p className="text-xs text-muted-foreground">
                    Quando desligado, o gerador cria legendas simples sem IA.
                  </p>
                </div>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(enabled) => setForm((f) => ({ ...f, enabled }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tom padrão</Label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, tone: t.key }))}
                    className={cn(
                      "py-2 rounded-lg text-xs font-medium border transition-colors",
                      form.tone === t.key
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Tamanho da legenda</Label>
              <div className="grid grid-cols-3 gap-2">
                {LENGTHS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, caption_length: l.key }))}
                    className={cn(
                      "py-2 rounded-lg text-xs font-medium border transition-colors",
                      form.caption_length === l.key
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm text-foreground">Usar emojis</Label>
              <Switch
                checked={form.use_emoji}
                onCheckedChange={(use_emoji) => setForm((f) => ({ ...f, use_emoji }))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Hashtags por post</Label>
                <span className="text-xs text-foreground">{form.hashtag_count}</span>
              </div>
              <Slider
                value={[form.hashtag_count]}
                min={0}
                max={20}
                step={1}
                onValueChange={([hashtag_count]) => setForm((f) => ({ ...f, hashtag_count }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Chamada para ação (CTA)</Label>
              <Input
                value={form.cta ?? ""}
                maxLength={140}
                placeholder="Ex: Chame no direct para saber mais"
                onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Instruções extras para a IA</Label>
              <Textarea
                value={form.extra_instructions ?? ""}
                maxLength={500}
                rows={3}
                placeholder="Ex: fale sempre na primeira pessoa, evite gírias, cite versículos"
                onChange={(e) => setForm((f) => ({ ...f, extra_instructions: e.target.value }))}
              />
            </div>

            <Button variant="gradient" className="w-full gap-2" onClick={save} disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar configuração
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
