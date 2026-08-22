import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CaptionLength = "curta" | "media" | "longa";
export type CaptionTone = "descontraido" | "profissional" | "vendas";

export interface AiCaptionSettings {
  enabled: boolean;
  tone: CaptionTone;
  caption_length: CaptionLength;
  use_emoji: boolean;
  hashtag_count: number;
  cta: string | null;
  extra_instructions: string | null;
}

export const defaultAiCaptionSettings: AiCaptionSettings = {
  enabled: true,
  tone: "descontraido",
  caption_length: "media",
  use_emoji: true,
  hashtag_count: 10,
  cta: null,
  extra_instructions: null,
};

export function useAiCaptionSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-caption-settings", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AiCaptionSettings> => {
      const { data, error } = await supabase
        .from("ai_caption_settings")
        .select("enabled, tone, caption_length, use_emoji, hashtag_count, cta, extra_instructions")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return defaultAiCaptionSettings;
      return data as AiCaptionSettings;
    },
  });
}

export function useUpdateAiCaptionSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: AiCaptionSettings) => {
      const { error } = await supabase
        .from("ai_caption_settings")
        .upsert({ user_id: user!.id, ...settings }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-caption-settings", user?.id] });
    },
  });
}
