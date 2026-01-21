
import { GoogleGenAI, Type } from "@google/genai";
import { SchemeMetadata, Lesson } from "../types";

export interface ExtractedSyllabusInfo {
  subject: string;
  form: string;
  recommendedWeeksPerTerm: number;
}

export const extractSyllabusInfo = async (
  syllabusFile: { data: string, mimeType: string }
): Promise<ExtractedSyllabusInfo> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: "Analyze this syllabus. Identify the subject, target form/grade, and recommended weeks per term (usually 10-13) for a 3-term academic year." },
        { inlineData: syllabusFile }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          form: { type: Type.STRING },
          recommendedWeeksPerTerm: { type: Type.INTEGER },
        },
        required: ["subject", "form", "recommendedWeeksPerTerm"],
      }
    }
  });

  try {
    const text = response.text ?? "";
    return JSON.parse(text.trim());
  } catch (error) {
    return { subject: "", form: "", recommendedWeeksPerTerm: 12 };
  }
};

/**
 * Generates a specific chunk of lessons to ensure extreme detail and prevent truncation.
 */
export const generateLessonChunk = async (
  term: number,
  startLesson: number,
  endLesson: number,
  metadata: SchemeMetadata, 
  syllabusFile?: { data: string, mimeType: string }
): Promise<Partial<Lesson>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const textPrompt = `
    Act as a Senior Curriculum Specialist. You are creating a specific batch of lessons for a detailed Scheme of Work.
    
    TARGET: TERM ${term}, LESSONS ${startLesson} TO ${endLesson}.
    
    CRITICAL QUALITY MANDATE:
    1. EXTREME DETAIL: Every field must be exhaustive. No generic placeholders.
    2. RESOURCES: List specific textbooks (incl. page ranges), exact laboratory equipment (quantities and types), specific digital links (YouTube, Simulations), and detailed visual aids.
    3. EVALUATION CRITERIA: Must be highly specific success indicators. What EXACTLY must the pupil do to show mastery? Use measurable verbs.
    4. OBJECTIVES: "Pupils will be able to..." followed by at least 3 high-level Bloom's taxonomy objectives.
    5. ACTIVITIES: Step-by-step classroom procedure including introduction, core activity, and plenary.

    Metadata:
    - Subject: ${metadata.subject}
    - Level: Form ${metadata.form}
    - Term: ${term}

    CONTEXT: This is for a 3-term year where each term has 72 lessons. Ensure the content for lessons ${startLesson}-${endLesson} is appropriate for this stage of the syllabus.

    Output format:
    Return an array of objects for lessons ${startLesson} through ${endLesson}.
    Each object: { "term": ${term}, "week": number, "lessonNumber": number, "topic": string, "objectives": string, "activities": string, "resources": string, "assessment": string, "homework": string, "evaluation": string }
  `;

  const contents = syllabusFile 
    ? { parts: [{ text: textPrompt }, { inlineData: syllabusFile }] }
    : textPrompt;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contents,
    config: {
      thinkingConfig: { thinkingBudget: 2000 },
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
          },
          required: ["term", "week", "lessonNumber", "topic", "objectives", "activities", "resources", "assessment", "homework", "evaluation"],
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
    throw new Error(`Failed to generate lessons ${startLesson}-${endLesson}. API limit or timeout.`);
  }
};

export const generateLessonResourcesContent = async (
  lesson: Lesson,
  metadata: SchemeMetadata
): Promise<Pick<Lesson, 'lessonPlanContent' | 'worksheetContent' | 'slidesContent' | 'videoGuideDescription'>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Generate a hyper-detailed teaching package for Topic: "${lesson.topic}". 
    Reference existing resources: "${lesson.resources}".
    Evaluation criteria to hit: "${lesson.evaluation}".
    
    Package must include:
    1. A 600-word Lesson Plan.
    2. A 15-question comprehensive Worksheet.
    3. 7 Content-rich Presentation Slides.
    4. A Video Script.
    
    Use "Pupils" throughout.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lessonPlanContent: { type: Type.STRING },
          worksheetContent: { type: Type.STRING },
          slidesContent: { type: Type.ARRAY, items: { type: Type.STRING } },
          videoGuideDescription: { type: Type.STRING },
        },
        required: ["lessonPlanContent", "worksheetContent", "slidesContent", "videoGuideDescription"],
      }
    }
  });
  const text = response.text ?? "";
  return JSON.parse(text.trim());
};
