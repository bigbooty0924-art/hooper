export type CoreCategory = {
  key: string;
  label: string;
  years: number;
  detail: string;
};

/** NCAA Division I: 16 core courses */
export const CORE_CATEGORIES: CoreCategory[] = [
  { key: "english", label: "English", years: 4, detail: "4 years of English" },
  {
    key: "math",
    label: "Mathematics",
    years: 3,
    detail: "3 years of math (Algebra I or higher)",
  },
  {
    key: "science",
    label: "Natural / Physical Science",
    years: 2,
    detail: "2 years, including one year of lab science if your school offers it",
  },
  {
    key: "extra_core",
    label: "Additional English, Math or Science",
    years: 1,
    detail: "1 extra year of English, math or natural/physical science",
  },
  {
    key: "social_science",
    label: "Social Science",
    years: 2,
    detail: "2 years of social science",
  },
  {
    key: "additional",
    label: "Additional Core Courses",
    years: 4,
    detail: "4 years from any area above, plus foreign language or comparative religion/philosophy",
  },
];

export const TOTAL_CORE_COURSES = CORE_CATEGORIES.reduce((sum, c) => sum + c.years, 0); // 16

export type CoreCourseRow = {
  id: string;
  category: string;
  slot: number;
  course_name: string | null;
  completed: boolean;
  grade: string | null;
};
