import { Home, Upload, BarChart3, User, CalendarClock } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePendingPostsCount } from "@/hooks/useScheduledPosts";

const navItems = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Upload, label: "Upload", path: "/upload" },
  { icon: CalendarClock, label: "Agenda", path: "/scheduled" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: User, label: "Perfil", path: "/profile" },
];

export function BottomNav() {
  const pendingCount = usePendingPostsCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 min-w-[60px] relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "p-2 rounded-xl transition-all duration-300 relative",
                    isActive && "bg-primary/20 glow"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.path === "/scheduled" && pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground rounded-full px-1">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}