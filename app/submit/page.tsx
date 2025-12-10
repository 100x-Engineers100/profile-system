"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { useState, useEffect, useRef } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { MarkdownPreview } from "@/components/ui/markdown-preview";
import { MarkdownHelp } from "@/components/ui/markdown-help";
import { Info, Search, X, User } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { PROJECT_CATEGORIES, TEAM_TYPES } from "@/types";
import { getVideoEmbedInfo, getVideoPlatformName } from "@/lib/video-utils";

export default function SubmitPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  // New state variables
  const [projectCategories, setProjectCategories] = useState<string[]>([]);
  const [teamType, setTeamType] = useState("");
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search for team members - Fixed version
  const searchTeamMembers = async (query: string) => {
    if (!query.trim() || !profile?.id) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, name, email")
        .or(`user_id.ilike.%${query}%,name.ilike.%${query}%`)
        .neq("id", profile.id) // Exclude the current user
        .limit(10);

      if (error) throw error;

      // Filter out any results that might have null values
      const filteredResults = (data || []).filter(
        (member) => member.id && member.user_id && member.name
      );

      setSearchResults(filteredResults);
    } catch (error) {
      console.error("Error searching team members:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input change with debouncing - Fixed version
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim()) {
      // Debounce the search to avoid too many API calls
      searchTimeoutRef.current = setTimeout(() => {
        searchTeamMembers(value);
      }, 300);
    } else {
      setSearchResults([]);
    }
  };
  // Add team member
  const addTeamMember = (member: any) => {
    if (selectedTeamMembers.length >= 4) {
      toast({
        title: "Error",
        description: "Maximum 4 team members allowed",
        variant: "destructive",
      });
      return;
    }

    if (selectedTeamMembers.find((m) => m.id === member.id)) {
      toast({
        title: "Error",
        description: "Team member already added",
        variant: "destructive",
      });
      return;
    }

    // Prevent adding the current user
    if (member.id === profile?.id) {
      toast({
        title: "Error",
        description: "You cannot add yourself as a team member",
        variant: "destructive",
      });
      return;
    }

    setSelectedTeamMembers([...selectedTeamMembers, member]);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  // Remove team member
  const removeTeamMember = (memberId: string) => {
    setSelectedTeamMembers(
      selectedTeamMembers.filter((m) => m.id !== memberId)
    );
  };

  // Handle search input change with debouncing
  // const handleSearchChange = (value: string) => {
  //   setSearchQuery(value);

  //   // Clear previous timeout
  //   if (searchTimeoutRef.current) {
  //     clearTimeout(searchTimeoutRef.current);
  //   }

  //   if (value.trim()) {
  //     // Debounce the search to avoid too many API calls
  //     searchTimeoutRef.current = setTimeout(() => {
  //       searchTeamMembers(value);
  //     }, 300);
  //   } else {
  //     setSearchResults([]);
  //   }
  // };

  // Clear team members when team type changes to solo
  useEffect(() => {
    if (teamType === "solo") {
      setSelectedTeamMembers([]);
      setSearchQuery("");
      setSearchResults([]);
      setIsSearchOpen(false);
    }
  }, [teamType]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile) {
      toast({
        title: "Error",
        description: "You must be logged in to submit an application",
        variant: "destructive",
      });
      return;
    }

    if (screenshotUrls.length === 0) {
      toast({
        title: "Error",
        description:
          "Please upload at least one screenshot of your application",
        variant: "destructive",
      });
      return;
    }

    if (projectCategories.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one project category",
        variant: "destructive",
      });
      return;
    }

    if (!teamType) {
      toast({
        title: "Error",
        description: "Please select a team type",
        variant: "destructive",
      });
      return;
    }

    if (teamType === "team" && selectedTeamMembers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one team member for team projects",
        variant: "destructive",
      });
      return;
    }

    if (screenshotUrls.length > 3) {
      toast({
        title: "Error",
        description: "Maximum 3 screenshots allowed",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      // Process tags
      const tags =
        formData
          .get("tags")
          ?.toString()
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean) || [];

      // Validate video URL if provided
      const videoUrl = formData.get("video_url")?.toString();
      if (videoUrl && videoUrl.trim()) {
        const videoInfo = getVideoEmbedInfo(videoUrl);
        if (!videoInfo.embedUrl) {
          toast({
            title: "Invalid Video URL",
            description:
              "Please provide a valid video URL from YouTube, Google Drive, Loom, or Vimeo",
            variant: "destructive",
          });
          return;
        }
      }

      // Create the application
      const { data: app, error } = await supabase
        .from("applications")
        .insert({
          title: formData.get("title"),
          description: description,
          url: formData.get("url"),
          screenshot_url: screenshotUrls,
          video_url: formData.get("video_url") || null,
          tags,
          project_categories: projectCategories,
          team_type: teamType,
          team_members:
            teamType === "team"
              ? selectedTeamMembers.map((m) => ({
                  id: m.id,
                  user_id: m.user_id,
                  name: m.name,
                }))
              : null,
          creator_id: profile.id,
          comments_enabled: false,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger embedding generation for the new application
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embeddings-v2`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            applications: [
              {
                application_id: app.id,
                content: `${app.title} ${app.description} ${(app.tags || []).join(' ')} ${(app.project_categories || []).join(' ')} ${(app.team_members || []).map((member: any) => member.name).join(' ')}`,
              },
            ],
            profiles: [
              {
                profile_id: profile.id,
                content: [
                  profile.name ? `Name: ${profile.name}` : '',
                  profile.bio ? `Bio: ${profile.bio}` : '',
                  profile.designation ? `Designation: ${profile.designation}` : '',
                  profile.company ? `Company: ${profile.company}` : '',
                  profile.location ? `Location: ${profile.location}` : '',
                  profile.skills ? `Skills: ${profile.skills}` : '',
                  profile.years_of_experience ? `Years of Experience: ${profile.years_of_experience}` : '',
                  profile.cohort_number ? `Cohort Number: ${profile.cohort_number}` : '',
                  profile.is_student ? `Is Student: ${profile.is_student}` : '',
                  profile.working_professional ? `Working Professional: ${profile.working_professional}` : '',
                  profile.study_stream ? `Study Stream: ${profile.study_stream}` : '',
                  profile.expected_outcomes ? `Expected Outcomes: ${profile.expected_outcomes}` : '',
                  profile.track ? `Track: ${profile.track}` : '',
                  profile.founder ? `Founder: ${profile.founder}` : '',
                  profile.founder_details ? `Founder Details: ${profile.founder_details}` : '',
                  profile.code_type ? `Code Type: ${profile.code_type}` : '',
                  profile.current_industry ? `Current Industry: ${profile.current_industry}` : '',
                  profile.domain ? `Domain: ${profile.domain}` : '',
                  profile.target_industries ? `Target Industries: ${profile.target_industries}` : '',
                  profile.industry_interest ? `Industry Interest: ${profile.industry_interest}` : '',
                  profile.interest_areas ? `Interest Areas: ${profile.interest_areas}` : '',
                  profile.open_to_work ? `Open to Work: ${profile.open_to_work}` : '',
                  profile.house ? `House: ${profile.house}` : '',
                ].filter(Boolean).join(' \n '),
                name: profile.name,
                bio: profile.bio,
                skills: profile.skills,
                years_of_experience: profile.years_of_experience,
                location: profile.location,
                target_industries: profile.target_industries || [],
                designation: profile.designation,
                house: profile.house,
                cohort_number: profile.cohort_number,
                current_ctc: null, // Assuming current_ctc is not directly available in profile object
                expected_ctc: null, // Assuming expected_ctc is not directly available in profile object
                resume_content: profile.resume,
              },
            ],
          }),
        }
      );

      // Get all admin users
      const { data: admins, error: adminError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (adminError) throw adminError;

      // Create notifications for all admins
      if (admins && admins.length > 0) {
        const adminNotifications = admins.map((admin) => ({
          user_id: admin.id,
          title: "New Application Submission",
          message: `${profile.user_id} submitted "${formData.get(
            "title"
          )}" for review`,
          application_id: app.id,
          type: "submission",
          action_user_id: profile.id,
          read: false,
        }));

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert(adminNotifications);

        if (notificationError) throw notificationError;
      }

      toast({
        title: "Success",
        description: "Your application has been submitted for review",
      });

      router.push("/profile");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="p-6">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="mb-4">
              You need to be logged in to submit an application.
            </p>
            <Button onClick={() => router.push("/login")}>Go to Login</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <h1 className="text-3xl font-bold mb-6">Submit Your Application</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Application Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter your application title"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="description">Description</Label>
                <MarkdownHelp />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Textarea
                    id="description"
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[200px]"
                    placeholder="Describe your application in detail..."
                    maxLength={1000}
                    required
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Markdown supported</span>
                    <span>{description.length}/1000 characters</span>
                  </div>
                </div>
                <div className="border rounded-md p-4">
                  <h3 className="text-sm font-medium mb-2">Preview</h3>
                  <MarkdownPreview content={description} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Application URL</Label>
              <Input
                id="url"
                name="url"
                type="url"
                placeholder="https://your-app.com"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="video_url">Demo Video</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-2">
                        <p>
                          Share a video demonstrating your application's
                          functionality.
                        </p>
                        <p>
                          <b>Supported platforms:</b>
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>YouTube (public videos)</li>
                          <li>Google Drive (public access required)</li>
                          <li>Loom (public recordings)</li>
                          <li>Vimeo (public videos)</li>
                        </ul>
                        <p className="text-xs text-muted-foreground mt-2">
                          Make sure your video has public access permissions.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="video_url"
                name="video_url"
                type="url"
                placeholder="https://drive.google.com/file/d/.../view"
                required
              />
              <p className="text-xs text-muted-foreground">
                We'll automatically detect the platform and convert it to the
                proper embed format.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Upload up to 3 screenshots at once (Max 3MB each)
              </p>
              <FileUpload
                onUploadComplete={(url) => {
                  setScreenshotUrls((prev) => [...prev, url]);
                }}
                onRemove={(url) => {
                  setScreenshotUrls((prev) => prev.filter((u) => u !== url));
                }}
                multiple={true}
                maxFiles={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="react, typescript, web3"
              />
            </div>

            {/* Project Categories */}
            <div className="space-y-2">
              <Label>Project Categories *</Label>
              <p className="text-sm text-muted-foreground">
                Select one or more categories that apply to your project
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {projectCategories.length === 0
                      ? "Select categories..."
                      : `${projectCategories.length} selected`}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <div className="p-2">
                    {PROJECT_CATEGORIES.map((category) => (
                      <div
                        key={category}
                        className="flex items-center space-x-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer"
                        onClick={() => {
                          if (projectCategories.includes(category)) {
                            setProjectCategories(
                              projectCategories.filter((c) => c !== category)
                            );
                          } else {
                            setProjectCategories([
                              ...projectCategories,
                              category,
                            ]);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={projectCategories.includes(category)}
                          readOnly
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{category}</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {projectCategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {projectCategories.map((category) => (
                    <Badge
                      key={category}
                      variant="secondary"
                      className="px-2 py-1"
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Team Type */}
            <div className="space-y-2">
              <Label htmlFor="team_type">Team Type *</Label>
              <Select value={teamType} onValueChange={setTeamType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select team type" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Members Selection - Only show when team type is "team" */}
            {teamType === "team" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Team Members (Max 4)</Label>
                  <p className="text-sm text-muted-foreground">
                    Search and select up to 4 team members by name or user ID
                  </p>
                </div>

                {/* Team Member Search */}
                <div className="space-y-2">
                  <Popover
                    open={isSearchOpen}
                    onOpenChange={(open) => {
                      setIsSearchOpen(open);
                      // Clear search when closing
                      if (!open) {
                        setSearchQuery("");
                        setSearchResults([]);
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isSearchOpen}
                        className="w-full justify-between"
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Search team members...
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search by name or user ID..."
                          value={searchQuery}
                          onValueChange={handleSearchChange}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isSearching
                              ? "Searching..."
                              : searchQuery.trim()
                                ? "No team members found."
                                : "Start typing to search..."}
                          </CommandEmpty>
                          <CommandGroup>
                            {searchResults.map((member) => (
                              <CommandItem
                                key={member.id}
                                onSelect={() => addTeamMember(member)}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {member.name}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      @{member.user_id}
                                    </span>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Selected Team Members */}
                {selectedTeamMembers.length > 0 && (
                  <div className="space-y-2">
                    <Label>
                      Selected Team Members ({selectedTeamMembers.length}/4)
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeamMembers.map((member) => (
                        <Badge
                          key={member.id}
                          variant="secondary"
                          className="flex items-center gap-2 px-3 py-1"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{member.name}</span>
                            {/* <span className="text-xs text-muted-foreground">
                              @{member.user_id}
                            </span> */}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTeamMember(member.id)}
                            className="h-4 w-4 p-0 hover:bg-transparent"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/profile")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
    </Suspense>
  );
}