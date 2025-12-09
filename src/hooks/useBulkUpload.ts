import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { brasiliaToUTC } from "@/lib/timezone";

export interface BulkUploadItem {
  id: string;
  file: File;
  title: string;
  description: string;
  status: "pending" | "uploading" | "uploaded" | "scheduling" | "scheduled" | "publishing" | "published" | "failed";
  progress: number;
  fileUrl?: string;
  scheduledDate?: Date;
  error?: string;
  customized?: boolean;
  // Individual options
  platforms: string[];
  scheduleMode: "immediate" | "scheduled";
  individualScheduledDate?: Date;
  thumbnailUrl?: string;
}

// Generate video thumbnail using Canvas API
const generateVideoThumbnail = (file: File): Promise<string | undefined> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadeddata = () => {
      // Seek to 1 second to avoid black frames
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const aspectRatio = video.videoWidth / video.videoHeight;
        
        // Generate thumbnail at 160px width
        canvas.width = 160;
        canvas.height = Math.round(160 / aspectRatio);
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.7);
          URL.revokeObjectURL(objectUrl);
          resolve(thumbnailUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
          resolve(undefined);
        }
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve(undefined);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(undefined);
    };

    // Timeout fallback after 5 seconds
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      resolve(undefined);
    }, 5000);
  });
};

export interface BulkUploadProgress {
  total: number;
  completed: number;
  failed: number;
  uploading: number;
  currentFile?: string;
}

const MAX_PARALLEL_UPLOADS = 3;
const MAX_VIDEOS = 50;

