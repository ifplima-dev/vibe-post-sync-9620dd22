import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${info.color}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            Conectar {info.name}
          </DialogTitle>
          <DialogDescription>
            Conecte sua conta do {info.name} para publicar vídeos e gerenciar comentários.
          </DialogDescription>
        </DialogHeader>

        {info.isMeta ? (
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

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          {info.isMeta ? (
            <Button
              variant="gradient"
              className="flex-1"
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
          ) : (
            <Button
              variant="gradient"
              className="flex-1"
              disabled
            >
              Em breve
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}