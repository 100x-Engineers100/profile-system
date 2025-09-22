"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Save,
  X,
  Mail,
  User,
  LogOut,
  Briefcase,
  CheckCircle,
  Code,
  Users,
  Info,
  Lightbulb,
  BarChart,
  Percent,
  CheckSquare,
  FileText
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import type { Application } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationCard } from "@/components/application-card";

type Profile = {
  id?: string;
  user_id: string;
  email?: string;
  public_email?: boolean;
  avatar_url?: string;
  role?: string;
  created_at?: string;
  name?: string;
  cohort_number?: string;
  password?: string;
  bio?: string;
  skills?: string;
  designation?: string;
  years_of_experience?: string;
  location?: string;
  is_student?: string;
  working_professional?: string;
  study_stream?: string;
  company?: string;
  expected_outcomes?: string;
  resume?: string;
  linkedIn?: string;
  track?: string;
  founder?: string;
  founder_details?: string;
  code_type?: string;
  current_industry?: string;
  domain?: string;
  target_industries?: string;
  industry_interest?: string;
  interest_areas?: string;
  open_to_work?: string;
  house?: string;
  interests?: string[];
  github_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  batch_name?: string;
  attendance_rate?: number;
  completion_rate?: number;
  assignments_submitted?: number;
  lms_userid?: string;
};

interface LmsClassData {
  bundle_id: number;
  course_name: string;
  total_classes: number;
  present: string;
  batch_start_date: number | null;
  batch_end_date: number | null;
  batch_progress: number;
  absent: string;
  late: string;
  excused: string;
  master_batch_id: number;
  master_batch_name: string;
  classusers_start_date: number;
  classusers_end_date: number;
  batch_status: number;
  mb_user_status: number;
  mb_user_state: number;
}

interface LmsApiResponse {
  code: number;
  message: string;
  classes: LmsClassData[];
}