export function useBulkUpload() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<BulkUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BulkUploadProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    uploading: 0,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const addToQueue = useCallback(async (files: File[], defaultPlatforms: string[] = []): Promise<{ success: boolean; error?: string }> => {
    if (files.length > MAX_VIDEOS) {
      return { success: false, error: `Máximo de ${MAX_VIDEOS} vídeos por sessão.` };
    }

    const videoFiles = files.filter(f => f.type.startsWith("video/"));
    if (videoFiles.length !== files.length) {
      return { success: false, error: "Apenas arquivos de vídeo são permitidos." };
    }

    // Generate thumbnails in parallel
    const items: BulkUploadItem[] = await Promise.all(
      videoFiles.map(async (file, index) => {
        const thumbnailUrl = await generateVideoThumbnail(file);
        return {
          id: `${Date.now()}-${index}`,
          file,
          title: "",
          description: "",
          status: "pending" as const,
          progress: 0,
          platforms: defaultPlatforms,
          scheduleMode: "scheduled" as const,
          thumbnailUrl,
        };
      })
    );

    setQueue(prev => [...prev, ...items]);
    setProgress(prev => ({
      ...prev,
      total: prev.total + items.length,
    }));

    return { success: true };
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => {
      const newQueue = prev.filter(item => item.id !== id);
      setProgress(p => ({
        ...p,
        total: newQueue.length,
      }));
      return newQueue;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setProgress({ total: 0, completed: 0, failed: 0, uploading: 0 });
  }, []);

  const updateItemStatus = (id: string, updates: Partial<BulkUploadItem>) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const updateItem = useCallback((id: string, updates: { 
    title?: string; 
    description?: string;
    scheduleMode?: "immediate" | "scheduled";
    individualScheduledDate?: Date;
    platforms?: string[];
  }) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates, customized: true } : item
    ));
  }, []);

  const uploadSingleFile = async (item: BulkUploadItem): Promise<string> => {
    const fileName = `${crypto.randomUUID()}-${item.file.name}`;
    
    const { data, error } = await supabase.storage
      .from("videos")
      .upload(fileName, item.file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("videos")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const schedulePost = async (item: BulkUploadItem) => {
    if (!user?.id) throw new Error("Not authenticated");
    if (item.platforms.length === 0) throw new Error("Nenhuma plataforma selecionada");

    let scheduledDate: Date;
    
    if (item.scheduleMode === "immediate") {
      scheduledDate = new Date();
    } else if (item.individualScheduledDate) {
      scheduledDate = new Date(item.individualScheduledDate);
    } else {
      throw new Error("Data de agendamento obrigatória");
    }

    // Convert to UTC for storage (user selects in Brasília time)
    const utcDate = brasiliaToUTC(scheduledDate);

    const { error } = await supabase
      .from("scheduled_posts")
      .insert({
        user_id: user.id,
        video_file_url: item.fileUrl!,
        video_name: item.file.name,
        title: item.title || item.file.name,
        description: item.description || null,
        platforms: item.platforms,
        scheduled_date: utcDate.toISOString(),
        status: item.scheduleMode === "immediate" ? "publishing" : "scheduled",
        media_type: "video",
      });

    if (error) throw error;

    return scheduledDate;
  };

  const publishImmediately = async (item: BulkUploadItem) => {
    const caption = item.title + (item.description ? "\n\n" + item.description : "");

    for (const platform of item.platforms) {
      const { error } = await supabase.functions.invoke("meta-publish", {
        body: {
          userId: user?.id,
          platform,
          videoUrl: item.fileUrl,
          caption,
          mediaType: "video",
        },
      });

      if (error) throw error;
    }
  };

  const processQueue = async () => {
    if (!user?.id || queue.length === 0) return;

    setIsProcessing(true);
    abortControllerRef.current = new AbortController();

    // Process only pending items
    const pendingItems = queue.filter(item => item.status === "pending");
    let completedCount = progress.completed;
    let failedCount = progress.failed;

    const processItem = async (item: BulkUploadItem) => {
      try {
        // Upload phase
        updateItemStatus(item.id, { status: "uploading", progress: 0 });
        setProgress(p => ({ ...p, uploading: p.uploading + 1, currentFile: item.file.name }));

        const fileUrl = await uploadSingleFile(item);
        
        updateItemStatus(item.id, { 
          status: "uploaded", 
          progress: 50, 
          fileUrl,
        });

        // Schedule or publish phase
        if (item.scheduleMode === "immediate") {
          updateItemStatus(item.id, { status: "publishing", progress: 75 });
          await publishImmediately({ ...item, fileUrl });
          updateItemStatus(item.id, { status: "published", progress: 100 });
        } else {
          updateItemStatus(item.id, { status: "scheduling", progress: 75 });
          const scheduledDate = await schedulePost({ ...item, fileUrl });
          updateItemStatus(item.id, { status: "scheduled", progress: 100, scheduledDate });
        }

        completedCount++;
        setProgress(p => ({ 
          ...p, 
          completed: completedCount, 
          uploading: p.uploading - 1 
        }));

      } catch (error) {
        console.error(`Error processing ${item.file.name}:`, error);
        updateItemStatus(item.id, { 
          status: "failed", 
          error: error instanceof Error ? error.message : "Erro desconhecido" 
        });
        failedCount++;
        setProgress(p => ({ 
          ...p, 
          failed: failedCount, 
          uploading: p.uploading - 1 
        }));
      }
    };

    // Process with concurrency limit
    const chunks: BulkUploadItem[][] = [];
    for (let i = 0; i < pendingItems.length; i += MAX_PARALLEL_UPLOADS) {
      chunks.push(pendingItems.slice(i, i + MAX_PARALLEL_UPLOADS));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(item => processItem(item)));
    }

    setIsProcessing(false);
    setProgress(p => ({ ...p, currentFile: undefined }));
  };

  const retryFailed = async () => {
    const failedItems = queue.filter(item => item.status === "failed");
    if (failedItems.length === 0) return;

    // Reset failed items
    failedItems.forEach(item => {
      updateItemStatus(item.id, { status: "pending", error: undefined, progress: 0 });
    });

    setProgress(p => ({
      ...p,
      failed: 0,
    }));

    await processQueue();
  };

  const cancelProcessing = () => {
    abortControllerRef.current?.abort();
    setIsProcessing(false);
  };

  return {
    queue,
    progress,
    isProcessing,
    addToQueue,
    removeFromQueue,
    clearQueue,
    processQueue,
    retryFailed,
    cancelProcessing,
    updateItem,
    MAX_VIDEOS,
  };
}
