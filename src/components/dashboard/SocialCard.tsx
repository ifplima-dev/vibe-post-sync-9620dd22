import { cn } from "@/lib/utils";
import { Check, Plus } from "lucide-react";
import { Button } from "../ui/button";

interface SocialCardProps {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  followers?: string;
  className?: string;
  onConnect?: () => void;
}

export function SocialCard({
  name,
  icon,
  connected,
  followers,
  className,
  onConnect,
}: SocialCardProps) {
  return (
    <div
      className={cn(
        "card-elevated p-4 animate-fade-in hover:border-primary/30 transition-all duration-300",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground">
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{name}</p>
          {connected && followers && (
            <p className="text-xs text-muted-foreground">{followers} seguidores</p>
          )}
        </div>
      </div>
      
      {connected ? (
        <div className="flex items-center gap-2 text-success text-sm">
          <Check className="w-4 h-4" />
          <span>Conectado</span>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onConnect}
        >
          <Plus className="w-4 h-4" />
          Conectar
        </Button>
      )}
    </div>
  );
}
