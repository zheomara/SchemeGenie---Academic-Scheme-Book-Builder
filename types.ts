
export interface Lesson {
  id: string;
  term: number; // 1, 2, or 3
  week: number;
  lessonNumber: number;
  topic: string;
  objectives: string;
  concepts: string;
  activities: string;
  resources: string;
  assessment: string;
  homework: string;
  evaluation: string;
  remarks: string;
  weekEnding: string;
  lessonPlanContent?: string;
  worksheetContent?: string;
  slidesContent?: string[];
  isGeneratingResources?: boolean;
}

export interface SchemeMetadata {
  subject: string;
  form: string;
  weeksPerTerm: number;
  lessonsPerWeek: number;
  lessonsPerTerm: number; // User-defined target per term
  teacherName: string;
  school: string;
  academicYear: string;
  manualTopics?: string;
  termStarts: {
    term1: string;
    term2: string;
    term3: string;
  };
}

export interface SchemeBook {
  id: string;
  metadata: SchemeMetadata;
  lessons: Lesson[];
  createdAt: number;
}

export enum SubjectType {
  MATH = 'Math',
  SCIENCE = 'Science',
  ENGLISH = 'English',
  SOCIAL_STUDIES = 'Social Studies',
  ART = 'Art',
  MUSIC = 'Music',
  PHYSICAL_EDUCATION = 'PE'
}
