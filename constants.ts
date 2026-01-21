import { SubjectType } from './types';

export const SUBJECT_TEMPLATES = [
  { id: 'math-8', name: 'Math (Form 8)', subject: SubjectType.MATH, form: '8' },
  { id: 'science-7', name: 'Science (Form 7)', subject: SubjectType.SCIENCE, form: '7' },
  { id: 'english-9', name: 'English (Form 9)', subject: SubjectType.ENGLISH, form: '9' },
  { id: 'history-10', name: 'History (Form 10)', subject: SubjectType.SOCIAL_STUDIES, form: '10' },
];

export const COLUMN_HEADERS = [
  'Week',
  'Week Ending',
  'L#',
  'Topic',
  'Learning Objectives',
  'Key Concepts',
  'Activities',
  'Reference Materials',
  'Assessment',
  'Homework',
  'Evaluation Criteria',
  'EVALUATION',
  'Actions'
];

export const LOADING_MESSAGES = [
  "Extracting topics from syllabus...",
  "Creating logical lesson sequencing...",
  "Generating custom student handouts for every lesson...",
  "Designing classroom activities...",
  "Consulting academic standards...",
  "Finalizing your professional scheme book...",
];