type ProfileApplication = Application & {
  stars: number;
  isStarred: boolean;
  creator_user_id?: string;
  screenshot_url:string[];
  tags?: string[]; // Add tags property
};

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [myApplications, setMyApplications] = useState<ProfileApplication[]>(
    []
  );
  const [likedApplications, setLikedApplications] = useState<
    ProfileApplication[]
  >([]);
  const [activeMainTab, setActiveMainTab] = useState<"applications" | "progress">("applications");
  const [activeApplicationTab, setActiveApplicationTab] = useState<"my" | "liked">("my");
  const [responses, setResponses] = useState<any[]>([]);
  const [overallAttendancePercentage, setOverallAttendancePercentage] = useState<number | null>(null);
  const [moduleProgress, setModuleProgress] = useState<LmsClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUserId, setEditedUserId] = useState("");
  const [editedPublicEmail, setEditedPublicEmail] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [editedName, setEditedName] = useState("");
  useEffect(() => {
    if (user && profile) {
      setMyProfile(profile);
      setEditedUserId(profile.user_id || "");
      setEditedPublicEmail(profile.public_email || false);
      setEditedName(profile.name || "");
      fetchUserData();
    } else if (!user && !loading) {
      router.push("/login");
    }
  }, [user, profile, loading]);

  useEffect(() => {
    if (activeMainTab === "progress" && profile?.id) {
      const fetchResponses = async () => {
        const { data, error } = await supabase
          .from("responses")
          .select("week_number, text_response")
          .eq("profile_id", profile.user_id);

        if (error) {
          console.error("Error fetching responses:", error);
          toast({
            title: "Error",
            description: "Failed to load progress data",
            variant: "destructive",
          });
        } else {
          setResponses(data || []);
        }
      };
      fetchResponses();
    }
  }, [activeMainTab, profile?.id]);

  const fetchUserData = async () => {
    if (!profile?.id) return;

    try {
      // Fetch user's stars first to get the starred application IDs
      const { data: userStars } = await supabase
        .from("stars")
        .select("application_id")
        .eq("user_id", profile.id);

      const starredAppIds = userStars?.map((star) => star.application_id) || [];

      // Fetch user's applications
      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select(
          `
          *,
          stars(count)
        `
        )
        .eq("creator_id", profile.id)
        .order("created_at", { ascending: false });

      if (appsError) throw appsError;

      const formattedApps = apps.map((app: any) => ({
        ...app,
        stars: app.stars[0]?.count || 0,
        isStarred: starredAppIds.includes(app.id),
        creator_user_id: app.creator?.user_id,
        creator_name: app.creator?.name,
      }));

      setMyApplications(formattedApps);

      // Fetch user's profile to get lms_userid
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("lms_userid")
        .eq("id", profile.id)
        .single();

      if (profileError) throw profileError;

      // Call the external API if lms_userid is present
      if (profileData && profileData.lms_userid) {
        const lmsUserId = profileData.lms_userid;
        try {
          const edmingleApiKey = process.env.NEXT_PUBLIC_EDMINGLE_API_KEY;
          if (!edmingleApiKey) {
            console.error('EDMINGLE_API_KEY is not defined. Cannot call external API.');
            return; // Prevent the fetch call if API key is missing
          }

          const apiResponse = await fetch(`https://100xengineers-api.edmingle.com/nuSource/api/v1/admin/batches/attendance/${lmsUserId}`, {
            headers: {
              'apikey': edmingleApiKey,
              'ORGID': '11240',  
            },
          });
          if (!apiResponse.ok) {
            console.error('Error calling external API:', apiResponse.statusText);
          } else {
            const apiData: LmsApiResponse = await apiResponse.json();
            console.log('External API data:', apiData);
            // Process the API data as needed
            if (apiData.code === 200 && apiData.classes) {
              let totalClassesSum = 0;
              let totalPresentSum = 0;
              apiData.classes.forEach(cls => {
                totalClassesSum += cls.total_classes;
                totalPresentSum += parseInt(cls.present);
              });

              if (totalClassesSum > 0) {
                const percentage = (totalPresentSum / totalClassesSum) * 100;
                setOverallAttendancePercentage(parseFloat(percentage.toFixed(2)));
              } else {
                setOverallAttendancePercentage(0);
              }
              setModuleProgress(apiData.classes);
            }
          }
        } catch (apiError) {
          console.error('Error calling external API:', apiError);
        }
      }

      // Fetch starred applications
      const { data: stars, error: starsError } = await supabase
        .from("stars")
        .select(
          `
          application_id,
          application:applications(
            *,
            stars(count),
            creator:profiles!creator_id(user_id)
          )
        `
        )
        .eq("user_id", profile.id);

      if (starsError) throw starsError;

      const formattedStars = stars
        .filter((star: any) => star.application)
        .map((star: any) => ({
          ...star.application,
          stars: star.application.stars[0]?.count || 0,
          creator_user_id: star.application.creator?.user_id,
          isStarred: true,
        }));

      setLikedApplications(formattedStars);

      const { data: comments, error: commentsError } = await supabase
        .from("comments")
        .select(
          `
          application_id,
          application:applications(
            *,
            stars(count),
            creator:profiles!creator_id(user_id)
          )
        `
        )
        .eq("user_id", profile.id);

      if (commentsError) throw commentsError;

      const uniqueApps = Array.from(
        new Map(
          comments
            .filter((comment: any) => comment.application)
            .map((comment: any) => [
              comment.application.id,
              {
                ...comment.application,
                stars: comment.application.stars[0]?.count || 0,
                creator_user_id: comment.application.creator?.user_id,
                isStarred: starredAppIds.includes(comment.application.id),
              },
            ])
        ).values()
      );
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          public_email: myProfile?.public_email,
          name: myProfile?.name,
          bio: myProfile?.bio,
          skills: myProfile?.skills,
          interests: myProfile?.interests,
          github_url: myProfile?.github_url,
          linkedin_url: myProfile?.linkedin_url,
          portfolio_url: myProfile?.portfolio_url,
          batch_name: myProfile?.batch_name,
          attendance_rate: myProfile?.attendance_rate,
          completion_rate: myProfile?.completion_rate,
          assignments_submitted: myProfile?.assignments_submitted,
          designation: myProfile?.designation,
          years_of_experience: myProfile?.years_of_experience,
          location: myProfile?.location,
          is_student: myProfile?.is_student,
          working_professional: myProfile?.working_professional,
          study_stream: myProfile?.study_stream,
          company: myProfile?.company,
          expected_outcomes: myProfile?.expected_outcomes,
          resume: myProfile?.resume,
          linkedIn: myProfile?.linkedIn,
          track: myProfile?.track,
          founder: myProfile?.founder,
          founder_details: myProfile?.founder_details,
          code_type: myProfile?.code_type,
          current_industry: myProfile?.current_industry,
          domain: myProfile?.domain,
          target_industries: myProfile?.target_industries,
          industry_interest: myProfile?.industry_interest,
          interest_areas: myProfile?.interest_areas,
          open_to_work: myProfile?.open_to_work,
          house: myProfile?.house,
          lms_userid: myProfile?.lms_userid, // Added lms_userid
        })
        .eq("id", profile.id)
        .select();

      if (error) {
        console.error("Update error:", error);
        throw error;
      }

      // Update local state with the returned data
      if (data && data.length > 0) {
        setMyProfile({
          ...myProfile!,
          name: data[0].name,
          bio: data[0].bio,
          skills: data[0].skills,
          designation: data[0].designation,
          years_of_experience: data[0].years_of_experience,
          location: data[0].location,
          is_student: data[0].is_student,
          working_professional: data[0].working_professional,
          study_stream: data[0].study_stream,
          company: data[0].company,
          expected_outcomes: data[0].expected_outcomes,
          resume: data[0].resume,
          linkedIn: data[0].linkedIn,
          track: data[0].track,
          founder: data[0].founder,
          founder_details: data[0].founder_details,
          code_type: data[0].code_type,
          current_industry: data[0].current_industry,
          domain: data[0].domain,
          target_industries: data[0].target_industries,
          industry_interest: data[0].industry_interest,
          interest_areas: data[0].interest_areas,
          open_to_work: data[0].open_to_work,
          house: data[0].house,
        });

        // Trigger embedding generation for the updated profile
        await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embeddings`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              profiles: [
                {
                  profile_id: data[0].id,
                  content: [
                    data[0].name ? `Name: ${data[0].name}` : '',
                    data[0].bio ? `Bio: ${data[0].bio}` : '',
                    data[0].designation ? `Designation: ${data[0].designation}` : '',
                    data[0].company ? `Company: ${data[0].company}` : '',
                    data[0].location ? `Location: ${data[0].location}` : '',
                    data[0].skills ? `Skills: ${data[0].skills}` : '',
                    data[0].years_of_experience ? `Years of Experience: ${data[0].years_of_experience}` : '',
                    data[0].cohort_number ? `Cohort Number: ${data[0].cohort_number}` : '',
                    data[0].is_student ? `Is Student: ${data[0].is_student}` : '',
                    data[0].working_professional ? `Working Professional: ${data[0].working_professional}` : '',
                    data[0].study_stream ? `Study Stream: ${data[0].study_stream}` : '',
                    data[0].expected_outcomes ? `Expected Outcomes: ${data[0].expected_outcomes}` : '',
                    data[0].track ? `Track: ${data[0].track}` : '',
                    data[0].founder ? `Founder: ${data[0].founder}` : '',
                    data[0].founder_details ? `Founder Details: ${data[0].founder_details}` : '',
                    data[0].code_type ? `Code Type: ${data[0].code_type}` : '',
                    data[0].current_industry ? `Current Industry: ${data[0].current_industry}` : '',
                    data[0].domain ? `Domain: ${data[0].domain}` : '',
                    data[0].target_industries ? `Target Industries: ${data[0].target_industries}` : '',
                    data[0].industry_interest ? `Industry Interest: ${data[0].industry_interest}` : '',
                    data[0].interest_areas ? `Interest Areas: ${data[0].interest_areas}` : '',
                    data[0].open_to_work ? `Open to Work: ${data[0].open_to_work}` : '',
                    data[0].house ? `House: ${data[0].house}` : '',
                  ].filter(Boolean).join(' \n '),
                },
              ],
            }),
          }
        );
      }

      setIsEditing(false);

      // Force refresh the page to update the auth context
      window.location.reload();

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Add this function to handle the toggle change
  const handlePublicEmailToggle = (checked: boolean) => {
    setEditedPublicEmail(checked);
  };

  // Function to handle password change
  const handlePasswordChange = async () => {
    if (!newPassword || !confirmNewPassword || !currentPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update password in Supabase auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      // Clear the password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setIsChangingPassword(false);

      toast({
        title: "Success",
        description: "Password updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
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

      // Update all relevant states based on active tab
      if (activeApplicationTab === "my") {
        setMyApplications((apps) =>
          apps.map((app) =>
            app.id === id
              ? {
                  ...app,
                  stars: isStarred ? app.stars - 1 : app.stars + 1,
                  isStarred: !isStarred,
                }
              : app
          )
        );
      } else if (activeApplicationTab === "liked") {
        setLikedApplications((apps) =>
          apps.map((app) =>
            app.id === id
              ? {
                  ...app,
                  stars: isStarred ? app.stars - 1 : app.stars + 1,
                  isStarred: !isStarred,
                }
              : app
          )
        );
      } 
    } catch (error) {
      console.error("Error updating star:", error);
      toast({
        title: "Error",
        description: "Failed to update star",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!user) {
    return null;
  }

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  const displayProfile = myProfile;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="flex flex-col md:flex-row items-center gap-6 p-8 mb-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
          <Avatar className="h-32 w-32 border-4 border-orange-500 dark:border-orange-400 shadow-md">
            <AvatarImage
              className="rounded-full object-cover aspect-square"
              src={displayProfile?.avatar_url || ""}
              alt={displayProfile?.email || ""}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <User className="h-16 w-16" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">
                {editedName || displayProfile?.name || displayProfile?.email?.split("@")[0]}
              </h1>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="mt-2 md:mt-0 text-orange-600 border-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-400 dark:hover:bg-gray-700"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 flex items-center justify-center md:justify-start gap-2 text-lg">
              <Mail className="h-5 w-5 text-orange-500" />
              {displayProfile?.email}
              {!isEditing && (
                <Badge
                  variant={displayProfile?.public_email ? "default" : "secondary"}
                  className="ml-2 px-3 py-1 rounded-full text-xs font-medium"
                >
                  {displayProfile?.public_email ? "Public" : "Private"}
                </Badge>
              )}
            </p>
            {!isEditing && (
              <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-2 text-gray-700 dark:text-gray-300 text-sm">
                {displayProfile?.designation && (
                  <Badge variant="secondary" className="flex items-center gap-2 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-3 py-1 rounded-full">
                    <Briefcase className="h-4 w-4" />
                    {displayProfile.designation}
                  </Badge>
                )}
                {displayProfile?.track && (
                  <Badge variant="secondary" className="flex items-center gap-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-3 py-1 rounded-full">
                    <Code className="h-4 w-4" />
                    {displayProfile.track.includes("Employment") ? "Employment Track" : displayProfile.track.includes("Entrepreneur") ? "Entrepreneur Track" : displayProfile.track}
                  </Badge>
                )}
                {displayProfile?.code_type && (
                  <Badge variant="secondary" className="flex items-center gap-2 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-3 py-1 rounded-full">
                    <Code className="h-4 w-4" />
                    {displayProfile.code_type}
                  </Badge>
                )}
                {displayProfile?.cohort_number && (
                  <Badge variant="secondary" className="flex items-center gap-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-3 py-1 rounded-full">
                    <Users className="h-4 w-4" />
                    Cohort {displayProfile.cohort_number}
                  </Badge>
                )}
                {displayProfile?.open_to_work === "Yes" && (
                  <Badge variant="default" className="flex items-center gap-1 bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 px-3 py-1 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    Open to Work
                  </Badge>
                )}
                {displayProfile?.open_to_work === "Yes" && displayProfile?.resume && (
                  <Badge variant="secondary" className="flex items-center gap-2 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-3 py-1 rounded-full">
                    <FileText className="h-4 w-4" />
                    <a href={displayProfile.resume} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      View Resume
                    </a>
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4 md:mt-0">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedUserId(displayProfile?.user_id || "");
                    setEditedPublicEmail(displayProfile?.public_email || false);
                    setEditedName(displayProfile?.name || "");
                    setMyProfile(profile); // Revert changes
                  }}
                  className="text-gray-600 border-gray-300 hover:bg-gray-100 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveProfile} className="bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-500 dark:hover:bg-orange-600">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </Card>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Name</Label>
                  <Input
                    id="name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Your Name"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email</Label>
                  <Input id="email" value={displayProfile?.email} disabled className="bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation" className="text-gray-700 dark:text-gray-300">Designation</Label>
                  <Input
                    id="designation"
                    value={myProfile?.designation || ""}
                    onChange={(e) =>
                      setMyProfile({ ...myProfile!, designation: e.target.value })
                    }
                    placeholder="e.g., Software Engineer"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years_of_experience" className="text-gray-700 dark:text-gray-300">Years of Experience</Label>
                  <Input
                    id="years_of_experience"
                    type="number"
                    value={myProfile?.years_of_experience || ""}
                    onChange={(e) =>
                      setMyProfile({
                        ...myProfile!,
                        years_of_experience: e.target.value,
                      })
                    }
                    placeholder="e.g., 5"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-gray-700 dark:text-gray-300">Location</Label>
                  <Input
                    id="location"
                    value={myProfile?.location || ""}
                    onChange={(e) =>
                      setMyProfile({ ...myProfile!, location: e.target.value })
                    }
                    placeholder="e.g., San Francisco, CA"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="study_stream" className="text-gray-700 dark:text-gray-300">Study Stream</Label>
                  <Input
                    id="study_stream"
                    value={myProfile?.study_stream || ""}
                    onChange={(e) =>
                      setMyProfile({ ...myProfile!, study_stream: e.target.value })
                    }
                    placeholder="e.g., Computer Science"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedIn" className="text-gray-700 dark:text-gray-300">LinkedIn URL</Label>
                  <Input
                    id="linkedIn"
                    value={myProfile?.linkedIn || ""}
                    onChange={(e) =>
                      setMyProfile({ ...myProfile!, linkedIn: e.target.value })
                    }
                    placeholder="e.g., https://linkedin.com/in/yourprofile"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain" className="text-gray-700 dark:text-gray-300">Domain</Label>
                  <Input
                    id="domain"
                    value={myProfile?.domain || ""}
                    onChange={(e) =>
                      setMyProfile({ ...myProfile!, domain: e.target.value })
                    }
                    placeholder="e.g., Web Development"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry_interest" className="text-gray-700 dark:text-gray-300">Industry Interest</Label>
                  <Input
                    id="industry_interest"
                    value={myProfile?.industry_interest || ""}
                    onChange={(e) =>
                      setMyProfile({
                        ...myProfile!,
                        industry_interest: e.target.value,
                      })
                    }
                    placeholder="e.g., FinTech, Healthcare"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interest_areas" className="text-gray-700 dark:text-gray-300">Interest Areas</Label>
                  <Input
                    id="interest_areas"
                    value={myProfile?.interest_areas || ""}
                    onChange={(e) =>
                      setMyProfile({
                        ...myProfile!,
                        interest_areas: e.target.value,
                      })
                    }
                    placeholder="e.g., AI, Machine Learning, Cloud"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between space-x-2 mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                <Label htmlFor="public-email" className="text-gray-700 dark:text-gray-300">Public Email</Label>
                <Switch
                  id="public-email"
                  checked={myProfile?.public_email || false}
                  onCheckedChange={(checked) =>
                    setMyProfile({ ...myProfile!, public_email: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between space-x-2 mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                <Label htmlFor="open-to-work" className="text-gray-700 dark:text-gray-300">Open to Work</Label>
                <Switch
                  id="open-to-work"
                  checked={myProfile?.open_to_work === "Yes"}
                  onCheckedChange={(checked) =>
                    setMyProfile({ ...myProfile!, open_to_work: checked ? "Yes" : "No" })
                  }
                />
              </div>
            </Card>

            <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">About Me</h2>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-gray-700 dark:text-gray-300">Bio</Label>
                <Textarea
                  id="bio"
                  value={myProfile?.bio || ""}
                  onChange={(e) =>
                    setMyProfile({ ...myProfile!, bio: e.target.value })
                  }
                  placeholder="Tell us about yourself..."
                  rows={5}
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
            </Card>

            <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Skills</h2>
              <div className="space-y-2">
                <Label htmlFor="skills" className="text-gray-700 dark:text-gray-300">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  value={myProfile?.skills || ""}
                  onChange={(e) =>
                    setMyProfile({ ...myProfile!, skills: e.target.value })
                  }
                  placeholder="e.g., React, Node.js, Python"
                  className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
            </Card>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditedUserId(displayProfile?.user_id || "");
                  setEditedPublicEmail(displayProfile?.public_email || false);
                  setEditedName(displayProfile?.name || "");
                  setMyProfile(profile); // Revert changes
                }}
                className="text-gray-600 border-gray-300 hover:bg-gray-100 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-500 dark:hover:bg-orange-600">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayProfile?.bio && (
                  <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Info className="h-6 w-6 mr-3 text-orange-500" />
                      About Me
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">{displayProfile.bio}</p>
                  </Card>
                )}

                {displayProfile?.skills && (
                  <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Lightbulb className="h-6 w-6 mr-3 text-orange-500" />
                      Skills
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {displayProfile.skills.split(",").map((skill, index) => (
                        <Badge key={index} variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-4 py-2 rounded-full text-base font-medium transition-all duration-200 hover:scale-105">
                          {skill.trim()}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
                <Tabs defaultValue="applications" className="w-full">
                  <TabsList className="grid w-fit grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-1">
                    <TabsTrigger
                      value="applications"
                      onClick={() => setActiveMainTab("applications")}
                      className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-orange-600 dark:data-[state=active]:text-white rounded-md px-4 py-2 text-base font-medium transition-all"
                    >
                      Applications
                    </TabsTrigger>
                    <TabsTrigger
                      value="progress"
                      onClick={() => setActiveMainTab("progress")}
                      className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-orange-600 dark:data-[state=active]:text-white rounded-md px-4 py-2 text-base font-medium transition-all"
                    >
                      Progress
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="applications" className="mt-6">
                    <Tabs defaultValue="my" className="w-full">
                      <TabsList className="grid w-fit grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-1">
                        <TabsTrigger
                          value="my"
                          onClick={() => setActiveApplicationTab("my")}
                          className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-orange-600 dark:data-[state=active]:text-white rounded-md px-4 py-2 text-base font-medium transition-all"
                        >
                          My Applications
                        </TabsTrigger>
                        <TabsTrigger
                          value="liked"
                          onClick={() => setActiveApplicationTab("liked")}
                          className="data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-orange-600 dark:data-[state=active]:text-white rounded-md px-4 py-2 text-base font-medium transition-all"
                        >
                          Liked
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="my" className="mt-6">
                        {myApplications.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myApplications.map((application) => (
                              <ApplicationCard
                                key={application.id}
                                application={application}
                                handleStar={handleStar}
                                isOwner={application.creator_user_id === user.id}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 dark:text-gray-400 py-12 text-lg">No applications created yet.</p>
                        )}
                      </TabsContent>
                      <TabsContent value="liked" className="mt-6">
                        {likedApplications.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {likedApplications.map((application) => (
                              <ApplicationCard
                                key={application.id}
                                application={application}
                                handleStar={handleStar}
                                isOwner={application.creator_user_id === user.id}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 dark:text-gray-400 py-12 text-lg">No liked applications yet.</p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </TabsContent>
                  <TabsContent value="progress" className="mt-6">
                    {responses.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {responses.map((response, index) => (
                          <Card key={index} className="p-4 bg-white dark:bg-gray-800 shadow-md rounded-xl border border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-xl text-gray-900 dark:text-white mb-2">
                              Week {response.week_number}
                            </h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              {response.text_response}
                            </p>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-12 text-lg">No progress data available.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
              {(overallAttendancePercentage ||
                displayProfile?.completion_rate ||
                displayProfile?.assignments_submitted) && (
                <Card className="p-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <BarChart className="h-6 w-6 mr-3 text-orange-500" />
                    Analytics
                  </h2>
                  {overallAttendancePercentage !== null && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Percent className="h-5 w-5 text-orange-500" />
                        Overall Attendance Rate:
                      </p>
                      <span className="font-semibold text-lg text-gray-900 dark:text-white">{overallAttendancePercentage}%</span>
                    </div>
                  )}
                  {moduleProgress.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Module Progress:</h3>
                      {moduleProgress.map((module, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                          <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Code className="h-5 w-5 text-blue-500" />
                            {module.course_name}:
                          </p>
                          <span className="font-semibold text-lg text-gray-900 dark:text-white">{module.batch_progress}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {displayProfile?.completion_rate && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-green-500" />
                        Completion Rate:
                      </p>
                      <span className="font-semibold text-lg text-gray-900 dark:text-white">{displayProfile.completion_rate}%</span>
                    </div>
                  )}
                  {displayProfile?.assignments_submitted && (
                    <div className="flex items-center justify-between py-2 last:border-b-0">
                      <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-500" />
                        Assignments Submitted:
                      </p>
                      <span className="font-semibold text-lg text-gray-900 dark:text-white">{displayProfile.assignments_submitted}</span>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
  );
}
