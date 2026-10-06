# types

Types shared across features.

- `domain.ts`: Oscar's domain model (profile, interviews, sessions, skills Oscar gives feedback
  on, roadmap, practice). Interview, roadmap, and practice types are shapes only for now.
- `candidate.ts`: the candidate profile, resumes, parse results, and the analysis foundation,
  with their enums as constants (`RESUME_STATUSES`, `SKILL_CATEGORIES`, ...). Stored in Supabase
  since Phase 4.
