"use client";

import { useState, useEffect } from "react";
import { Play, ExternalLink } from "lucide-react";
import { Button } from "./button";
import {
  getVideoEmbedInfo,
  getVideoPlatformName,
  type VideoInfo,
} from "@/lib/video-utils";

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  className?: string;
  fallbackToLink?: boolean;
}

export function VideoPlayer({
  videoUrl,
  title,
  className = "",
  fallbackToLink = true,
}: VideoPlayerProps) {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [embedError, setEmbedError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (videoUrl) {
      const info = getVideoEmbedInfo(videoUrl);
      setVideoInfo(info);
      setIsLoading(false);
    }
  }, [videoUrl]);

  const handleIframeError = () => {
    setEmbedError(true);
  };

  const handleIframeLoad = () => {
    setEmbedError(false);
  };

  if (isLoading) {
    return (
      <div
        className={`w-full h-full bg-muted flex items-center justify-center ${className}`}
      >
        <div className="animate-pulse text-muted-foreground">
          Loading video...
        </div>
      </div>
    );
  }

  if (!videoInfo || !videoInfo.embedUrl) {
    return (
      <div
        className={`w-full h-full bg-muted flex items-center justify-center ${className}`}
      >
        <div className="text-center text-muted-foreground">
          <p>Invalid video URL</p>
        </div>
      </div>
    );
  }

  // If we have an embed error and fallback is enabled, show thumbnail with link
  if (embedError && fallbackToLink) {
    return (
      <div
        className={`relative w-full h-full bg-black flex items-center justify-center ${className}`}
      >
        {/* Video thumbnail placeholder */}
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center">
          <div className="text-center text-white">
            <Play className="w-16 h-16 mx-auto mb-4 opacity-80" />
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-gray-300 mb-4">
              {getVideoPlatformName(videoInfo)} Video
            </p>
            <Button
              onClick={() => window.open(videoInfo.originalUrl, "_blank")}
              className="bg-white text-black hover:bg-gray-100"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Watch on {getVideoPlatformName(videoInfo)}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Try to embed the video
  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <iframe
        src={videoInfo.embedUrl}
        width="100%"
        height="100%"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        title={`${title} - ${getVideoPlatformName(videoInfo)} Video`}
        className="w-full h-full"
        onError={handleIframeError}
        onLoad={handleIframeLoad}
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
      />

      {/* Platform indicator */}
      <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
        <Play className="h-3 w-3" />
        {getVideoPlatformName(videoInfo)}
      </div>

      {/* Fallback link button */}
      {fallbackToLink && (
        <div className="absolute top-2 right-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(videoInfo.originalUrl, "_blank")}
            className="h-6 w-6 p-0 bg-black/50 text-white hover:bg-black/70"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
