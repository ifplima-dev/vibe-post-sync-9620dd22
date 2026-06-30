import { useState } from "react";
import { ExternalLink, Loader2, Key } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  FacebookIcon,
} from "@/components/icons/SocialIcons";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type PlatformType = "meta" | "tiktok" | "youtube";

const platformInfo: Record<string, { 
  icon: React.ComponentType<{ className?: string }>; 
  color: string; 
  name: string;
  type: PlatformType;
}> = {
  instagram: { 
    icon: InstagramIcon, 
    color: "from-purple-500 to-pink-500", 
    name: "Instagram",
    type: "meta",
  },
  facebook: { 
    icon: FacebookIcon, 
    color: "from-blue-500 to-blue-600", 
    name: "Facebook",
    type: "meta",
  },
  tiktok: { 
    icon: TikTokIcon, 
    color: "from-black to-gray-800", 
    name: "TikTok",
    type: "tiktok",
  },
  youtube: { 
    icon: YouTubeIcon, 
    color: "from-red-500 to-red-600", 
    name: "YouTube",
    type: "youtube",
  },
};

interface ConnectAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: string | null;
}

export function ConnectAccountDialog({ open, onOpenChange, platform }: ConnectAccountDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const { toast } = useToast();

  if (!platform) return null;

  const info = platformInfo[platform];
  if (!info) return null;

  const Icon = info.icon;

  const handleMetaConnect = async () => {
    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.functions.invoke("meta-auth-url", {
        body: { platform, redirectUri },
      });

      if (error) throw error;

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("URL de autenticação não retornada");
      }
    } catch (err: any) {
      console.error("Error getting auth URL:", err);
      toast({
        title: "Erro ao conectar",
        description: err.message || "Não foi possível iniciar a conexão",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleTikTokConnect = async () => {
    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.functions.invoke("tiktok-auth-url", {
        body: { redirectUri },
      });

      if (error) throw error;

      if (data.authUrl) {
        // Store state in sessionStorage for validation on callback
        if (data.state) {
          sessionStorage.setItem("tiktok_oauth_state", data.state);
        }
        window.location.href = data.authUrl;
      } else {
        throw new Error("URL de autenticação não retornada");
      }
    } catch (err: any) {
      console.error("Error getting TikTok auth URL:", err);
      toast({
        title: "Erro ao conectar",
        description: err.message || "Não foi possível iniciar a conexão com TikTok",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleYouTubeConnect = async () => {
    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.functions.invoke("youtube-auth-url", {
        body: { redirectUri },
      });

      if (error) throw error;

      if (data.authUrl) {
        if (data.state) {
          sessionStorage.setItem("youtube_oauth_state", data.state);
        }
        window.location.href = data.authUrl;
      } else {
        throw new Error("URL de autenticação não retornada");
      }
    } catch (err: any) {
      console.error("Error getting YouTube auth URL:", err);
      toast({
        title: "Erro ao conectar",
        description: err.message || "Não foi possível iniciar a conexão com YouTube",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleManualTokenSubmit = async () => {
    if (!accessToken.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Cole o Access Token para continuar",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase.functions.invoke("save-manual-token", {
        body: {
          userId: user.id,
          platform,
          accessToken: accessToken.trim(),
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Conta conectada!",
        description: data.message || `${info.name} conectado com sucesso`,
      });

      // Reset form and close dialog
      setAccessToken("");
      setShowManualForm(false);
      onOpenChange(false);

      // Reload to refresh connected accounts
      window.location.reload();

    } catch (err: any) {
      console.error("Error saving manual token:", err);
      toast({
        title: "Erro ao conectar",
        description: err.message || "Não foi possível salvar o token",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setShowManualForm(false);
    setAccessToken("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${info.color}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            Conectar {info.name}
          </DialogTitle>
          <DialogDescription>
            {showManualForm 
              ? "Cole apenas o Access Token - buscaremos os outros dados automaticamente"
              : `Conecte sua conta do ${info.name} para publicar vídeos e gerenciar comentários.`
            }
          </DialogDescription>
        </DialogHeader>

        {info.type === "meta" ? (
          showManualForm ? (
            <div className="py-4 space-y-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-xs text-primary">
                  <strong>Como obter o token:</strong> Acesse o{" "}
                  <a 
                    href="https://developers.facebook.com/tools/explorer/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Graph API Explorer
                  </a>
                  , selecione seu app e gere um token com as permissões listadas abaixo.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token *</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="Cole o access token aqui"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  O sistema irá buscar automaticamente sua página e conta Instagram vinculada.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Permissões necessárias:</strong>
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• pages_show_list</li>
                  <li>• pages_read_engagement</li>
                  {platform === "instagram" ? (
                    <>
                      <li>• instagram_basic</li>
                      <li>• instagram_content_publish</li>
                    </>
                  ) : (
                    <li>• pages_manage_posts</li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                <p className="text-sm text-muted-foreground mb-3">
                  Ao conectar, você autoriza o app a:
                </p>
                <ul className="text-sm space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Publicar vídeos em sua conta
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Ler e responder comentários
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Acessar métricas de engajamento
                  </li>
                </ul>
              </div>

              {platform === "instagram" && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-200">
                    <strong>Nota:</strong> Você precisa ter uma conta Instagram Business ou Creator 
                    conectada a uma Página do Facebook.
                  </p>
                </div>
              )}
            </div>
          )
        ) : info.type === "tiktok" ? (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-xl bg-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground mb-3">
                Ao conectar, você autoriza o app a:
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Acessar informações básicas do perfil
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Publicar vídeos em sua conta
                </li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs text-amber-200">
                <strong>Nota:</strong> A publicação de vídeos no TikTok requer aprovação 
                do scope video.upload pelo TikTok. Conectar a conta funcionará, mas a 
                publicação pode precisar de aprovação adicional.
              </p>
            </div>
          </div>
        ) : info.type === "youtube" ? (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-xl bg-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground mb-3">
                Ao conectar, você autoriza o app a:
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Acessar informações básicas do canal
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Fazer upload e publicar vídeos no canal
                </li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs text-amber-200">
                <strong>Nota:</strong> Você precisa ter um canal do YouTube ativo
                associado a esta conta Google.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-6">
            <div className="p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Em desenvolvimento</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A integração OAuth com {info.name} está sendo implementada.
                    Em breve você poderá conectar sua conta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {info.type === "meta" ? (
            showManualForm ? (
              <>
                <Button
                  variant="gradient"
                  className="w-full"
                  onClick={handleManualTokenSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    "Salvar e Conectar"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowManualForm(false)}
                  disabled={isLoading}
                >
                  Voltar
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="gradient"
                  className="w-full"
                  onClick={handleMetaConnect}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    "Conectar com Meta"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowManualForm(true)}
                  disabled={isLoading}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Inserir Token Manualmente
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </>
            )
          ) : info.type === "tiktok" ? (
            <>
              <Button
                variant="gradient"
                className="w-full"
                onClick={handleTikTokConnect}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  "Conectar com TikTok"
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </>
          ) : info.type === "youtube" ? (
            <>
              <Button
                variant="gradient"
                className="w-full"
                onClick={handleYouTubeConnect}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  "Conectar com YouTube"
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
