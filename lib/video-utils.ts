export interface VideoInfo {
  type: "youtube" | "drive" | "loom" | "vimeo" | "other";
  embedUrl: string;
  originalUrl: string;
}

/**
 * Converts various video URLs to their embed URLs
 * Supports YouTube, Google Drive, Loom, Vimeo, and other platforms
 */
export function getVideoEmbedInfo(url: string): VideoInfo {
  if (!url) {
    return {
      type: "other",
      embedUrl: "",
      originalUrl: url,
    };
  }

  // YouTube
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    let videoId = "";

    if (url.includes("youtube.com/watch")) {
      const urlParams = new URLSearchParams(url.split("?")[1]);
      videoId = urlParams.get("v") || "";
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
    }

    if (videoId) {
      return {
        type: "youtube",
        embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`,
        originalUrl: url,
      };
    }
  }

  // Google Drive
  if (url.includes("drive.google.com")) {
    let fileId = "";

    if (url.includes("/file/d/")) {
      fileId = url.split("/file/d/")[1]?.split("/")[0] || "";
    } else if (url.includes("id=")) {
      const urlParams = new URLSearchParams(url.split("?")[1]);
      fileId = urlParams.get("id") || "";
    }

    if (fileId) {
      return {
        type: "drive",
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        originalUrl: url,
      };
    }
  }

  // Loom
  if (url.includes("loom.com")) {
    let shareId = "";

    if (url.includes("/share/")) {
      shareId = url.split("/share/")[1]?.split("?")[0] || "";
    } else if (url.includes("shareId=")) {
      const urlParams = new URLSearchParams(url.split("?")[1]);
      shareId = urlParams.get("shareId") || "";
    }

    if (shareId) {
      return {
        type: "loom",
        embedUrl: `https://www.loom.com/embed/${shareId}`,
        originalUrl: url,
      };
    }
  }

  // Vimeo
  if (url.includes("vimeo.com")) {
    let videoId = "";

    if (url.includes("/videos/")) {
      videoId = url.split("/videos/")[1]?.split("?")[0] || "";
    } else if (url.includes("vimeo.com/")) {
      videoId = url.split("vimeo.com/")[1]?.split("?")[0] || "";
    }

    if (videoId) {
      return {
        type: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
        originalUrl: url,
      };
    }
  }

  // Generic iframe support (for other platforms)
  if (url.includes("iframe") || url.includes("embed")) {
    return {
      type: "other",
      embedUrl: url,
      originalUrl: url,
    };
  }

  // Default fallback
  return {
    type: "other",
    embedUrl: url,
    originalUrl: url,
  };
}

/**
 * Gets the appropriate iframe attributes for different video platforms
 */
export function getVideoIframeProps(videoInfo: VideoInfo) {
  const baseProps = {
    width: "100%",
    height: "100%",
    allowFullScreen: true,
    title: "Video Player",
    className: "absolute top-0 left-0 w-full h-full",
  };

  switch (videoInfo.type) {
    case "youtube":
      return {
        ...baseProps,
        src: videoInfo.embedUrl,
        allow:
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        frameBorder: "0",
      };

    case "drive":
      return {
        ...baseProps,
        src: videoInfo.embedUrl,
        allow: "autoplay; encrypted-media",
      };

    case "loom":
      return {
        ...baseProps,
        src: videoInfo.embedUrl,
        allow: "autoplay; fullscreen",
      };

    case "vimeo":
      return {
        ...baseProps,
        src: videoInfo.embedUrl,
        allow: "autoplay; fullscreen; picture-in-picture",
      };

    default:
      return {
        ...baseProps,
        src: videoInfo.embedUrl,
        allow: "autoplay; encrypted-media; fullscreen",
      };
  }
}

/**
 * Gets a display name for the video platform
 */
export function getVideoPlatformName(videoInfo: VideoInfo): string {
  switch (videoInfo.type) {
    case "youtube":
      return "YouTube";
    case "drive":
      return "Google Drive";
    case "loom":
      return "Loom";
    case "vimeo":
      return "Vimeo";
    default:
      return "Video";
  }
}
