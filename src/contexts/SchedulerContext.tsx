import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface ScheduledPost {
  id: string;
  videoFile: string;
  videoName: string;
  title: string;
  description: string;
  platforms: string[];
  scheduledDate: Date;
  status: "scheduled" | "publishing" | "published" | "failed";
  createdAt: Date;
}

interface SchedulerContextType {
  scheduledPosts: ScheduledPost[];
  addScheduledPost: (post: Omit<ScheduledPost, "id" | "status" | "createdAt">) => void;
  updateScheduledPost: (id: string, updates: Partial<ScheduledPost>) => void;
  cancelScheduledPost: (id: string) => void;
  publishNow: (id: string) => void;
  getPendingCount: () => number;
}

const SchedulerContext = createContext<SchedulerContextType | undefined>(undefined);

export function SchedulerProvider({ children }: { children: ReactNode }) {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>(() => {
    const saved = localStorage.getItem("scheduledPosts");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((post: ScheduledPost) => ({
        ...post,
        scheduledDate: new Date(post.scheduledDate),
        createdAt: new Date(post.createdAt),
      }));
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("scheduledPosts", JSON.stringify(scheduledPosts));
  }, [scheduledPosts]);

  const addScheduledPost = (post: Omit<ScheduledPost, "id" | "status" | "createdAt">) => {
    const newPost: ScheduledPost = {
      ...post,
      id: crypto.randomUUID(),
      status: "scheduled",
      createdAt: new Date(),
    };
    setScheduledPosts((prev) => [...prev, newPost]);
  };

  const updateScheduledPost = (id: string, updates: Partial<ScheduledPost>) => {
    setScheduledPosts((prev) =>
      prev.map((post) => (post.id === id ? { ...post, ...updates } : post))
    );
  };

  const cancelScheduledPost = (id: string) => {
    setScheduledPosts((prev) => prev.filter((post) => post.id !== id));
  };

  const publishNow = (id: string) => {
    setScheduledPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, status: "publishing" as const } : post
      )
    );
    
    // Simulate publishing
    setTimeout(() => {
      setScheduledPosts((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, status: "published" as const } : post
        )
      );
    }, 2000);
  };

  const getPendingCount = () => {
    return scheduledPosts.filter((post) => post.status === "scheduled").length;
  };

  return (
    <SchedulerContext.Provider
      value={{
        scheduledPosts,
        addScheduledPost,
        updateScheduledPost,
        cancelScheduledPost,
        publishNow,
        getPendingCount,
      }}
    >
      {children}
    </SchedulerContext.Provider>
  );
}

export function useScheduler() {
  const context = useContext(SchedulerContext);
  if (!context) {
    throw new Error("useScheduler must be used within a SchedulerProvider");
  }
  return context;
}
