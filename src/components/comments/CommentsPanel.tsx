import { MessageSquare, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CommentCard } from "./CommentCard";
import { useComments, useReplyToComment, useHideComment, useDeleteComment } from "@/hooks/useComments";

interface CommentsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  platform: string;
  postTitle?: string;
}

export function CommentsPanel({ 
  open, 
  onOpenChange, 
  postId, 
  platform,
  postTitle 
}: CommentsPanelProps) {
  const { data: comments, isLoading, refetch } = useComments(postId, platform);
  const replyMutation = useReplyToComment();
  const hideMutation = useHideComment();
  const deleteMutation = useDeleteComment();

  const handleReply = (commentId: string, message: string) => {
    replyMutation.mutate({ commentId, message, platform, postId });
  };

  const handleHide = (commentId: string) => {
    hideMutation.mutate({ commentId, platform, postId });
  };

  const handleDelete = (commentId: string) => {
    deleteMutation.mutate({ commentId, platform, postId });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comentários
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {postTitle && (
            <p className="text-sm text-muted-foreground line-clamp-1">{postTitle}</p>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4">
          <div className="space-y-4 py-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p>Carregando comentários...</p>
              </div>
            ) : comments && comments.length > 0 ? (
              comments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onHide={handleHide}
                  onDelete={handleDelete}
                  isReplying={replyMutation.isPending}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-center">Nenhum comentário ainda</p>
                <p className="text-sm text-center mt-1">
                  Os comentários aparecerão aqui quando seu post receber interações.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}