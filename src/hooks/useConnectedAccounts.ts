import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: "instagram" | "tiktok" | "youtube" | "facebook";
  platform_username: string | null;
  is_connected: boolean;
  connected_at: string | null;
  created_at: string;
}

export function useConnectedAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["connected_accounts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as ConnectedAccount[];
    },
    enabled: !!user?.id,
  });
}

export function useUpdateConnectedAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ConnectedAccount>;
    }) => {
      const { data, error } = await supabase
        .from("connected_accounts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connected_accounts"] });
    },
  });
}
