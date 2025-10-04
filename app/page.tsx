"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProfileCard } from "@/components/profile-card";
import { ProfileCardData } from "@/lib/dummy-data";
import {
  Star,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Search,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { getVideoEmbedInfo, getVideoPlatformName } from "@/lib/video-utils";
import { VideoPlayer } from "@/components/ui/video-player";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

type FeaturedApp = {
  title: string;
  description: string;
  image: string;
  screenshot_url: any;
  video_url?: string | null;
  category: string;
  stars: number;
  id: string;
};

export default function Home() {
  const [featuredApps, setFeaturedApps] = useState<FeaturedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlides, setCurrentSlides] = useState<{ [key: string]: number }>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfiles, setShowProfiles] = useState(false);
  const [searchResults, setSearchResults] = useState<ProfileCardData[]>([]); // New state for search results
  const [searchLoading, setSearchLoading] = useState(false); // New state for search loading
  const [searchResultsDescription, setSearchResultsDescription] = useState<string | null>(null); // New state for search results description

  useEffect(() => {
    fetchFeaturedApps();
  }, []);

  useEffect(() => {
    if (searchLoading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [searchLoading]);

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim() !== "") {
      setSearchLoading(true);
      setShowProfiles(false);
      setSearchResults([]); 

      try {
        const edgeFunctionUrl = process.env.NEXT_PUBLIC_SUPABASE_HYBRID_SEARCH_URL;

        if (!edgeFunctionUrl) {
          console.error("NEXT_PUBLIC_SUPABASE_HYBRID_SEARCH_URL is not defined.");
          return;
        }

        // Step 1: Use LLM to convert natural query to structured JSON
        const structuredQueryResponse = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are an expert at extracting key information from job search queries. Your task is to parse the user's query and extract the following fields into a JSON object:
              - "role_designation": The job role or designation (e.g., "full stack developer", "frontend engineer").
              - "skills": A comma-separated list of technical skills (e.g., "React, Node.js, Python").
              - "years_of_experience": The years of experience, if specified (e.g., "2 years", "5+ years").
              - "ctc": The expected CTC or salary range, if specified (e.g., "20 LPA", "15-25 LPA").
              
              If a field is not explicitly mentioned or cannot be inferred, it should be omitted from the JSON.
              
              Example User Query: "full stack developer with 2 years of experience in React and Node.js, expecting 20 LPA"
              Example JSON Output:
              {
                "role_designation": "full stack developer",
                "skills": "React, Node.js",
                "years_of_experience": "2 years",
                "ctc": "20 LPA"
              }
              
              Example User Query: "frontend engineer with strong JavaScript skills"
              Example JSON Output:
              {
                "role_designation": "frontend engineer",
                "skills": "JavaScript"
              }
              
              Example User Query: "data scientist"
              Example JSON Output:
              {
                "role_designation": "data scientist"
              }
              `,
            },
            {
              role: "user",
              content: searchQuery,
            },
          ],
          model: "gpt-3.5-turbo", // You can use a more capable model if needed
          response_format: { type: "json_object" },
        });

        const structuredQueryParams = JSON.parse(structuredQueryResponse.choices[0].message.content || "{}");

        const response = await fetch(edgeFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` 
          },
          body: JSON.stringify({
            query: JSON.stringify(structuredQueryParams),
            llm_config: {enabled:true},
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const profileIdsWithScores = data.map((item: any) => ({ profile_id: item.id || item.profile_id, score: item.semantic_similarity || item.score }));
        const profileIds = profileIdsWithScores.map((item: any) => item.profile_id);

        const { data: profileEmbeddingsData, error: profileEmbeddingsError } = await supabase
          .from("profile_embeddings")
          .select("id, content")
          .in("id", profileIds);

        if (profileEmbeddingsError) {
          throw profileEmbeddingsError;
        }

        const { data: menteeDetailsRaw, error: menteeDetailsError } = await supabase
          .from("mentee_details")
          .select("profile_id, role, tech_stack, current_location, current_ctc, expected_ctc")
          .in("profile_id", profileIds);

        if (menteeDetailsError) {
          throw menteeDetailsError;
        }

        const menteeDetailsData = menteeDetailsRaw;

        const profileEmbeddingsMap = new Map(profileEmbeddingsData.map((item: any) => [item.id, item]));
        const menteeDetailsMap = new Map(menteeDetailsData.map((item: any) => [item.profile_id, item]));

        const profilesForLLM = await Promise.all(profileIds.map(async (id: string) => {
          const profileEmbedding = profileEmbeddingsMap.get(id);
          const menteeDetail = menteeDetailsMap.get(id);
          
          let parsedResumeContent = null;

          /* if (profile && profile.resume) {
            parsedResumeContent = await parseGoogleDrivePdf(profile.resume);
          } */

          return {
            profile_id: id,
            profile_embedding_content: profileEmbedding ? profileEmbedding.content : null,
            mentee_role: menteeDetail ? menteeDetail.role : null,
            mentee_tech_stack: menteeDetail ? menteeDetail.tech_stack : null,
            mentee_current_location: menteeDetail ? menteeDetail.current_location : null,
            mentee_current_ctc: menteeDetail ? menteeDetail.current_ctc : null,
            mentee_expected_ctc: menteeDetail ? menteeDetail.expected_ctc : null,
            //parsedResumeContent,
          };
        }));

        // const llmPrompt = `User query: "${searchQuery}" Task: 1. The role mentioned in the query is the top priority.
        // Only return profiles that clearly match this role. - Matching should be case-insensitive and allow minor spacing or wording
        // variations. 2. If the query specifies years of experience, it must strictly apply to the same role only.
        // - Do not match profiles where the years of experience belong to a different role.
        // 3. Among valid role matches, use skills, context, and experience (for that role only) to decide relevance.
        // 4. Never exclude any profile if it correctly matches both the role and experience criteria.
        // 5. Output must ONLY be valid JSON in the format: { "profile_ids": ["123", "456", "789"] }
        // Profiles (complete data provided, do not re-filter beyond relevance): ${JSON.stringify(profilesForLLM)}`;

        // const llmResponse = await openai.chat.completions.create({
        //   messages: [
        //     {
        //       role: "system",
        //       content: "You are a strict assistant for role-based talent matching. Always return a JSON object with only one key: 'profile_ids'. Prioritize role first, then experience for that role.",
        //     },
        //     {
        //       role: "user",
        //       content: llmPrompt,
        //     },
        //   ],
        //   model: "gpt-3.5-turbo",
        //   response_format: { type: "json_object" },
        // });

        // const llmResult = JSON.parse(llmResponse.choices[0].message.content || "{}");
        // const refinedProfileIds = llmResult.profile_ids || [];

        const refinedProfileIds = profilesForLLM.map((item: any) => item.profile_id);

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, avatar_url, cohort_number, bio, track, skills, designation, years_of_experience, location")
          .in("id", refinedProfileIds);

        if (profilesError) {
          throw profilesError;
        }

        // Create a map for quick lookup of profiles by ID
        const profilesMap = new Map(profilesData.map((profile: any) => [profile.id, profile]));

        // Order profiles based on the order of refinedProfileIds from the LLM
        const orderedProfilesData = refinedProfileIds
          .map((id: string) => profilesMap.get(id))
          .filter(Boolean); // Filter out any null/undefined if a profile_id didn't match

        const formattedResults: ProfileCardData[] = orderedProfilesData.map((profile: any) => ({
          id: profile.id,
          name: profile.name,
          avatar_url: profile.avatar_url,
          cohort_number: profile.cohort_number,
          bio: profile.bio,
          skills: profile.skills,
          background: profile.background,
          track: profile.track,
          designation: profile.designation,
          years_of_experience: profile.years_of_experience,
          location: profile.location,
          // connect_url: profile.connect_url,
        }));
        setSearchResults(formattedResults);

        // Generate AI description
        const chatCompletion = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that summarizes search results for talent hiring.",
            },
            {
              role: "user",
              content: `Summarize the search results for "${JSON.stringify(structuredQueryParams)}" which returned ${formattedResults.length} talent.`,
            },
          ],
          model: "gpt-3.5-turbo",
        });

        setSearchResultsDescription(chatCompletion.choices[0].message.content || "");
        setShowProfiles(true);  
      } catch (error) {
        console.error("Error during semantic search:", error);
        // Optionally, display an error message to the user
      } finally {
        setSearchLoading(false);
      }
    }
  };

  // Helper function to get media items for slideshow
  const getMediaItems = (app: FeaturedApp) => {
    const items: Array<{ type: "image" | "video"; src: string; alt?: string }> = [];

    // Add screenshots
    if (app.screenshot_url) {
      let screenshots: string[] = [];

      // Handle different screenshot_url formats
      if (typeof app.screenshot_url === "string") {
        try {
          // Try to parse as JSON array first
          if (app.screenshot_url.startsWith("[")) {
            screenshots = JSON.parse(app.screenshot_url);
          } else {
            // Single URL
            screenshots = [app.screenshot_url];
          }
        } catch {
          // Fallback to single URL
          screenshots = [app.screenshot_url];
        }
      } else if (Array.isArray(app.screenshot_url)) {
        screenshots = app.screenshot_url;
      }

      screenshots.forEach((url) => {
        if (url && url.startsWith("http")) {
          items.push({
            type: "image",
            src: url,
            alt: app.title,
          });
        }
      });
    }

    // Add video if available
    if (app.video_url) {
      const videoInfo = getVideoEmbedInfo(app.video_url);
      if (videoInfo.embedUrl) {
        items.push({
          type: "video",
          src: videoInfo.embedUrl,
          alt: `${app.title} - ${getVideoPlatformName(videoInfo)} Video`,
        });
      }
    }

    return items;
  };

  const nextSlide = (appId: string) => {
    const app = featuredApps.find((a) => a.id === appId);
    if (!app) return;

    const mediaItems = getMediaItems(app);
    if (mediaItems.length <= 1) return;

    setCurrentSlides((prev) => ({
      ...prev,
      [appId]: (prev[appId] || 0 + 1) % mediaItems.length,
    }));
  };

  const prevSlide = (appId: string) => {
    const app = featuredApps.find((a) => a.id === appId);
    if (!app) return;

    const mediaItems = getMediaItems(app);
    if (mediaItems.length <= 1) return;

    setCurrentSlides((prev) => ({
      ...prev,
      [appId]: (prev[appId] || 0 - 1 + mediaItems.length) % mediaItems.length,
    }));
  };

  const fetchFeaturedApps = async () => {
    try {
      // First, get the applications with their star counts
      const { data: appsWithStars, error: countError } = await supabase
        .from("applications")
        .select(
          `
          id,
          star_count:stars(count)
        `
        )
        .eq("status", "approved");

      if (countError) throw countError;

      // Sort applications by star count and get top 3 IDs
      const topAppIds = appsWithStars
        .sort(
          (a, b) =>
            (b.star_count[0]?.count || 0) - (a.star_count[0]?.count || 0)
        )
        .slice(0, 3)
        .map((app) => app.id);

      // Fetch full details for top 3 applications
      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select(
          `
          *,
          stars(count),
          creator:profiles!creator_id(user_id, role)
        `
        )
        .in("id", topAppIds);

      if (appsError) throw appsError;

      // Sort the results to maintain the order by star count
      const sortedApps = apps.sort((a, b) => {
        const aStars = a.stars[0]?.count || 0;
        const bStars = b.stars[0]?.count || 0;
        return bStars - aStars;
      });

      const formattedApps = sortedApps.map((app) => ({
        title: app.title,
        description: app.description,
        image: app.screenshot_url,
        screenshot_url: app.screenshot_url,
        video_url: app.video_url,
        category: app.tags[0] || "General",
        stars: app.stars[0]?.count || 0,
        id: app.id,
      }));

      setFeaturedApps(formattedApps);
    } catch (error) {
      console.error("Error fetching featured apps:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-background">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        <div className="absolute inset-0 grid-pattern" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
            {/* <span className="text-foreground">Welcome to</span>{" "}
            <span className="text-orange-500">
              <span className="font-bold text-black">100</span>
              <span className="text-orange-500">x</span>
              <span className="text-black">Engineers</span>
            </span> */}
            <span className="font-bold text-black">Find 100</span>
            <span className="text-orange-500">x</span>
            <span className="font-bold text-black">Talent</span>
          </h1>

          <p className="mt-6 text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 font-mono">
            Search for top engineers and connect with them.
          </p>

          <div className="relative w-full max-w-3xl mx-auto mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search full stack developer with 2 years of experience"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                handleSearch(e);
              }}
            />
          </div>

          {/* <div className="flex justify-center gap-6">
            <Button
              size="lg"
              className="text-lg px-8 bg-orange-500 hover:bg-orange-500/90 text-white"
              asChild
            >
              <Link href="/profiles">Explore Talent</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 border-orange-500 text-orange-500 hover:bg-orange-500/10"
              asChild
            >
              <Link href="/submit">Submit Your App</Link>
            </Button>
          </div> */}
           {showProfiles && !searchLoading && searchResults.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          {searchResultsDescription && (
            <p className="text-lg text-muted-foreground mb-6 text-center">
              {searchResultsDescription}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {searchResults.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        </div>
      )}
        </div>
        
      </div>

      {searchLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mb-4"></div>
            <h2 className="text-xl font-bold text-white">
              Searching for "{searchQuery}"...
            </h2>
          </div>
        </div>
      )}

     

      {showProfiles && !searchLoading && searchResults.length === 0 && searchQuery.trim() !== "" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
          <h2 className="text-3xl font-bold text-orange-500 mb-8">
            No results found for "{searchQuery}"
          </h2>
        </div>
      )}

      {/* Featured Profiles */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background/90" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-orange-500">
              Featured Applications
            </h2>
            <p className="text-muted-foreground mt-2">
              Discover top engineers from our community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading
              ? [...Array(3)].map((_, i) => (
                  <Card
                    key={i}
                    className="overflow-hidden animate-pulse bg-card/50 backdrop-blur border-orange-500/10"
                  >
                    <div className="aspect-video bg-muted" />
                    <div className="p-6">
                      <div className="h-4 w-24 bg-muted rounded mb-2" />
                      <div className="h-6 w-48 bg-muted rounded mb-4" />
                      <div className="h-4 w-full bg-muted rounded" />
                    </div>
                  </Card>
                ))
              : featuredApps.map((app, index) => (
                  <Card
                    key={index}
                    className="overflow-hidden hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 border-orange-500/10 hover:border-orange-500/20 bg-card/50 backdrop-blur"
                  >
                    <div className="aspect-video w-full overflow-hidden relative group">
                      {(() => {
                        const mediaItems = getMediaItems(app);
                        const currentSlide = currentSlides[app.id] || 0;

                        if (mediaItems.length === 0) {
                          return (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                              No media available
                            </div>
                          );
                        }

                        return (
                          <>
                            {/* Current slide */}
                            <div className="relative w-full h-full">
                              {mediaItems[currentSlide].type === "image" ? (
                                <Image
                                  src={mediaItems[currentSlide].src}
                                  alt={
                                    mediaItems[currentSlide].alt || app.title
                                  }
                                  fill
                                  className="object-cover hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <VideoPlayer
                                  videoUrl={app.video_url || ""}
                                  title={app.title}
                                  className="w-full h-full"
                                />
                              )}
                            </div>

                            {/* Navigation arrows */}
                            {mediaItems.length > 1 && (
                              <Button
                                variant="secondary"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                onClick={(e) => {
                                  e.preventDefault();
                                  prevSlide(app.id);
                                }}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                            )}
                            {mediaItems.length > 1 && (
                              <Button
                                variant="secondary"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                onClick={(e) => {
                                  e.preventDefault();
                                  nextSlide(app.id);
                                }}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Slide indicators */}
                            {mediaItems.length > 1 && (
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                {mediaItems.map((_, index) => (
                                  <button
                                    key={index}
                                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                      index === currentSlide
                                        ? "bg-white"
                                        : "bg-white/50 hover:bg-white/70"
                                    }`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setCurrentSlides((prev) => ({
                                        ...prev,
                                        [app.id]: index,
                                      }));
                                    }}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Media counter */}
                            {mediaItems.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black/50 text-white px-1.5 py-0.5 rounded text-xs">
                                {currentSlide + 1} / {mediaItems.length}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-semibold mb-2 text-foreground">
                          {app.title}
                        </h3>

                        <div className="flex items-center text-orange-500">
                          <Star className="w-4 h-4 mr-1 fill-orange-500" />
                          <span>{app.stars}</span>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-4 line-clamp-1 mt-2">
                        {app.description}
                      </p>

                      <Button
                        className="w-full bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
                        asChild
                      >
                        <Link href={`/applications/${app.id}`}>
                          View Details <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/applications"
              className="inline-flex items-center text-lg font-semibold text-orange-500 border border-orange-500 px-4 py-2 rounded-md hover:text-white/80 hover:bg-orange-500/10 transition-colors"
            >
              View All Applications
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      {/* <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-orange-500 mb-4">
            Why Choose 100xEngineers?
          </h2>
          <p className="text-xl text-muted-foreground">
            The perfect platform for developers to showcase their work
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center p-8 rounded-lg bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10 transition-colors">
            <Sparkles className="h-12 w-12 text-orange-500 mb-4" />
            <h3 className="text-xl font-semibold text-orange-500 mb-3">
              Centralized Hub
            </h3>
            <p className="text-muted-foreground text-center">
              Manage and showcase your web applications in one place.
            </p>
          </div>

          <div className="flex flex-col items-center p-8 rounded-lg bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10 transition-colors">
            <Users className="h-12 w-12 text-orange-500 mb-4" />
            <h3 className="text-xl font-semibold text-orange-500 mb-3">
              Developer Focused
            </h3>
            <p className="text-muted-foreground text-center">
              Built by developers, for developers. Share your work with the
              community.
            </p>
          </div>

          <div className="flex flex-col items-center p-8 rounded-lg bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10 transition-colors">
            <Rocket className="h-12 w-12 text-orange-500 mb-4" />
            <h3 className="text-xl font-semibold text-orange-500 mb-3">
              Launch & Grow
            </h3>
            <p className="text-muted-foreground text-center">
              Get visibility, feedback, and grow your application with our
              community.
            </p>
          </div>
        </div>
      </section> */}
    </div>
  );
}
