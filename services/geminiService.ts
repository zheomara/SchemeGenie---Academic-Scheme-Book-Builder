
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import OpenAI from "openai";
import { SchemeMetadata, Lesson } from "../types";

export interface ExtractedSyllabusInfo {
  subject: string;
  form: string;
  recommendedWeeksPerTerm: number;
  recommendedLessonsPerWeek: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ 
    apiKey, 
    dangerouslyAllowBrowser: true
  });
};

/**
 * Generic retry wrapper with OpenAI fallback.
 */
async function withRetry<T>(fn: () => Promise<T>, fallbackFn?: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errorMessage = err.message?.toLowerCase() || "";
      const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429') || err.status === 429;
      
      if (isQuotaError) {
        if (fallbackFn) {
          console.warn("Gemini quota reached. Falling back to OpenAI...");
          try {
            return await fallbackFn();
          } catch (fallbackErr) {
            console.error("OpenAI fallback also failed:", fallbackErr);
          }
        }
        
        if (i < maxRetries - 1) {
          const waitTime = (i + 1) * 3000;
          console.warn(`Retrying Gemini in ${waitTime/1000}s... (Attempt ${i + 1}/${maxRetries})`);
          await sleep(waitTime);
          continue;
        }
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
  const geminiCall = async () => {
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
    const text = response.text ?? "";
    return JSON.parse(text.trim());
  };

  const openAICall = async () => {
    const openai = getOpenAI();
    if (!openai) throw new Error("OpenAI fallback unavailable (no key)");
    throw new Error("OpenAI fallback not yet optimized for direct file analysis.");
  };

  return withRetry(geminiCall, openAICall);
};

export const generateLessonChunk = async (
  term: number,
  startLesson: number,
  endLesson: number,
  metadata: SchemeMetadata, 
  syllabusFile?: { data: string, mimeType: string }
): Promise<Partial<Lesson>[]> => {
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
    Each object: { "term": ${term}, "week": number, "lessonNumber": number, "topic": string, "objectives": string, "activities": string, "resources": string, "assessment": string, "homework": string, "evaluation": string }
  `;

  const geminiCall = async () => {
    const ai = getAI();
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
            },
            required: ["term", "week", "lessonNumber", "topic", "objectives", "activities", "resources", "assessment", "homework", "evaluation"],
          }
        }
      }
    });
    const text = response.text ?? "";
    const result = JSON.parse(text.trim());
    if (!Array.isArray(result)) throw new Error("Output is not an array");
    return result;
  };

  const openAICall = async () => {
    const openai = getOpenAI();
    if (!openai) throw new Error("OpenAI fallback unavailable");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a Senior Curriculum Specialist. Return ONLY valid JSON." },
        { role: "user", content: textPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content);
    const lessons = Array.isArray(parsed) ? parsed : (Object.values(parsed).find(v => Array.isArray(v)) as any[]);
    if (!lessons) throw new Error("OpenAI failed to return an array of lessons");
    return lessons;
  };

  return withRetry(geminiCall, openAICall);
};

export const generateLessonResourcesContent = async (
  lesson: Lesson,
  metadata: SchemeMetadata
): Promise<Pick<Lesson, 'lessonPlanContent' | 'worksheetContent' | 'slidesContent'>> => {
  const prompt = `Generate a hyper-detailed teaching package for Topic: "${lesson.topic}". 
    Reference existing resources: "${lesson.resources}".
    Evaluation criteria to hit: "${lesson.evaluation}".
    
    Package must include:
    1. A 600-word Lesson Plan.
    2. A 15-question comprehensive Worksheet.
    3. 7 Content-rich Presentation Slides.
    
    Use "Pupils" throughout.
    
    Return JSON: { "lessonPlanContent": string, "worksheetContent": string, "slidesContent": string[] }`;

  const geminiCall = async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
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
          },
          required: ["lessonPlanContent", "worksheetContent", "slidesContent"],
        }
      }
    });
    const text = response.text ?? "";
    return JSON.parse(text.trim());
  };

  const openAICall = async () => {
    const openai = getOpenAI();
    if (!openai) throw new Error("OpenAI fallback unavailable");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a Senior Curriculum Specialist. Return ONLY valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "{}";
    return JSON.parse(content);
  };

  return withRetry(geminiCall, openAICall);
};
