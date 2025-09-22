import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Upload, X } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  onRemove?: (url: string) => void;
  currentUrl?: string;
  folder?: string;
  multiple?: boolean;
  maxFiles?: number;
}

export function FileUpload({
  onUploadComplete,
  onRemove,
  currentUrl,
  folder = "applications",
  multiple = false,
  maxFiles = 1,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>(
    currentUrl ? [currentUrl] : []
  );
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload files",
        variant: "destructive",
      });
      return;
    }

    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check if multiple files are allowed
    if (!multiple && files.length > 1) {
      toast({
        title: "Error",
        description: "Only single file upload is allowed",
        variant: "destructive",
      });
      return;
    }

    // Check max files limit including existing previews
    if (previewUrls.length + files.length > maxFiles) {
      toast({
        title: "Error",
        description: `Maximum ${maxFiles} file${maxFiles > 1 ? "s" : ""} allowed. You currently have ${previewUrls.length}.`,
        variant: "destructive",
      });
      return;
    }

    // Validate all files
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
        return;
      }

      // Validate file size (3MB limit)
      if (file.size > 3 * 1024 * 1024) {
        toast({
          title: "Error",
          description: `${file.name} is too large. File size must be less than 3MB`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setUploading(true);
      const uploadedUrls: string[] = [];

      // Upload all files
      for (const file of files) {
        // Create a unique file name with user ID to ensure uniqueness
        const fileExt = file.name.split(".").pop();
        // Validate extension is safe
        const safeExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
        if (!fileExt || !safeExtensions.includes(fileExt.toLowerCase())) {
          toast({
            title: "Error",
            description: `${file.name} has an invalid extension. Please upload a valid image file.`,
            variant: "destructive",
          });
          return;
        }
        const fileName = `${user.id}/${Math.random()
          .toString(36)
          .substring(2)}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError, data } = await supabase.storage
          .from("uploads")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("uploads").getPublicUrl(filePath);
        
      // Update preview URLs
      if (multiple) {
        setPreviewUrls((prev) => [...prev, ...uploadedUrls]);
      } else {
        setPreviewUrls(uploadedUrls);
      }

      // Call onUploadComplete for each uploaded file
      uploadedUrls.forEach((url) => onUploadComplete(url));
    }} catch (error: any) {
      console.error("Detailed error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const urlToRemove = previewUrls[index];
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    // Notify parent about removal
    if (onRemove && urlToRemove) {
      onRemove(urlToRemove);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Simulate file input change event
      handleFileChange({ target: { files } } as any);
    }
  };

  return (
    <div className="space-y-2">
      <Label>
        {multiple
          ? `Screenshots (${previewUrls.length}/${maxFiles})`
          : "Screenshot"}
      </Label>
      <div className="flex flex-col gap-4">
        {previewUrls.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {previewUrls.map((url, index) => (
              <div
                key={index}
                className="relative flex justify-center items-center bg-muted rounded-lg"
                style={{ minHeight: 120, minWidth: 120 }}
              >
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: 200,
                    height: "auto",
                    width: "auto",
                    display: "block",
                  }}
                  className="rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {previewUrls.length < maxFiles && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragActive
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/25"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={uploading}
              multiple={multiple}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {uploading
                  ? "Uploading..."
                  : isDragActive
                    ? multiple
                      ? "Drop images here"
                      : "Drop the image here"
                    : multiple
                      ? "Click or drag images to upload"
                      : "Click or drag an image to upload"}
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
