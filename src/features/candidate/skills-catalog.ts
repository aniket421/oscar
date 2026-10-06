/**
 * Skill categories and Oscar's skills catalog.
 *
 * The catalog serves two purposes: suggesting a category when a candidate types a skill, and
 * finding skills mentioned in a resume (deterministic matching, see
 * processing/extract-skills.ts). It is a fixed, reviewed list; skills outside it can still be
 * added by hand. Provider and model names are deliberately left out (development rule 8).
 */
import { SKILL_CATEGORIES, type CandidateSkillCategory } from "@/types/candidate";

export const skillCategoryLabels: Record<CandidateSkillCategory, string> = {
  programming: "Programming",
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
  cloud: "Cloud",
  devops: "DevOps",
  ai_ml: "AI and machine learning",
  tools: "Tools",
  soft_skills: "Soft skills",
};

export const skillCategoryOptions = SKILL_CATEGORIES.map((value) => ({
  value,
  label: skillCategoryLabels[value],
}));

export interface CatalogSkill {
  /** Canonical display name. */
  name: string;
  category: CandidateSkillCategory;
  /** Other spellings matched anywhere in a resume, case-insensitively. */
  aliases?: readonly string[];
  /** The canonical name only matches with exactly this capitalization (for example "Java"). */
  exactCase?: boolean;
  /**
   * The canonical name is an ordinary word too ("Go", "R", "Spark"), so it only counts inside a
   * resume's skills section. Aliases still match anywhere.
   */
  skillsSectionOnly?: boolean;
}

function skills(
  category: CandidateSkillCategory,
  entries: readonly Omit<CatalogSkill, "category">[],
) {
  return entries.map((entry) => ({ ...entry, category }));
}

