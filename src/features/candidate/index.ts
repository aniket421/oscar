// Public, client-safe API of the candidate feature (profile and resume).
// Server-only loaders, file handlers, and the processing pipeline live in `./server`.

export { CompletenessSummary } from "./components/completeness-summary";
export { ProfileContent } from "./components/profile/profile-content";
export { ResumeContent } from "./components/resume/resume-content";
export {
  computeProfileCompleteness,
  emptyCandidateProfile,
  MIN_SKILLS,
  type CompletenessItem,
  type ProfileCompleteness,
} from "./completeness";
export {
  experienceLevelLabels,
  formatDate,
  formatMonth,
  formatPeriod,
  processingErrorMessages,
  resumeStatusLabels,
  workArrangementLabels,
} from "./format";
export {
  checkResumeBasics,
  formatFileSize,
  RESUME_MAX_BYTES,
  resumeFileMessages,
  validateResumeUpload,
} from "./resume-file";
export { findCatalogSkill, skillCategoryLabels, skillsCatalog } from "./skills-catalog";
export {
  validateCareer,
  validateCertification,
  validateEducation,
  validateExperience,
  validateGoals,
  validateIdentity,
  validateProject,
  validateSkill,
} from "./validation";
