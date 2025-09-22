import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Link as LinkIcon, Briefcase, Code } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export type ProfileCardData = {
  id: string;
  name: string;
  cohort_number?: string;
  connect_url?: string;
  avatar_url?: string;
  bio?: string;
  skills?: string[];
  background?: string;
  years_of_experience?: number;
  location?: string;
  designation?: string;
  track?: string;
};

export function ProfileCard({ profile }: { profile: ProfileCardData }) {
  return (
    <Link href={`/profile/${profile.id}`}target="_blank" className="block">
      <Card className="p-6 flex items-center rounded-xl shadow-md hover:shadow-lg transition-all duration-300 h-full bg-white dark:bg-gray-800">
        <div className="flex flex-col items-center mr-4">
          <Avatar className="h-24 w-24 mb-2 border-4 border-orange-500 shadow-lg">
            <AvatarImage src={profile.avatar_url} alt={profile.name} />
            <AvatarFallback>
              <User className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            </AvatarFallback>
          </Avatar>
          {/* {profile.connect_url && ( */}
            <a
              href={profile.connect_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} // Prevent card click from triggering
            >
              <Button variant="outline" size="sm" className="mt-2">
                <LinkIcon className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </a>
          {/* )} */}
        </div>
        <div className="flex-1 text-left h-full">
          <h3 className="text-xl font-bold mb-1 line-clamp-1 text-gray-900 dark:text-white">
            {profile.name}
          </h3>
          {profile.designation && (
            <Badge variant="secondary" className="flex items-center gap-2 mb-1 w-fit text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
              <Briefcase className="h-3 w-3" />
              {profile.designation}
            </Badge>
          )}
          {profile.track && (
            <Badge variant="secondary" className="flex items-center gap-2 mb-1 w-fit text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
              <Code className="h-3 w-3" />
              {profile.track.includes("Employment") ? "Employment Track" : profile.track.includes("Entrepreneur") ? "Entrepreneur Track" : profile.track}
            </Badge>
          )}
          {profile.background && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-1 text-gray-600 dark:text-gray-400">
              {profile.background} {profile.years_of_experience ? `• ${profile.years_of_experience} years` : ''}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}