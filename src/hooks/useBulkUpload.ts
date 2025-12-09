import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { brasiliaToUTC } from "@/lib/timezone";
import { 
  StoredQueueItem, 
  saveQueueItem, 
  loadQueue, 
  removeQueueItem as removeFromDB, 
  clearQueueDB,
  updateQueueItem 
} from "@/lib/indexedDB";

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

// Extract default title from filename (removes extension and replaces underscores)
const getDefaultTitle = (fileName: string): string => {
  return fileName
    .replace(/\.[^/.]+$/, "") // Remove extension
    .replace(/_/g, " ")       // Replace underscores with spaces
    .trim();
};

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

// Convert stored item to BulkUploadItem
const storedToItem = (stored: StoredQueueItem): BulkUploadItem => {
  const file = new File([stored.videoBlob], stored.fileName, { type: stored.fileType });
  return {
    id: stored.id,
    file,
    title: stored.title,
    description: stored.description,
    status: stored.status,
    progress: 0,
    platforms: stored.platforms,
    scheduleMode: stored.scheduleMode,
    individualScheduledDate: stored.individualScheduledDate ? new Date(stored.individualScheduledDate) : undefined,
    thumbnailUrl: stored.thumbnailUrl,
    error: stored.error,
  };
};

// Convert BulkUploadItem to stored format
const itemToStored = (item: BulkUploadItem): StoredQueueItem => ({
  id: item.id,
  videoBlob: item.file,
  fileName: item.file.name,
  fileSize: item.file.size,
  fileType: item.file.type,
  title: item.title,
  description: item.description,
  platforms: item.platforms,
  scheduleMode: item.scheduleMode,
  individualScheduledDate: item.individualScheduledDate?.toISOString(),
  thumbnailUrl: item.thumbnailUrl,
  status: item.status === "failed" ? "failed" : "pending",
  error: item.error,
  createdAt: new Date().toISOString(),
});

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
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [progress, setProgress] = useState<BulkUploadProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    uploading: 0,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load queue from IndexedDB on mount
  useEffect(() => {
    const loadSavedQueue = async () => {
      try {
        const savedItems = await loadQueue();
        if (savedItems.length > 0) {
          const items = savedItems.map(storedToItem);
          setQueue(items);
          setProgress(prev => ({
            ...prev,
            total: items.length,
            failed: items.filter(i => i.status === "failed").length,
          }));
        }
      } catch (error) {
        console.error("Error loading queue from IndexedDB:", error);
      } finally {
        setIsLoadingQueue(false);
      }
    };

    loadSavedQueue();
  }, []);

  const addToQueue = useCallback(async (files: File[], defaultPlatforms: string[] = []): Promise<{ success: boolean; error?: string }> => {
    if (queue.length + files.length > MAX_VIDEOS) {
      return { success: false, error: `Máximo de ${MAX_VIDEOS} vídeos por sessão.` };
    }

    const videoFiles = files.filter(f => f.type.startsWith("video/"));
    if (videoFiles.length !== files.length) {
      return { success: false, error: "Apenas arquivos de vídeo são permitidos." };
    }

    // Generate thumbnails and save to IndexedDB in parallel
    const items: BulkUploadItem[] = await Promise.all(
      videoFiles.map(async (file, index) => {
        const thumbnailUrl = await generateVideoThumbnail(file);
        const item: BulkUploadItem = {
          id: `${Date.now()}-${index}`,
          file,
          title: getDefaultTitle(file.name),
          description: "",
          status: "pending" as const,
          progress: 0,
          platforms: defaultPlatforms,
          scheduleMode: "scheduled" as const,
          thumbnailUrl,
        };
        
        // Save to IndexedDB
        await saveQueueItem(itemToStored(item));
        
        return item;
      })
    );

    setQueue(prev => [...prev, ...items]);
    setProgress(prev => ({
      ...prev,
      total: prev.total + items.length,
    }));

    return { success: true };
  }, [queue.length]);

  const removeFromQueue = useCallback(async (id: string) => {
    // Remove from IndexedDB
    try {
      await removeFromDB(id);
    } catch (error) {
      console.error("Error removing from IndexedDB:", error);
    }
    
    setQueue(prev => {
      const newQueue = prev.filter(item => item.id !== id);
      setProgress(p => ({
        ...p,
        total: newQueue.length,
      }));
      return newQueue;
    });
  }, []);

  const clearQueue = useCallback(async () => {
    // Clear IndexedDB
    try {
      await clearQueueDB();
    } catch (error) {
      console.error("Error clearing IndexedDB:", error);
    }
    
    setQueue([]);
    setProgress({ total: 0, completed: 0, failed: 0, uploading: 0 });
  }, []);

  const updateItemStatus = (id: string, updates: Partial<BulkUploadItem>) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const updateItem = useCallback(async (id: string, updates: { 
    title?: string; 
    description?: string;
    scheduleMode?: "immediate" | "scheduled";
    individualScheduledDate?: Date;
    platforms?: string[];
  }) => {
    // Update IndexedDB
    try {
      await updateQueueItem(id, {
        title: updates.title,
        description: updates.description,
        scheduleMode: updates.scheduleMode,
        individualScheduledDate: updates.individualScheduledDate?.toISOString(),
        platforms: updates.platforms,
      });
    } catch (error) {
      console.error("Error updating IndexedDB:", error);
    }
    
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates, customized: true } : item
    ));
  }, []);

  const uploadSingleFile = async (item: BulkUploadItem): Promise<string> => {
    // Use only UUID + extension to avoid special characters in Supabase Storage path
    const fileExtension = item.file.name.split('.').pop() || 'mp4';
    const fileName = `${user?.id}/${crypto.randomUUID()}.${fileExtension}`;
    
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

        // Remove from IndexedDB after successful processing
        try {
          await removeFromDB(item.id);
        } catch (dbError) {
          console.error("Error removing from IndexedDB:", dbError);
        }

        completedCount++;
        setProgress(p => ({ 
          ...p, 
          completed: completedCount, 
          uploading: p.uploading - 1 
        }));

      } catch (error) {
        console.error(`Error processing ${item.file.name}:`, error);
        
        // Update status in IndexedDB to failed
        try {
          await updateQueueItem(item.id, { 
            status: "failed", 
            error: error instanceof Error ? error.message : "Erro desconhecido" 
          });
        } catch (dbError) {
          console.error("Error updating IndexedDB:", dbError);
        }
        
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

    return { completed: completedCount, failed: failedCount };
  };

  const retryFailed = async () => {
    const failedItems = queue.filter(item => item.status === "failed");
    if (failedItems.length === 0) return;

    // Reset failed items and update IndexedDB
    for (const item of failedItems) {
      updateItemStatus(item.id, { status: "pending", error: undefined, progress: 0 });
      try {
        await updateQueueItem(item.id, { status: "pending", error: undefined });
      } catch (error) {
        console.error("Error updating IndexedDB:", error);
      }
    }

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
    isLoadingQueue,
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
