import { handleResumeUpload } from "@/features/candidate/server";

/** Resume upload (multipart, one `file` field). Verified, validated, and processed server-side. */
export async function POST(request: Request) {
  return handleResumeUpload(request);
}
