import { useState } from "react";
import { Heart, Reply, EyeOff, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Comment } from "@/hooks/useComments";

interface CommentCardProps {
  comment: Comment;
  onReply: (commentId: string, message: string) => void;
  onHide: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  isReplying?: boolean;
}

export function CommentCard({ comment, onReply, onHide, onDelete, isReplying }: CommentCardProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleSubmitReply = () => {
    if (replyText.trim()) {
      onReply(comment.id, replyText.trim());
      setReplyText("");
      setShowReplyInput(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
      <div className="flex gap-3">
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
            {comment.authorName?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground">{comment.authorName}</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          
          <p className="text-foreground/90 text-sm leading-relaxed mb-3">
            {comment.text}
          </p>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Heart className="w-4 h-4" />
              <span className="text-xs">{comment.likeCount}</span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowReplyInput(!showReplyInput)}
            >
              <Reply className="w-3.5 h-3.5 mr-1" />
              Responder
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onHide(comment.id)}
            >
              <EyeOff className="w-3.5 h-3.5 mr-1" />
              Ocultar
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Excluir
            </Button>
          </div>

          {showReplyInput && (
            <div className="mt-3 flex gap-2">
              <Textarea
                placeholder="Escreva sua resposta..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[60px] text-sm resize-none"
              />
              <Button
                size="sm"
                onClick={handleSubmitReply}
                disabled={!replyText.trim() || isReplying}
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 pl-4 border-l-2 border-border/50 space-y-3">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{reply.authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(reply.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-foreground/80">{reply.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}