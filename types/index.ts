export type ApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "review_requested";

export const PROJECT_CATEGORIES = [
  "Image Diffusion",
  "Full-stack LLM APP",
  "AI agents",
] as const;

export const TEAM_TYPES = ["solo", "team"] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];
export type TeamType = (typeof TEAM_TYPES)[number];

export type Application = {
  id: string;
  title: string;
  description: string;
  url: string;
  screenshot_url?: string; // Legacy field for backward compatibility
  screenshot_urls?: string[]; // New field for multiple images
  video_url?: string;
  tags: string[];
  project_categories?: string[];
  team_type?: string;
  team_members?: Array<{
    id: string;
    user_id: string;
    name: string;
  }>;
  creator_id: string;
  status: ApplicationStatus;
  created_at: string;
  profiles?: {
    email: string;
    name?: string;
    avatar_url?: string;
  };
  stars?: number;
  isStarred?: boolean;
};

export type Like = {
  id: string;
  application_id: string;
  user_id: string;
  created_at: string;
};

export type NotificationType =
  | "like"
  | "comment"
  | "approval"
  | "rejection"
  | "star";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  application_id?: string;
  action_user_id?: string;
};
