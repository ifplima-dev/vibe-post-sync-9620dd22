import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

type Diagnosis = {
  title: string;
  hint: string;
  fix?: string;
};

function diagnose(params: {
  oauthError?: string | null;
  oauthErrorDescription?: string | null;
  edgeError?: string | null;
  platform?: string;
}): Diagnosis {
  const { oauthError, oauthErrorDescription, edgeError } = params;
  const desc = (oauthErrorDescription || "").toLowerCase();
  const err = (oauthError || "").toLowerCase();
  const edge = (edgeError || "").toLowerCase();

  if (err === "redirect_uri_mismatch" || desc.includes("redirect_uri") || edge.includes("redirect_uri")) {
    return {
      title: "URI de redirecionamento não corresponde",
      hint: "O Google rejeitou o callback porque o URI enviado não está na lista de 'URIs de redirecionamento autorizados'.",
      fix: "Adicione exatamente esta URL em Google Cloud Console → Credentials → OAuth Client ID → URIs de redirecionamento autorizados.",
    };
  }

  if (err === "invalid_client" || edge.includes("invalid_client")) {
    return {
      title: "Client ID ou Secret inválido",
      hint: "As credenciais GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET configuradas não correspondem às do projeto Google Cloud.",
      fix: "Verifique no Google Cloud se você copiou o Client ID e Secret corretos do mesmo projeto onde adicionou os redirect URIs.",
    };
  }

  if (err === "access_denied") {
    return {
      title: "Acesso negado pelo usuário",
      hint: "Você cancelou o consentimento na tela do Google.",
      fix: "Tente novamente e clique em 'Permitir' na tela de autorização.",
    };
  }

  if (err === "invalid_scope" || desc.includes("scope")) {
    return {
      title: "Escopo OAuth não autorizado",
      hint: "Os escopos solicitados (youtube.upload, youtube.readonly) não estão habilitados na tela de consentimento do projeto.",
      fix: "No Google Cloud Console: APIs & Services → OAuth consent screen → adicione os escopos do YouTube, e ative a YouTube Data API v3 em 'Library'.",
    };
  }

  if (edge.includes("nenhum canal") || edge.includes("no channel")) {
    return {
      title: "Conta Google sem canal YouTube",
      hint: "A conta usada não possui um canal do YouTube ativo.",
      fix: "Acesse youtube.com e crie um canal para esta conta Google antes de tentar novamente.",
    };
  }

  if (edge.includes("origin") || desc.includes("origin")) {
    return {
      title: "Origem JavaScript não autorizada",
      hint: "O domínio atual não está em 'Origens JavaScript autorizadas' no Google Cloud.",
      fix: "Adicione APENAS o domínio (sem /auth/callback e sem barra final) em Origens JavaScript autorizadas.",
    };
  }

  if (edge.includes("google_client_id") || edge.includes("não configurad")) {
    return {
      title: "Credenciais Google ausentes",
      hint: "As secrets GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não estão configuradas no backend.",
      fix: "Configure as secrets no painel de Lovable Cloud.",
    };
  }

  return {
    title: "Erro desconhecido no callback",
    hint: oauthErrorDescription || edgeError || oauthError || "Sem detalhes adicionais.",
    fix: "Verifique os logs da função youtube-oauth/meta-oauth/tiktok-oauth no painel do backend.",
  };
}

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Conectando sua conta...");
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [platform, setPlatform] = useState<string>("");

  const origin = "https://vibe-post-sync.lovable.app";
  const redirectUri = `${origin}/auth/callback`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: `${label} copiado.` });
  };

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error");
    const oauthErrorDescription = searchParams.get("error_description");

    // Detect platform early
    let detected = state || "";
    if (detected.startsWith("tiktok_")) detected = "tiktok";
    else if (detected.startsWith("youtube_")) detected = "youtube";
    setPlatform(detected);

    if (oauthError) {
      setStatus("error");
      setMessage(oauthErrorDescription || oauthError);
      setDiagnosis(diagnose({ oauthError, oauthErrorDescription, platform: detected }));
      return;
    }

    if (!code || !state || !user) {
      setStatus("error");
      setMessage("Parâmetros de callback ausentes (code/state/user).");
      setDiagnosis({
        title: "Callback incompleto",
        hint: "O Google não retornou os parâmetros esperados, ou você não está logado no app.",
        fix: "Verifique se a URI de redirecionamento está correta no Google Cloud Console.",
      });
      return;
    }

    handleOAuthCallback(code, detected);
  }, [searchParams, user]);

  const handleOAuthCallback = async (code: string, plat: string) => {
    try {
      let functionName = "meta-oauth";
      if (plat === "tiktok") functionName = "tiktok-oauth";
      else if (plat === "youtube") functionName = "youtube-oauth";

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { code, redirectUri, userId: user?.id, platform: plat },
      });

      if (error) throw error;

      if (data?.success) {
        setStatus("success");
        setMessage(`Conta ${data.username || plat} conectada com sucesso!`);
        toast({
          title: "Conta conectada!",
          description: `Sua conta ${plat} foi conectada com sucesso.`,
        });
        const testMode = sessionStorage.getItem("youtube_test_mode");
        sessionStorage.removeItem("youtube_test_mode");
        setTimeout(() => navigate(testMode ? "/youtube-test" : "/profile"), 1500);
      } else {
        throw new Error(data?.error || "Erro desconhecido");
      }
    } catch (err: any) {
      console.error("OAuth callback error:", err);
      setStatus("error");
      setMessage(err.message || "Erro ao processar conexão");
      setDiagnosis(diagnose({ edgeError: err.message, platform: plat }));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        {status === "loading" && (
          <div className="text-center space-y-4">
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">{message}</h1>
            <p className="text-muted-foreground">Aguarde enquanto processamos sua conexão...</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">{message}</h1>
            <p className="text-muted-foreground">Redirecionando...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-5">
            <div className="text-center space-y-3">
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
              <h1 className="text-2xl font-bold text-foreground">Falha na conexão</h1>
              {platform && (
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Plataforma: {platform}
                </p>
              )}
            </div>

            {diagnosis && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-destructive">{diagnosis.title}</p>
                  <p className="text-sm text-foreground/90 mt-1">{diagnosis.hint}</p>
                </div>
                {diagnosis.fix && (
                  <div className="text-xs text-muted-foreground border-t border-destructive/20 pt-3">
                    <strong className="text-foreground">Como corrigir:</strong> {diagnosis.fix}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold">Valores que devem estar no Google Cloud:</p>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Origens JavaScript autorizadas (apenas o domínio):
                </p>
                <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/50">
                  <code className="text-xs flex-1 break-all">{origin}</code>
                  <Button size="icon" variant="ghost" onClick={() => copy(origin, "Origem")}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  URI de redirecionamento autorizado (com caminho):
                </p>
                <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/50">
                  <code className="text-xs flex-1 break-all">{redirectUri}</code>
                  <Button size="icon" variant="ghost" onClick={() => copy(redirectUri, "Redirect URI")}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {message && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Ver mensagem técnica
                  </summary>
                  <pre className="mt-2 p-2 rounded bg-secondary/30 overflow-x-auto whitespace-pre-wrap break-words">
{message}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/profile")}>
                Voltar ao perfil
              </Button>
              {platform === "youtube" && (
                <Button variant="gradient" className="flex-1" onClick={() => navigate("/youtube-test")}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Testar novamente
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
