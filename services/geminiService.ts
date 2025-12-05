import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  // Use import.meta.env for Vite environment variables
  // The API key is configured via VITE_API_KEY environment variable
  return new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
};

export const cleanContentWithGemini = async (rawText: string, title: string): Promise<string> => {
  try {
    const ai = getClient();
    // Using flash for speed and cost efficiency on bulk text
    const model = "gemini-2.5-flash"; 
    
    const prompt = `
      You are an expert editor. Convert the following raw newspaper text into clean, well-formatted Markdown.
      
      Rules:
      1. Fix broken line breaks and paragraph spacing.
      2. Remove any "Click here" or "Page X" metadata if it appears in the body.
      3. Ensure the title is a H1 header.
      4. Do not summarize; keep the full content.
      5. Return ONLY the Markdown content.

      Title: ${title}
      Raw Text:
      ${rawText.substring(0, 30000)} 
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || rawText;
  } catch (error) {
    console.error("Gemini cleanup failed:", error);
    // Return raw text if API fails so user doesn't lose data
    return rawText; 
  }
};