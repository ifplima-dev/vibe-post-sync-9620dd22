import { Bell } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface NotificationsSheetProps {
  children?: React.ReactNode;
}

export function NotificationsSheet({ children }: NotificationsSheetProps) {
  // Placeholder - will be connected to real notifications later
  const notifications: Array<{ id: string; title: string; message: string; time: string }> = [];

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notificações</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 rounded-lg bg-secondary/50 border border-border"
                >
                  <p className="font-medium text-foreground">{notification.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {notification.time}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">Nenhuma notificação</p>
              <p className="text-sm text-muted-foreground mt-1">
                Você será notificado sobre atualizações importantes
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
