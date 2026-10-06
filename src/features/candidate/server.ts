import "server-only";

// Server-only entry point of the candidate feature (profile, resume, processing).
export {
  getCandidateDb,
  loadProfilePage,
  loadResumePage,
  type ProfilePageData,
  type ResumePageData,
} from "./data/load";
export {
  handleAvatarDownload,
  handleAvatarUpload,
  handleResumeDownload,
  handleResumeUpload,
} from "./data/file-routes";
export { deleteResume, removeOtherResumes, storeResume } from "./data/resume-service";
export { parseResumeFile, processResume } from "./processing/run";
