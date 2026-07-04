import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Video {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  status: "draft" | "published" | "failed";
  created_at: string;
  updated_at: string;
}

export function useVideos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["videos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Video[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateVideo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (video: Omit<Video, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("videos")
        .insert({
          ...video,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

function extensionFromFile(file: File): string {
  // Try filename first
  const nameParts = (file.name || "").split(".");
  let ext = nameParts.length > 1 ? nameParts.pop()!.toLowerCase() : "";
  // Fallback to MIME type (mobile browsers sometimes send blob-like names)
  if (!ext || ext.length > 5) {
    const mime = file.type || "";
    if (mime.includes("quicktime")) ext = "mov";
    else if (mime.includes("mp4")) ext = "mp4";
    else if (mime.includes("webm")) ext = "webm";
    else if (mime.includes("png")) ext = "png";
    else if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
    else if (mime.includes("gif")) ext = "gif";
    else ext = mime.startsWith("video/") ? "mp4" : "bin";
  }
  // Sanitize
  return ext.replace(/[^a-z0-9]/g, "") || "bin";
}

export function useUploadVideo() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const ext = extensionFromFile(file);
      const fileName = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const contentType = file.type || (ext === "mov" ? "video/quicktime" : "application/octet-stream");

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file, {
          contentType,
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(`Falha no upload: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      return publicUrl;
    },
  });
}
