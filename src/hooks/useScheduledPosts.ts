import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ScheduledPost {
  id: string;
  user_id: string;
  video_id: string | null;
  video_file_url: string;
  video_name: string;
  title: string;
  description: string | null;
  platforms: string[];
  scheduled_date: string;
  status: "scheduled" | "publishing" | "published" | "failed";
  created_at: string;
  media_urls: string[] | null;
  media_type: string | null;
  error_message?: string | null;
}

export function useScheduledPosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["scheduled_posts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("scheduled_posts")
        .select("*")
        .eq("user_id", user.id)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      return data as ScheduledPost[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateScheduledPost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      post: Omit<ScheduledPost, "id" | "user_id" | "status" | "created_at">
    ) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("scheduled_posts")
        .insert({
          ...post,
          user_id: user.id,
          status: "scheduled",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_posts"] });
    },
  });
}

export function useUpdateScheduledPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ScheduledPost>;
    }) => {
      const { data, error } = await supabase
        .from("scheduled_posts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_posts"] });
    },
  });
}

export function useDeleteScheduledPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_posts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_posts"] });
    },
  });
}

export function usePendingPostsCount() {
  const { data: posts } = useScheduledPosts();
  return posts?.filter((post) => post.status === "scheduled").length ?? 0;
}
