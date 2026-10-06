import { handleAvatarDownload, handleAvatarUpload } from "@/features/candidate/server";

/** The signed-in user's profile photo. */
export async function GET(request: Request) {
  return handleAvatarDownload(request);
}

/** Replaces the profile photo (multipart, one `file` field). */
export async function POST(request: Request) {
  return handleAvatarUpload(request);
}
