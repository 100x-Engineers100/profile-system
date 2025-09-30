'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Pencil,
  Save,
  ExternalLink,
  X,
  Mail,
  User,
  LogOut,
  Briefcase,
  CheckCircle,
  Code,
  Users,
  FileText,
  Star
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { Application } from '@/types'; // Added missing import for Application type

interface Profile {
  id?: string;
  user_id: string;
  email: string;
  public_email: boolean;
  avatar_url?: string; // Added missing avatar_url property
  name: string;
  cohort_number?: string;
  password?: string;
  bio?: string;
  skills?: string;
  portfolio_link?: string;
  github_link?: string;
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
  attendance_rate?: number;
  completion_rate?: number;
  assignments_submitted?: number;
  lms_userid?: string; // Added lms_userid field
}

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

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [displayProfile, setDisplayProfile] = useState<Profile | null>(null);
  const [myApplications, setMyApplications] = useState<ProfileApplication[]>([]);
  const [likedApplications, setLikedApplications] = useState<ProfileApplication[]>([]);
  const [activeTab, setActiveTab] = useState<"my" | "liked">("my");
  const [loading, setLoading] = useState(true);
  const [overallAttendancePercentage, setOverallAttendancePercentage] = useState<number | null>(null);
  const { user, profile: loggedInUserProfile } = useAuth(); // Get logged-in user and profile
  // const supabase = createClient(); // Initialize Supabase client

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select(
            `
            id,
            user_id,
            email,
            public_email,
            avatar_url,
            role,
            created_at,
            name,
            cohort_number,
            password,
            bio,
            skills,
            designation,
            years_of_experience,
            location,
            is_student,
            working_professional,
            study_stream,
            company,
            expected_outcomes,
            resume,
            linkedIn,
            track,
            founder,
            founder_details,
            code_type,
            current_industry,
            domain,
            target_industries,
            industry_interest,
            interest_areas,
            open_to_work,
            house,
            lms_userid
            `
          )
          .eq("id", userId);

        const profilesData: Profile[] = data as Profile[];

        // Fetch mentee_details if open_to_work is "yes"
        if (profilesData && profilesData.length > 0 && profilesData[0].open_to_work?.toLowerCase() === "yes" && profilesData[0].email) {
          const { data: menteeData, error: menteeError } = await supabase
            .from("mentee_details")
            .select("portfolio_link, github_link")
            .eq("email", profilesData[0].email)
            .single();

          if (menteeError) {
            console.error("Error fetching mentee details:", menteeError);
          } else if (menteeData && profilesData[0]) {
            profilesData[0].portfolio_link = menteeData.portfolio_link;
            profilesData[0].github_link = menteeData.github_link;
          }
        }

        // Call the external API if lms_userid is present
        if (profilesData && profilesData.length > 0 && profilesData[0].lms_userid) {
          const lmsUserId = profilesData[0].lms_userid;
          try {
            const edmingleApiKey = process.env.NEXT_PUBLIC_EDMINGLE_API_KEY;
            if (!edmingleApiKey) {
              console.error('EDMINGLE_API_KEY is not defined. Cannot call external API.');
              return; // Prevent the fetch call if API key is missing
            }

            const apiResponse = await fetch(`https://100xengineers-api.edmingle.com/nuSource/api/v1/admin/batches/attendance/${lmsUserId}`, {
              headers: {
                'apikey': edmingleApiKey, // Now guaranteed to be a string
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
              }
            }
          } catch (apiError) {
            console.error('Error calling external API:', apiError);
          }
        }

        if (error) {
        console.error('Error fetching profile:', error);
        setDisplayProfile(null);
      } else if (data && data.length > 0) {
        setDisplayProfile(data[0]);
      } else {
        setDisplayProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setDisplayProfile(null);
    } finally {
      setLoading(false);
    }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="animate-pulse space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
              <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              <div className="flex-1 space-y-3">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="flex gap-2">
                  <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!displayProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-xl text-gray-700 dark:text-gray-300">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="flex flex-col md:flex-row items-center gap-8 pb-8 mb-8 border-b border-gray-200 dark:border-gray-700">
          <Avatar className="h-32 w-32 border-4 border-orange-500 shadow-xl">
            <AvatarImage
              className="rounded-full object-cover"
              src={displayProfile?.avatar_url || ""}
              alt={displayProfile?.name || ""}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback>
              <User className="h-16 w-16 text-gray-400 dark:text-gray-500" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">
                {displayProfile?.name || displayProfile?.email?.split("@")[0]}
              </h1>
              {loggedInUserProfile && loggedInUserProfile.id !== displayProfile?.id && (
                <>
                  {loggedInUserProfile?.role === 'user' && displayProfile?.linkedIn &&
                   !['https://linkedin.com', 'http://linkedin.com'].includes(displayProfile.linkedIn.toLowerCase()) &&
                   displayProfile.linkedIn.length > 'https://linkedin.com'.length ? (
                    <Link href={displayProfile.linkedIn.startsWith('http') ? displayProfile.linkedIn : `https://${displayProfile.linkedIn}`} target="_blank" rel="noopener noreferrer">
                      <Button
                        variant="default"
                        size="sm"
                        className="mt-2 md:mt-0 rounded-full bg-orange-500 text-white hover:bg-orange-600"
                      >
                        Connect
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="mt-2 md:mt-0 rounded-full bg-orange-500 text-white hover:bg-orange-600"
                      onClick={() => {
                        window.location.href = 'mailto:example@example.com?subject=Connect%20Request';
                      }}
                    >
                      Connect
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-2 text-gray-600 dark:text-gray-400 text-base">
              {displayProfile?.designation && (
                <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <Briefcase className="h-4 w-4" />
                  {displayProfile.designation}
                </Badge>
              )}
              {displayProfile?.track && (
                <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  <Code className="h-4 w-4" />
                  {displayProfile.track.includes("Employment") ? "Employment Track" : displayProfile.track.includes("Entrepreneur") ? "Entrepreneur Track" : displayProfile.track}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-2 text-gray-600 dark:text-gray-400 text-base">
              {displayProfile?.code_type && (
                <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <Code className="h-4 w-4" />
                  {displayProfile.code_type}
                </Badge>
              )}
              {displayProfile?.cohort_number && (
                <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  <Users className="h-4 w-4" />
                  {displayProfile.cohort_number}
                </Badge>
              )}
              {displayProfile?.open_to_work?.toLowerCase() === "yes" && (
                <Badge variant="default" className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500 text-white dark:bg-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Open to Work
                </Badge>
              )}
              {displayProfile?.open_to_work?.toLowerCase() === "yes" && displayProfile?.portfolio_link && (
                <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                  <FileText className="h-4 w-4" />
                  <a href={displayProfile.portfolio_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" style={{textDecoration:'none'}}>
                    Portfolio
                  </a>
                </Badge>
              )}
              {displayProfile?.open_to_work?.toLowerCase() === "yes" && displayProfile?.github_link && (
                <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                  <Code className="h-4 w-4" />
                  <a href={displayProfile.github_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" style={{textDecoration:'none'}}>
                    GitHub
                  </a>
                </Badge>
              )}
               {displayProfile?.open_to_work?.toLowerCase() === "yes" && displayProfile?.portfolio_link && (
                <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
                  <FileText className="h-4 w-4" />
                  <a href={displayProfile.resume} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" style={{textDecoration:'none'}}>
                    View Resume
                  </a>
                </Badge>
              )}
            </div>
          </div>
        </div>

      {/* Bio Section */}
      {displayProfile?.bio && displayProfile?.skills && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-6 bg-gray-50 dark:bg-gray-900 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">About Me</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{displayProfile.bio}</p>
          </Card>
          {/* Skills Section */}
          <Card className="p-6 bg-gray-50 dark:bg-gray-900 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Skills</h2>
            <div className="flex flex-wrap gap-3">
              {displayProfile.skills.split(",").map((skill, index) => (
                <Badge key={index} className="px-4 py-2 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-base font-medium">
                  {skill.trim()}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      )}
      {/* If only bio is present */}
      {displayProfile?.bio && !displayProfile?.skills && (
        <Card className="p-6 mb-6 bg-gray-50 dark:bg-gray-900 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">About Me</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{displayProfile.bio}</p>
        </Card>
      )}
      {/* If only skills are present */}
      {!displayProfile?.bio && displayProfile?.skills && (
        <Card className="p-6 mb-6 bg-gray-50 dark:bg-gray-900 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Skills</h2>
          <div className="flex flex-wrap gap-3">
            {displayProfile.skills.split(",").map((skill, index) => (
              <Badge key={index} className="px-4 py-2 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-base font-medium">
                {skill.trim()}
              </Badge>
            ))}
          </div>
        </Card>
      )
      }

        {/* Applications Section */}
        {
          myApplications.length ? (
        <Card className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-md">
          <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Applications</h3>
          <div className="flex space-x-4 mb-6">
            <Tabs defaultValue="my" className="w-full">
              {/* <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-full p-1">
                <TabsTrigger
                  value="my"
                  className={`rounded-full text-sm font-medium transition-all duration-200 ${activeTab === 'my' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  onClick={() => setActiveTab("my")}
                >
                  My Applications
                </TabsTrigger>
                <TabsTrigger
                  value="liked"
                  className={`rounded-full text-sm font-medium transition-all duration-200 ${activeTab === 'liked' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  onClick={() => setActiveTab("liked")}
                >
                  Liked Applications
                </TabsTrigger>
              </TabsList> */}
              <TabsContent value="my" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(activeTab === "my" ? myApplications : likedApplications).map((app) => (
                    <Card key={app.id} className="relative overflow-hidden group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                      <Link href={`/applications/${app.id}`}>
                        <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-t-xl overflow-hidden">
                          {app.screenshot_url && app.screenshot_url.length > 0 ? (
                            <Image
                              src={app.screenshot_url[0]}
                              alt={app.title}
                              layout="fill"
                              objectFit="cover"
                              className="transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">No Image</span>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-xl mb-1 text-gray-900 dark:text-white line-clamp-1">{app.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                            {app.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {app.tags?.map((tag: string, index: number) => (
                              <Badge key={index} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-current text-yellow-500" />
                              {app.stars}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${app.status === "approved"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : app.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                }`}
                            >
                              {app.status}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {app.url && (
                          <Button variant="outline" size="icon" asChild className="rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Link href={app.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="liked" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(activeTab === "my" ? myApplications : likedApplications).map((app) => (
                    <Card key={app.id} className="relative overflow-hidden group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                      <Link href={`/applications/${app.id}`}>
                        <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-t-xl overflow-hidden">
                          {app.screenshot_url && app.screenshot_url.length > 0 ? (
                            <Image
                              src={app.screenshot_url[0]}
                              alt={app.title}
                              layout="fill"
                              objectFit="cover"
                              className="transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">No Image</span>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-xl mb-1 text-gray-900 dark:text-white line-clamp-1">{app.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                            {app.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {app.tags?.map((tag, index) => (
                              <Badge key={index} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-current text-yellow-500" />
                              {app.stars}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${app.status === "approved"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : app.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                }`}
                            >
                              {app.status}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {app.url && (
                          <Button variant="outline" size="icon" asChild className="rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Link href={app.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
          ) : (<></>)
        }
      </div>
    </div>
  );
}

type ProfileApplication = Application & {
  stars: number;
  isStarred: boolean;
  creator_user_id?: string;
  screenshot_url:string[];
  tags?: string[]; // Add tags property
};