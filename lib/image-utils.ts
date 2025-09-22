// Helper function to safely get the first screenshot URL
export const getFirstScreenshotUrl = (screenshot_url: any): string => {
  if (!screenshot_url) return "";

  // If it's already a string URL, return it
  if (typeof screenshot_url === "string" && screenshot_url.startsWith("http")) {
    return screenshot_url;
  }

  // If it's a stringified JSON array, parse it
  if (typeof screenshot_url === "string" && screenshot_url.startsWith("[")) {
    try {
      const parsed = JSON.parse(screenshot_url);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : "";
    } catch {
      return "";
    }
  }

  // If it's already an array, get the first element
  if (Array.isArray(screenshot_url) && screenshot_url.length > 0) {
    return screenshot_url[0];
  }

  return "";
};
