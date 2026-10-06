import { handleResumeDownload } from "@/features/candidate/server";

/** Downloads the signed-in user's current resume. Never cached, never a storage URL. */
export async function GET() {
  return handleResumeDownload();
}
