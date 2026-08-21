import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Youtube, ArrowLeft, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function YouTubeTest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const origin = "https://vibe-post-sync.lovable.app";
  const redirectUri = `${origin}/auth/callback`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: `${label} copiado para a área de transferência.` });
  };

  const handleTest = async () => {
    setIsLoading(true);
    setLastError(null);
    try {
      console.log("[YouTubeTest] Requesting auth URL with redirectUri:", redirectUri);
      const { data, error } = await supabase.functions.invoke("youtube-auth-url", {
        body: { redirectUri },
      });
      if (error) throw error;
      if (!data?.authUrl) throw new Error("authUrl não retornado pela edge function");

      console.log("[YouTubeTest] authUrl recebido. Redirecionando...");
      sessionStorage.setItem("youtube_oauth_state", data.state);
      sessionStorage.setItem("youtube_test_mode", "1");
      window.location.href = data.authUrl;
    } catch (err: any) {
      console.error("[YouTubeTest] Erro:", err);
      setLastError(err.message || "Erro desconhecido");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/profile")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Youtube className="w-7 h-7 text-red-500" />
            Teste OAuth YouTube
          </h1>
          <p className="text-muted-foreground">
            Use este painel para iniciar o fluxo OAuth e diagnosticar problemas de configuração no Google Cloud Console.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold">Configuração esperada no Google Cloud</h2>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Origens JavaScript autorizadas (sem caminho, sem barra no final):
            </p>
            <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 border border-border">
              <code className="text-xs flex-1 break-all">{origin}</code>
              <Button size="icon" variant="ghost" onClick={() => copy(origin, "Origem")}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              URI de redirecionamento autorizado:
            </p>
            <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 border border-border">
              <code className="text-xs flex-1 break-all">{redirectUri}</code>
              <Button size="icon" variant="ghost" onClick={() => copy(redirectUri, "Redirect URI")}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            O OAuth do YouTube usa sempre estes valores canônicos, inclusive quando o teste começa no preview.
          </div>
        </div>

        <Button
          variant="gradient"
          size="lg"
          className="w-full"
          onClick={handleTest}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Iniciando OAuth...
            </>
          ) : (
            <>
              <Youtube className="w-5 h-5 mr-2" />
              Iniciar teste OAuth YouTube
            </>
          )}
        </Button>

        {lastError && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <AlertCircle className="w-4 h-4" />
              Falha ao gerar URL de autorização
            </div>
            <p className="text-sm text-destructive/90 break-words">{lastError}</p>
            <p className="text-xs text-muted-foreground">
              Verifique se <code>GOOGLE_CLIENT_ID</code> e <code>GOOGLE_CLIENT_SECRET</code> estão configurados
              nas secrets do projeto.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
          <h3 className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            O que esperar
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
            <li>Ao clicar, o navegador vai para a tela do Google.</li>
            <li>Após autorizar, o Google redireciona para <code>{redirectUri}</code>.</li>
            <li>A página <code>/auth/callback</code> chama a edge function <code>youtube-oauth</code>.</li>
            <li>
              Se algo estiver errado (URI ou origem mal configurados, escopos faltando, canal inexistente),
              a tela de erro mostrará o diagnóstico exato.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
