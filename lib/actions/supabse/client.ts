import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
export const uploadThumbnail = async (file: File) => {
  /** vulnerable code start
	// No validation on file type or size:
  const { data, error } = await supabase.storage
    .from("thumbnails")
    .upload(`public/${file.name}`, file, {
      contentType: "image/png", // Assumes file is always a PNG without checking.
      upsert: true, // Overwrites existing files without validation.
		});

		if (error) {
    // Leaks error details to console (potential information disclosure):
    console.log(error.message);
  } else {
    // No error handling for the thumbnail URL generation:
    const thumbnailUrl = await getThumbnailUrl(data.path);
    return thumbnailUrl; // Assumes URL generation will always succeed.
  }
	vulnreable code end
	**/

  // Validate file type and size before upload:
  const allowedMimeTypes = ["image/png", "image/jpeg"];
  const maxFileSize = 5 * 1024 * 1024; // 5 MB

  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only PNG and JPEG are allowed.");
  }

  if (file.size > maxFileSize) {
    throw new Error("File size exceeds the 5 MB limit.");
	}
	try {
    const { data, error } = await supabase.storage
      .from("thumbnails")
      .upload(`public/${encodeURIComponent(file.name)}`, file, {
        contentType: file.type, // Use file's actual content type.
        upsert: false, // Prevent accidental overwriting of existing files.
      });

    if (error) {
      // Handle errors securely without exposing sensitive details:
      throw new Error("Failed to upload the file. Please try again.");
    }

    // Generate and validate thumbnail URL:
    const thumbnailUrl = await getThumbnailUrl(data.path);
    if (!thumbnailUrl) {
      throw new Error("Failed to generate thumbnail URL.");
    }

    return thumbnailUrl;
	} catch (err) {
		// @ts-ignore
    console.error("Error uploading thumbnail:", err.message);
    throw err; // Rethrow error for higher-level handling.
  }
};
const getThumbnailUrl = async (path: string) => {
  /** vulnerable code
	// No validation on path input:
  const { data } = await supabase.storage.from("thumbnails").getPublicUrl(path);

  // Validate path input to prevent misuse:
  if (!path || typeof path !== "string") {
    throw new Error("Invalid path for generating thumbnail URL.");
  }
	**/

  const { data } = await supabase.storage
    .from("thumbnails")
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Failed to retrieve public URL for the thumbnail.");
  }
  return data.publicUrl;
};
