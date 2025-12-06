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

const platformInfo: Record<string, { 
  icon: React.ComponentType<{ className?: string }>; 
  color: string; 
  name: string;
  isMeta: boolean;
}> = {
  instagram: { 
    icon: InstagramIcon, 
    color: "from-purple-500 to-pink-500", 
    name: "Instagram",
    isMeta: true,
  },
  facebook: { 
    icon: FacebookIcon, 
    color: "from-blue-500 to-blue-600", 
    name: "Facebook",
    isMeta: true,
  },
  tiktok: { 
    icon: TikTokIcon, 
    color: "from-black to-gray-800", 
    name: "TikTok",
    isMeta: false,
  },
  youtube: { 
    icon: YouTubeIcon, 
    color: "from-red-500 to-red-600", 
    name: "YouTube",
    isMeta: false,
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
  const [pageId, setPageId] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");
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

  const handleManualTokenSubmit = async () => {
    if (!accessToken || !pageId) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (platform === "instagram" && !instagramAccountId) {
      toast({
        title: "Campo obrigatório",
        description: "Instagram Account ID é obrigatório para Instagram",
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
          accessToken,
          pageId,
          instagramAccountId: platform === "instagram" ? instagramAccountId : null,
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
      setPageId("");
      setInstagramAccountId("");
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
    setPageId("");
    setInstagramAccountId("");
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
              ? "Insira os dados do token obtidos no Graph API Explorer"
              : `Conecte sua conta do ${info.name} para publicar vídeos e gerenciar comentários.`
            }
          </DialogDescription>
        </DialogHeader>

        {info.isMeta ? (
          showManualForm ? (
            <div className="py-4 space-y-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-xs text-primary">
                  <strong>Como obter os dados:</strong> Acesse o{" "}
                  <a 
                    href="https://developers.facebook.com/tools/explorer/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Graph API Explorer
                  </a>
                  , selecione seu app e gere um token com as permissões necessárias.
                </p>
              </div>

              <div className="space-y-3">
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pageId">Page ID *</Label>
                  <Input
                    id="pageId"
                    placeholder="Ex: 123456789"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    ID da sua Página do Facebook
                  </p>
                </div>

                {platform === "instagram" && (
                  <div className="space-y-2">
                    <Label htmlFor="instagramAccountId">Instagram Account ID *</Label>
                    <Input
                      id="instagramAccountId"
                      placeholder="Ex: 17841400..."
                      value={instagramAccountId}
                      onChange={(e) => setInstagramAccountId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      ID da conta Instagram Business vinculada à página
                    </p>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Permissões necessárias:</strong> instagram_basic, instagram_content_publish, 
                  instagram_manage_comments, pages_show_list, pages_read_engagement
                </p>
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
          {info.isMeta ? (
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
