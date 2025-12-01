"use client";

import { useEffect, useState,Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Heart, Star, Filter, SortAsc } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/use-toast";
import type { Application } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getFirstScreenshotUrl } from "@/lib/image-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_CATEGORIES } from "@/types";

type ApplicationWithProfile = Application & {
  stars: number;
  isStarred: boolean;
  creator_user_id?: string;
  creator?: {
    user_id: string;
    role?: string;
  };
  screenshots?: string[];
  live_url?: string;
  project_categories?: string[];
};

export default function ApplicationsContent() {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithProfile[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<string>("newest");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    fetchApplications();
  }, [user, profile]);

  const filteredAndSortedApplications = (() => {
    // First, filter applications
    let filtered = applications.filter((app) => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          app.title.toLowerCase().includes(query) ||
          app.description.toLowerCase().includes(query) ||
          app.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== "all") {
        const hasCategory = app.project_categories?.some(
          (category) => category === selectedCategory
        );
        if (!hasCategory) return false;
      }

      return true;
    });

    // Then, sort applications
    switch (sortBy) {
      case "highest-rated":
        return filtered.sort((a, b) => b.stars - a.stars);
      case "lowest-rated":
        return filtered.sort((a, b) => a.stars - b.stars);
      case "newest":
        return filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "oldest":
        return filtered.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case "alphabetical":
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return filtered;
    }
  })();

  const fetchApplications = async () => {
    try {
      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select(
          `
          *,
          stars(count),
          creator:profiles!creator_id(user_id, role)
        `
        )
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (appsError) throw appsError;

      let userStars: string[] = [];
      if (profile?.id) {
        const { data: stars } = await supabase
          .from("stars")
          .select("application_id")
          .eq("user_id", profile.id);

        userStars = stars?.map((star) => star.application_id) || [];
      }

      const formattedApps = apps?.map((app: any) => ({
        ...app,
        stars: app.stars[0]?.count || 0,
        isStarred: userStars.includes(app.id),
        creator_user_id: app.creator?.user_id,
      }));

      setApplications(formattedApps || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStar = async (id: string, isStarred: boolean) => {
    if (!user || !profile) {
      toast({
        title: "Authentication required",
        description: "Please sign in to star applications",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the application details first
      const { data: application, error: appError } = await supabase
        .from("applications")
        .select("title, creator_id")
        .eq("id", id)
        .single();

      if (appError) throw appError;

      // Check if user is the creator
      const isOwnApplication = application.creator_id === profile.id;

      if (!isStarred) {
        // Add star
        const { error: starError } = await supabase
          .from("stars")
          .insert({ application_id: id, user_id: profile.id });

        if (starError) throw starError;

        // Only create notification if not starring own application
        if (!isOwnApplication) {
          const { data: existingNotification } = await supabase
            .from("notifications")
            .select()
            .eq("user_id", application.creator_id)
            .eq("type", "star")
            .eq("application_id", id)
            .eq("action_user_id", profile.id)
            .single();

          if (!existingNotification) {
            const { error: notificationError } = await supabase
              .from("notifications")
              .insert({
                user_id: application.creator_id,
                type: "star",
                title: "New Star",
                message: `${profile.user_id} starred your application "${application.title}"`,
                application_id: id,
                action_user_id: profile.id,
                read: false,
              });

            if (notificationError) throw notificationError;
          }
        }
      } else {
        // Remove star
        const { error } = await supabase
          .from("stars")
          .delete()
          .eq("application_id", id)
          .eq("user_id", profile.id);

        if (error) throw error;
      }

      // Update local state
      setApplications(
        applications.map((app) =>
          app.id === id
            ? {
                ...app,
                stars: isStarred ? app.stars - 1 : app.stars + 1,
                isStarred: !isStarred,
              }
            : app
        )
      );
    } catch (error) {
      console.error("Error updating star:", error);
      toast({
        title: "Error",
        description: "Failed to update star",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Filters and Sorting Controls */}
        {!loading && (
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {PROJECT_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <SortAsc className="h-4 w-4 text-muted-foreground" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                      <SelectItem value="highest-rated">Highest Rated</SelectItem>
                      <SelectItem value="lowest-rated">Lowest Rated</SelectItem>
                      <SelectItem value="alphabetical">Alphabetical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Link href="/submit">
                <Button>Create Application</Button>
              </Link>
            </div>
        )}

        {/* Application Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-4 flex flex-col space-y-4">
                <div className="animate-pulse h-48 bg-gray-200 rounded-md"></div>
                <div className="animate-pulse h-6 bg-gray-200 rounded-md w-3/4"></div>
                <div className="animate-pulse h-4 bg-gray-200 rounded-md w-1/2"></div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="animate-pulse bg-gray-200 w-16 h-6"></Badge>
                  <Badge className="animate-pulse bg-gray-200 w-20 h-6"></Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="animate-pulse h-8 bg-gray-200 rounded-md w-24"></div>
                  <div className="animate-pulse h-8 bg-gray-200 rounded-md w-8"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedApplications.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            No applications found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedApplications.map((app) => (
              <Card key={app.id} className="flex flex-col">
                <Link href={`/applications/${app.id}`}>
                  <div className="relative w-full h-48 bg-muted rounded-t-lg overflow-hidden">
                    {app.screenshots && app.screenshots.length > 0 ? (
                      <Image
                        src={getFirstScreenshotUrl(app.screenshots)}
                        alt={app.title}
                        layout="fill"
                        objectFit="cover"
                        className="transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-500">
                        No Image
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-4 flex flex-col flex-grow">
                  <Link href={`/applications/${app.id}`}>
                    <h3 className="text-xl font-semibold mb-2 hover:text-primary transition-colors">
                      {app.title}
                    </h3>
                  </Link>
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2 flex-grow">
                    {app.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {app.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-auto flex justify-between items-center">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{app.stars}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {app.live_url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={app.live_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStar(app.id, app.isStarred)}
                        className={app.isStarred ? "text-red-500" : ""}
                      >
                        <Heart
                          className={app.isStarred ? "fill-red-500" : ""}
                        />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}