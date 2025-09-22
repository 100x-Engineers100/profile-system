import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getFirstScreenshotUrl } from "@/lib/image-utils";
import type { Application } from "@/types";

type ProfileApplication = Application & {
  stars: number;
  isStarred: boolean;
  creator_user_id?: string;
  screenshot_url: string[];
  tags?: string[];
};

type ApplicationCardProps = {
  application: ProfileApplication;
  handleStar: (id: string, isStarred: boolean) => void;
  isOwner: boolean;
};

export function ApplicationCard({
  application,
  handleStar,
  isOwner,
}: ApplicationCardProps) {
  const screenshotUrl = getFirstScreenshotUrl(application.screenshot_url);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-lg line-clamp-1">
          <Link href={`/applications/${application.id}`}>
            {application.title}
          </Link>
        </CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          {application.tags?.map((tag, index) => (
            <Badge key={index} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <Link href={`/applications/${application.id}`}>
          {screenshotUrl && (
            <div className="relative w-full h-40 mb-4 rounded-md overflow-hidden">
              <Image
                src={screenshotUrl}
                alt={application.title}
                layout="fill"
                objectFit="cover"
                className="transition-transform duration-300 hover:scale-105"
              />
            </div>
          )}
          <p className="text-sm text-muted-foreground line-clamp-3">
            {application.description}
          </p>
        </Link>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStar(application.id, application.isStarred)}
            className={application.isStarred ? "text-red-500" : "text-muted-foreground"}
          >
            <Heart
              className={
                application.isStarred ? "fill-current w-4 h-4" : "w-4 h-4"
              }
            />
            <span className="ml-1">{application.stars}</span>
          </Button>
        </div>
        <Link href={`/applications/${application.id}`}>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}