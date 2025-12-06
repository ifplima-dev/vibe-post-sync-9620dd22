import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Comment {
  id: string;
  text: string;
  authorName: string;
  authorId?: string;
  createdAt: string;
  likeCount: number;
  replies: {
    id: string;
    text: string;
    authorName: string;
    createdAt: string;
  }[];
}

export function useComments(postId: string, platform: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id || !postId) return;

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          console.log("Realtime comment update:", payload);
          queryClient.invalidateQueries({ queryKey: ["comments", postId, platform] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, postId, platform, queryClient]);

  return useQuery({
    queryKey: ["comments", postId, platform],
    queryFn: async () => {
      if (!user?.id || !postId) return [];

      const { data, error } = await supabase.functions.invoke("meta-comments", {
        body: {
          action: "fetch",
          userId: user.id,
          platform,
          postId,
        },
      });

      if (error) throw error;
      return data.comments as Comment[];
    },
    enabled: !!user?.id && !!postId,
  });
}

export function useReplyToComment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      message,
      platform,
      postId,
    }: {
      commentId: string;
      message: string;
      platform: string;
      postId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("meta-comments", {
        body: {
          action: "reply",
          userId: user?.id,
          platform,
          commentId,
          message,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Resposta enviada!",
        description: "Sua resposta foi publicada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId, variables.platform] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao responder",
        description: error.message || "Não foi possível enviar a resposta.",
        variant: "destructive",
      });
    },
  });
}

export function useHideComment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      platform,
      postId,
    }: {
      commentId: string;
      platform: string;
      postId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("meta-comments", {
        body: {
          action: "hide",
          userId: user?.id,
          platform,
          commentId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Comentário ocultado",
        description: "O comentário foi ocultado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId, variables.platform] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao ocultar",
        description: error.message || "Não foi possível ocultar o comentário.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteComment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      platform,
      postId,
    }: {
      commentId: string;
      platform: string;
      postId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("meta-comments", {
        body: {
          action: "delete",
          userId: user?.id,
          platform,
          commentId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Comentário excluído",
        description: "O comentário foi excluído permanentemente.",
      });
      queryClient.invalidateQueries({ queryKey: ["comments", variables.postId, variables.platform] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o comentário.",
        variant: "destructive",
      });
    },
  });
}