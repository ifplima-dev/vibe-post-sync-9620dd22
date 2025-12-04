import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  className?: string;
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  change,
  positive,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "card-elevated p-4 animate-fade-in hover:border-primary/30 transition-all duration-300",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {change && (
          <span
            className={cn(
              "text-xs font-semibold px-2 py-1 rounded-full",
              positive
                ? "bg-success/20 text-success"
                : "bg-destructive/20 text-destructive"
            )}
          >
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
