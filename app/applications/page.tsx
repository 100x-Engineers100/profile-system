"use client";

import { useEffect, useState } from "react";
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
};

export default function ApplicationsPage() {
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
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by category" />
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
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="highest-rated">Highest Rated</SelectItem>
                    <SelectItem value="lowest-rated">Lowest Rated</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {filteredAndSortedApplications.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Showing {filteredAndSortedApplications.length} of{" "}
                  {applications.length} applications
                </span>
              )}
              {(selectedCategory !== "all" || sortBy !== "newest") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSortBy("newest");
                  }}
                >
                  Clear Filters
                </Button>
              )}
              <Link href="/submit">
                <Button variant="default" size="sm">
                  Create New Application
                </Button>
              </Link>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="h-[200px] w-full bg-muted animate-pulse rounded-lg mb-4" />
                <div className="h-4 w-3/4 bg-muted animate-pulse mb-2" />
                <div className="h-4 w-1/2 bg-muted animate-pulse" />
              </Card>
            ))}
          </div>
        ) : filteredAndSortedApplications.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {searchQuery || selectedCategory !== "all"
              ? "No applications found matching your filters. Try adjusting your search or category filter."
              : "No applications found. Be the first to submit one!"}
          </div>
        ) : (
          <>
            {/* Admin Applications Section */}
            {filteredAndSortedApplications.some(
              (app) => app.creator?.role === "admin"
            ) && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                  Featured Apps (
                  {
                    filteredAndSortedApplications.filter(
                      (app) => app.creator?.role === "admin"
                    ).length
                  }
                  )
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {filteredAndSortedApplications
                    .filter((app) => app.creator?.role === "admin")
                    .map((app) => (
                      <Link
                        href={`/applications/${app.id}`}
                        key={app.id}
                        className="block group"
                      >
                        <Card className="overflow-hidden w-full max-w-[280px] justify-self-center transition-transform hover:scale-[1.02] h-[370px]">
                          <div className="flex flex-col h-full">
                            <div className="relative w-full aspect-square max-h-[200px]">
                              <Image
                                src={getFirstScreenshotUrl(app.screenshot_url)}
                                alt={app.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="p-3 flex flex-col h-[200px]">
                              <div className="flex justify-between items-start gap-2">
                                <p className="font-semibold text-base line-clamp-1 group-hover:text-primary">
                                  {app.title}
                                </p>
                                <div className="flex items-center gap-2">
                                  {app.creator?.role === "admin" && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Admin⚡
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {app.tags.slice(0, 2).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-xs px-3 py-1"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {app.tags.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    {/* +{app.tags.length - 3} */}{" "}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                                {app.description}
                              </p>
                              <div className="flex justify-between items-center mt-auto">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleStar(app.id, app.isStarred);
                                  }}
                                  className={
                                    app.isStarred ? "text-orange-500" : ""
                                  }
                                >
                                  <Star
                                    className={`h-4 w-4 mr-1 ${
                                      app.isStarred ? "fill-orange-500" : ""
                                    }`}
                                  />
                                  <span className="text-xs">{app.stars}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.open(app.url, "_blank");
                                  }}
                                  className="text-xs"
                                >
                                  Visit{" "}
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {/* Regular Applications Section */}
            {filteredAndSortedApplications.some(
              (app) => app.creator?.role !== "admin"
            ) && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">
                  Capstone Apps (
                  {
                    filteredAndSortedApplications.filter(
                      (app) => app.creator?.role !== "admin"
                    ).length
                  }
                  )
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {filteredAndSortedApplications
                    .filter((app) => app.creator?.role !== "admin")
                    .map((app) => (
                      <Link
                        href={`/applications/${app.id}`}
                        key={app.id}
                        className="block group"
                      >
                        <Card className="overflow-hidden w-full max-w-[280px] justify-self-center transition-transform hover:scale-[1.02] h-[370px]">
                          <div className="flex flex-col h-full">
                            <div className="relative w-full aspect-square max-h-[200px]">
                              <Image
                                src={getFirstScreenshotUrl(app.screenshot_url)}
                                alt={app.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="p-3 flex flex-col h-[200px]">
                              <div className="flex justify-between items-start gap-2">
                                <p className="font-semibold text-base line-clamp-1 group-hover:text-primary">
                                  {app.title}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/users/${app.creator_user_id}`}
                                    className="text-xs text-muted-foreground hover:text-primary whitespace-nowrap"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    @{app.creator_user_id}
                                  </Link>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {app.tags.slice(0, 2).map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-xs px-3 py-1"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {app.tags.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    {/* +{app.tags.length - 3} */}{" "}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                                {app.description}
                              </p>
                              <div className="flex justify-between items-center mt-auto">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleStar(app.id, app.isStarred);
                                  }}
                                  className={
                                    app.isStarred ? "text-orange-500" : ""
                                  }
                                >
                                  <Star
                                    className={`h-4 w-4 mr-1 ${
                                      app.isStarred ? "fill-orange-500" : ""
                                    }`}
                                  />
                                  <span className="text-xs">{app.stars}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.open(app.url, "_blank");
                                  }}
                                  className="text-xs"
                                >
                                  Visit{" "}
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