export const skillsCatalog: readonly CatalogSkill[] = [
  ...skills("programming", [
    { name: "JavaScript" },
    { name: "TypeScript" },
    { name: "Python" },
    { name: "Java", exactCase: true },
    { name: "C", exactCase: true, skillsSectionOnly: true },
    { name: "C++", aliases: ["cpp"] },
    { name: "C#", aliases: ["csharp"] },
    { name: "Go", aliases: ["Golang"], exactCase: true, skillsSectionOnly: true },
    { name: "Rust", exactCase: true },
    { name: "Ruby", exactCase: true },
    { name: "PHP" },
    { name: "Swift", exactCase: true },
    { name: "Kotlin" },
    { name: "Scala" },
    { name: "R", exactCase: true, skillsSectionOnly: true },
    { name: "Dart", exactCase: true },
    { name: "Elixir" },
    { name: "Haskell" },
    { name: "Perl" },
    { name: "Lua" },
    { name: "MATLAB" },
    { name: "Objective-C" },
    { name: "Bash", aliases: ["shell scripting"] },
    { name: "SQL" },
    { name: "Solidity" },
    { name: "Julia", exactCase: true, skillsSectionOnly: true },
    { name: "Clojure" },
    { name: "F#" },
    { name: "Erlang" },
    { name: "Groovy" },
  ]),
  ...skills("frontend", [
    { name: "React", aliases: ["React.js", "ReactJS"] },
    { name: "Next.js", aliases: ["NextJS"] },
    { name: "Vue.js", aliases: ["Vue", "VueJS"] },
    { name: "Nuxt" },
    { name: "Angular" },
    { name: "Svelte" },
    { name: "HTML", aliases: ["HTML5"] },
    { name: "CSS", aliases: ["CSS3"] },
    { name: "Sass", aliases: ["SCSS"] },
    { name: "Tailwind CSS", aliases: ["Tailwind", "TailwindCSS"] },
    { name: "Redux" },
    { name: "jQuery" },
    { name: "React Native" },
    { name: "Flutter" },
    { name: "Three.js" },
    { name: "D3.js", aliases: ["D3"] },
    { name: "Web accessibility", aliases: ["WCAG", "a11y"] },
    { name: "Remix", exactCase: true, skillsSectionOnly: true },
  ]),
  ...skills("backend", [
    { name: "Node.js", aliases: ["NodeJS"] },
    {
      name: "Express",
      aliases: ["Express.js", "ExpressJS"],
      exactCase: true,
      skillsSectionOnly: true,
    },
    { name: "Django" },
    { name: "Flask", exactCase: true },
    { name: "FastAPI" },
    { name: "Spring Boot" },
    { name: "Ruby on Rails" },
    { name: "Laravel" },
    { name: "ASP.NET" },
    { name: ".NET", aliases: ["dotnet"] },
    { name: "NestJS" },
    { name: "GraphQL" },
    { name: "REST APIs", aliases: ["REST API", "RESTful"] },
    { name: "gRPC" },
    { name: "Microservices" },
    { name: "Kafka", aliases: ["Apache Kafka"] },
    { name: "RabbitMQ" },
    { name: "tRPC" },
  ]),
  ...skills("database", [
    { name: "PostgreSQL", aliases: ["Postgres"] },
    { name: "MySQL" },
    { name: "SQLite" },
    { name: "MongoDB" },
    { name: "Redis" },
    { name: "Elasticsearch" },
    { name: "DynamoDB" },
    { name: "Cassandra" },
    { name: "Oracle Database" },
    { name: "SQL Server", aliases: ["MSSQL"] },
    { name: "Firebase" },
    { name: "Supabase" },
    { name: "Snowflake", exactCase: true },
    { name: "BigQuery" },
    { name: "Neo4j" },
    { name: "MariaDB" },
  ]),
  ...skills("cloud", [
    { name: "AWS", aliases: ["Amazon Web Services"] },
    { name: "Google Cloud", aliases: ["GCP", "Google Cloud Platform"] },
    { name: "Azure", aliases: ["Microsoft Azure"] },
    { name: "Vercel" },
    { name: "Netlify" },
    { name: "Heroku" },
    { name: "Cloudflare" },
    { name: "Serverless" },
    { name: "DigitalOcean" },
  ]),
  ...skills("devops", [
    { name: "Docker" },
    { name: "Kubernetes", aliases: ["K8s"] },
    { name: "Terraform" },
    { name: "Ansible" },
    { name: "Jenkins" },
    { name: "GitHub Actions" },
    { name: "GitLab CI" },
    { name: "CircleCI" },
    { name: "CI/CD", aliases: ["continuous integration"] },
    { name: "Linux" },
    { name: "Nginx" },
    { name: "Prometheus" },
    { name: "Grafana" },
    { name: "Helm", exactCase: true, skillsSectionOnly: true },
    { name: "Argo CD", aliases: ["ArgoCD"] },
    { name: "Pulumi" },
    { name: "Datadog" },
  ]),
  ...skills("ai_ml", [
    { name: "Machine learning", aliases: ["ML"] },
    { name: "Deep learning" },
    { name: "PyTorch" },
    { name: "TensorFlow" },
    { name: "Keras" },
    { name: "scikit-learn", aliases: ["sklearn"] },
    { name: "Pandas" },
    { name: "NumPy" },
    { name: "Natural language processing", aliases: ["NLP"] },
    { name: "Computer vision" },
    { name: "Large language models", aliases: ["LLMs", "LLM"] },
    { name: "OpenCV" },
    { name: "Data analysis" },
    { name: "Apache Spark", aliases: ["PySpark"] },
    { name: "Hadoop" },
    { name: "Airflow", aliases: ["Apache Airflow"] },
    { name: "Reinforcement learning" },
    { name: "MLOps" },
  ]),
  ...skills("tools", [
    { name: "Git" },
    { name: "GitHub" },
    { name: "GitLab" },
    { name: "Jira" },
    { name: "Figma" },
    { name: "Postman" },
    { name: "Webpack" },
    { name: "Vite", exactCase: true },
    { name: "Jest" },
    { name: "Vitest" },
    { name: "Cypress" },
    { name: "Playwright" },
    { name: "Selenium" },
    { name: "Storybook" },
    { name: "Tableau" },
    { name: "Power BI" },
    { name: "Excel", exactCase: true, skillsSectionOnly: true },
    { name: "Confluence" },
    { name: "JUnit" },
    { name: "pytest" },
    { name: "Jupyter" },
    { name: "Prisma" },
    { name: "ESLint" },
    { name: "Agile" },
    { name: "Scrum" },
  ]),
  ...skills("soft_skills", [
    { name: "Leadership" },
    { name: "Communication" },
    { name: "Teamwork" },
    { name: "Mentoring", aliases: ["mentorship"] },
    { name: "Problem solving", aliases: ["problem-solving"] },
    { name: "Project management" },
    { name: "Stakeholder management" },
    { name: "Public speaking" },
    { name: "Collaboration" },
    { name: "Time management" },
    { name: "Negotiation" },
    { name: "Critical thinking" },
    { name: "Technical writing" },
    { name: "Conflict resolution" },
  ]),
];

const byKey = new Map<string, CatalogSkill>();
for (const entry of skillsCatalog) {
  for (const spelling of [entry.name, ...(entry.aliases ?? [])]) {
    byKey.set(spelling.toLocaleLowerCase("en"), entry);
  }
}

/** Looks up a skill by its name or a known alias, ignoring case. */
export function findCatalogSkill(name: string): CatalogSkill | undefined {
  return byKey.get(name.trim().toLocaleLowerCase("en"));
}

/** The category of a catalog skill, used for skills found in a resume. */
export function categoryForSkill(name: string): CandidateSkillCategory {
  return findCatalogSkill(name)?.category ?? "tools";
}
