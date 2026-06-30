import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Conectando sua conta...");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // We pass platform in state param
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      setStatus("error");
      setMessage(errorDescription || "Erro ao conectar conta");
      toast({
        title: "Erro na conexão",
        description: errorDescription || "Não foi possível conectar sua conta",
        variant: "destructive",
      });
      setTimeout(() => navigate("/profile"), 3000);
      return;
    }

    if (!code || !state || !user) {
      setStatus("error");
      setMessage("Parâmetros inválidos");
      setTimeout(() => navigate("/profile"), 3000);
      return;
    }

    // Detect platform from state
    // TikTok state format: "tiktok_uuid"
    // YouTube state format: "youtube_uuid"
    // Meta state format: "instagram" or "facebook"
    let platform = state;
    if (state.startsWith("tiktok_")) platform = "tiktok";
    else if (state.startsWith("youtube_")) platform = "youtube";

    handleOAuthCallback(code, platform);
  }, [searchParams, user]);

  const handleOAuthCallback = async (code: string, platform: string) => {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;

      // Use different edge function based on platform
      let functionName = "meta-oauth";
      if (platform === "tiktok") functionName = "tiktok-oauth";
      else if (platform === "youtube") functionName = "youtube-oauth";

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          code,
          redirectUri,
          userId: user?.id,
          platform,
        },
      });

      if (error) throw error;

      if (data.success) {
        setStatus("success");
        setMessage(`Conta ${data.username || platform} conectada com sucesso!`);
        toast({
          title: "Conta conectada!",
          description: `Sua conta ${platform} foi conectada com sucesso.`,
        });
        setTimeout(() => navigate("/profile"), 2000);
      } else {
        throw new Error(data.error || "Erro desconhecido");
      }
    } catch (err: any) {
      console.error("OAuth callback error:", err);
      setStatus("error");
      setMessage(err.message || "Erro ao processar conexão");
      toast({
        title: "Erro na conexão",
        description: err.message || "Não foi possível conectar sua conta",
        variant: "destructive",
      });
      setTimeout(() => navigate("/profile"), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">{message}</h1>
            <p className="text-muted-foreground">Aguarde enquanto processamos sua conexão...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">{message}</h1>
            <p className="text-muted-foreground">Redirecionando...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Erro na conexão</h1>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecionando...</p>
          </>
        )}
      </div>
    </div>
  );
}