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
  // Individual scheduling options
  scheduleMode?: "immediate" | "scheduled";
  individualScheduledDate?: Date;
}

export interface BulkUploadConfig {
  baseTitle: string;
  description: string;
  platforms: string[];
  scheduleMode: "immediate" | "scheduled";
  startDate?: Date;
  intervalHours: number;
}

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

  const addToQueue = useCallback((files: File[]): { success: boolean; error?: string } => {
    if (files.length > MAX_VIDEOS) {
      return { success: false, error: `Máximo de ${MAX_VIDEOS} vídeos por sessão.` };
    }

    const videoFiles = files.filter(f => f.type.startsWith("video/"));
    if (videoFiles.length !== files.length) {
      return { success: false, error: "Apenas arquivos de vídeo são permitidos." };
    }

    const items: BulkUploadItem[] = videoFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      title: "",
      description: "",
      status: "pending",
      progress: 0,
    }));

    setQueue(items);
    setProgress({
      total: items.length,
      completed: 0,
      failed: 0,
      uploading: 0,
    });

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

  const schedulePost = async (
    item: BulkUploadItem,
    config: BulkUploadConfig,
    index: number
  ) => {
    if (!user?.id) throw new Error("Not authenticated");

    // Determine schedule mode and date for this item
    const itemScheduleMode = item.scheduleMode ?? config.scheduleMode;
    
    let scheduledDate: Date;
    
    if (itemScheduleMode === "immediate") {
      scheduledDate = new Date();
    } else if (item.individualScheduledDate) {
      // Use individual date if set
      scheduledDate = new Date(item.individualScheduledDate);
    } else if (config.startDate) {
      // Fall back to batch config
      scheduledDate = new Date(config.startDate);
      scheduledDate.setHours(scheduledDate.getHours() + (index * config.intervalHours));
    } else {
      throw new Error("Start date required for scheduling");
    }

    // Convert to UTC for storage (user selects in Brasília time)
    const utcDate = brasiliaToUTC(scheduledDate);

    const { error } = await supabase
      .from("scheduled_posts")
      .insert({
        user_id: user.id,
        video_file_url: item.fileUrl!,
        video_name: item.file.name,
        title: item.title,
        description: item.description || null,
        platforms: config.platforms,
        scheduled_date: utcDate.toISOString(),
        status: itemScheduleMode === "immediate" ? "publishing" : "scheduled",
        media_type: "video",
      });

    if (error) throw error;

    return scheduledDate;
  };

  const publishImmediately = async (
    item: BulkUploadItem,
    config: BulkUploadConfig
  ) => {
    const caption = item.title + (item.description ? "\n\n" + item.description : "");

    for (const platform of config.platforms) {
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

  const processQueue = async (config: BulkUploadConfig) => {
    if (!user?.id || queue.length === 0) return;

    setIsProcessing(true);
    abortControllerRef.current = new AbortController();

    // Apply titles with numbering (only for non-customized items)
    const updatedQueue = queue.map((item, index) => {
      if (item.customized) {
        return item; // Keep customized title/description
      }
      return {
        ...item,
        title: config.baseTitle.includes("{n}") 
          ? config.baseTitle.replace("{n}", String(index + 1))
          : `${config.baseTitle} #${index + 1}`,
        description: config.description,
      };
    });
    setQueue(updatedQueue);

    // Process in batches
    const pendingItems = [...updatedQueue];
    let completedCount = 0;
    let failedCount = 0;

    const processItem = async (item: BulkUploadItem, index: number) => {
      try {
        // Upload phase
        updateItemStatus(item.id, { status: "uploading", progress: 0 });
        setProgress(p => ({ ...p, uploading: p.uploading + 1, currentFile: item.file.name }));

        const fileUrl = await uploadSingleFile(item);
        
        updateItemStatus(item.id, { 
          status: "uploaded", 
          progress: 50, 
          fileUrl,
          title: item.title,
          description: item.description,
        });

        // Determine this item's schedule mode
        const itemScheduleMode = item.scheduleMode ?? config.scheduleMode;

        // Schedule or publish phase
        if (itemScheduleMode === "immediate") {
          updateItemStatus(item.id, { status: "publishing", progress: 75 });
          await publishImmediately({ ...item, fileUrl }, config);
          updateItemStatus(item.id, { status: "published", progress: 100 });
        } else {
          updateItemStatus(item.id, { status: "scheduling", progress: 75 });
          const scheduledDate = await schedulePost({ ...item, fileUrl }, config, index);
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

    let globalIndex = 0;
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map((item, chunkIndex) => processItem(item, globalIndex + chunkIndex))
      );
      globalIndex += chunk.length;
    }

    setIsProcessing(false);
    setProgress(p => ({ ...p, currentFile: undefined }));
  };

  const retryFailed = async (config: BulkUploadConfig) => {
    const failedItems = queue.filter(item => item.status === "failed");
    if (failedItems.length === 0) return;

    // Reset failed items
    failedItems.forEach(item => {
      updateItemStatus(item.id, { status: "pending", error: undefined, progress: 0 });
    });

    setProgress(p => ({
      ...p,
      failed: 0,
      completed: p.completed,
    }));

    await processQueue(config);
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
