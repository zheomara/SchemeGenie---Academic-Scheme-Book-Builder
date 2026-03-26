
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { SchemeMetadata, Lesson } from "../types";

export interface ExtractedSyllabusInfo {
  subject: string;
  form: string;
  recommendedWeeksPerTerm: number;
  recommendedLessonsPerWeek: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generic retry wrapper to handle transient API errors and Quota limits.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errorMessage = err.message?.toLowerCase() || "";
      const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429') || err.status === 429;
      
      if (isQuotaError && i < maxRetries - 1) {
        const waitTime = (i + 1) * 5000; // Reduced wait time for faster recovery
        console.warn(`Quota exceeded. Retrying in ${waitTime/1000}s... (Attempt ${i + 1}/${maxRetries})`);
        await sleep(waitTime);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

export const extractSyllabusInfo = async (
  syllabusFile: { data: string, mimeType: string }
): Promise<ExtractedSyllabusInfo> => {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: "Analyze this syllabus. Identify the subject, target form/grade, recommended weeks per term (usually 10-13), and recommended lessons per week (usually 4-8) for a 3-term academic year." },
          { inlineData: syllabusFile }
        ]
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            form: { type: Type.STRING },
            recommendedWeeksPerTerm: { type: Type.INTEGER },
            recommendedLessonsPerWeek: { type: Type.INTEGER },
          },
          required: ["subject", "form", "recommendedWeeksPerTerm", "recommendedLessonsPerWeek"],
        }
      }
    });

    try {
      const text = response.text ?? "";
      return JSON.parse(text.trim());
    } catch (error) {
      return { subject: "", form: "", recommendedWeeksPerTerm: 12, recommendedLessonsPerWeek: 6 };
    }
  });
};

export const generateLessonChunk = async (
  term: number,
  startLesson: number,
  endLesson: number,
  metadata: SchemeMetadata, 
  syllabusFile?: { data: string, mimeType: string }
): Promise<Partial<Lesson>[]> => {
  return withRetry(async () => {
    const ai = getAI();
    
    // Strictness logic for manual topics
    const sourceConstraint = syllabusFile 
      ? "STRICTLY follow the content provided in the attached syllabus PDF." 
      : `STRICTLY ADHERE ONLY to the topics provided in this list: "${metadata.manualTopics}". DO NOT introduce any topics outside of this list. If there are fewer topics than requested lessons, break the provided topics down into highly detailed sub-topics or practical sessions, but DO NOT add unrelated subject matter.`;

    const textPrompt = `
      Act as a Senior Curriculum Specialist. You are creating a batch of lessons for a Scheme of Work.
      
      CONTEXT: ${sourceConstraint}
      
      TARGET: TERM ${term}, LESSONS ${startLesson} TO ${endLesson}.
      TOTAL LESSONS FOR THIS TERM: ${metadata.lessonsPerTerm}.

      CRITICAL QUALITY MANDATE:
      1. EXTREME DETAIL: Every field must be exhaustive. 
      2. RESOURCES: List specific textbooks, laboratory equipment, digital links, and visual aids.
      3. EVALUATION CRITERIA: Highly specific success indicators with measurable verbs.
      4. OBJECTIVES: "Pupils will be able to..." followed by at least 3 objectives.
      5. ACTIVITIES: Step-by-step procedure.

      Metadata:
      - Subject: ${metadata.subject}
      - Level: Form ${metadata.form}

      Output format:
      Return an array of objects for lessons ${startLesson} through ${endLesson}.
      Each object: { "term": ${term}, "week": number, "lessonNumber": number, "topic": string, "objectives": string, "activities": string, "resources": string, "assessment": string, "homework": string, "evaluation": string, "videoResources": [{ "title": string, "url": string }] }
      For "videoResources", provide 1-2 relevant educational video links (e.g., YouTube, Khan Academy) that explain the topic.
    `;

    const contents = syllabusFile 
      ? { parts: [{ text: textPrompt }, { inlineData: syllabusFile }] }
      : textPrompt;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              term: { type: Type.INTEGER },
              week: { type: Type.INTEGER },
              lessonNumber: { type: Type.INTEGER },
              topic: { type: Type.STRING },
              objectives: { type: Type.STRING },
              activities: { type: Type.STRING },
              resources: { type: Type.STRING },
              assessment: { type: Type.STRING },
              homework: { type: Type.STRING },
              evaluation: { type: Type.STRING },
              videoResources: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    url: { type: Type.STRING },
                  },
                  required: ["title", "url"],
                }
              }
            },
            required: ["term", "week", "lessonNumber", "topic", "objectives", "activities", "resources", "assessment", "homework", "evaluation", "videoResources"],
          }
        }
      }
    });

    try {
      const text = response.text ?? "";
      const result = JSON.parse(text.trim());
      if (!Array.isArray(result)) throw new Error("Output is not an array");
      return result;
    } catch (error) {
      console.error(`Batch ${startLesson}-${endLesson} failed:`, error);
      throw new Error(`Failed to generate lessons ${startLesson}-${endLesson}.`);
    }
  });
};

export const generateLessonResourcesContent = async (
  lesson: Lesson,
  metadata: SchemeMetadata
): Promise<Pick<Lesson, 'lessonPlanContent' | 'worksheetContent' | 'slidesContent' | 'videoGuideDescription'>> => {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a hyper-detailed teaching package for Topic: "${lesson.topic}". 
      Reference existing resources: "${lesson.resources}".
      Evaluation criteria to hit: "${lesson.evaluation}".
      
      Package must include:
      1. A 600-word Lesson Plan.
      2. A 15-question comprehensive Worksheet.
      3. 7 Content-rich Presentation Slides.
      4. A Video Script.
      5. 2-3 relevant educational video links (YouTube, etc.) explaining the topic.
      
      Use "Pupils" throughout.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lessonPlanContent: { type: Type.STRING },
            worksheetContent: { type: Type.STRING },
            slidesContent: { type: Type.ARRAY, items: { type: Type.STRING } },
            videoGuideDescription: { type: Type.STRING },
            videoResources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING },
                },
                required: ["title", "url"],
              }
            }
          },
          required: ["lessonPlanContent", "worksheetContent", "slidesContent", "videoGuideDescription", "videoResources"],
        }
      }
    });
    const text = response.text ?? "";
    return JSON.parse(text.trim());
  });
};
