import { GoogleGenAI } from '@google/genai';

const SUMMARY_KEYS = ['teaching', 'grading', 'approachability', 'workload', 'overall'];

let ai = null;
const getClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!ai) ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return ai;
};

// Returns the five category summaries, or null when no real summary could be produced
// (no API key, API error, or a malformed response). Never invents a summary: callers must
// show the summary as unavailable instead.
export const generateTeacherSummaries = async (reviews) => {
  if (!reviews || reviews.length === 0) {
    throw new Error('No reviews provided to summarize');
  }

  const reviewsText = reviews
    .filter(r => r.reviewText && r.reviewText.trim().length > 0)
    .map((r, i) => `Review ${i + 1}: ${r.reviewText}`)
    .join('\n\n');

  if (!reviewsText) {
    throw new Error('No text reviews found to summarize');
  }

  const prompt = `
    You are an expert student advisor summarizing course reviews. 
    Read the following student reviews for a teacher and generate a 2-3 sentence summary for EACH of the 5 categories below.
    Focus on capturing the actual consensus of the students.
    
    Categories:
    1. teaching: Teaching Quality & Clarity
    2. grading: Grading & Fairness
    3. approachability: Approachability & Support
    4. workload: Course Workload
    5. overall: Overall Vibe / General Consensus

    Reviews:
    ${reviewsText}

    Respond STRICTLY with a valid JSON object matching this structure (no markdown formatting, just raw JSON):
    {
      "teaching": "Summary here...",
      "grading": "Summary here...",
      "approachability": "Summary here...",
      "workload": "Summary here...",
      "overall": "Summary here..."
    }
  `;

  const client = getClient();
  if (!client) {
    console.warn('GEMINI_API_KEY is not set; AI summaries are unavailable.');
    return null;
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text;
    const jsonStr = resultText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
    const parsed = JSON.parse(jsonStr);

    const valid = parsed && SUMMARY_KEYS.every((k) => typeof parsed[k] === 'string' && parsed[k].trim());
    if (!valid) {
      console.warn('Gemini returned an incomplete summary; treating it as unavailable.');
      return null;
    }
    return Object.fromEntries(SUMMARY_KEYS.map((k) => [k, parsed[k].trim()]));
  } catch (error) {
    console.warn('Gemini API call failed:', error.message);
    return null;
  }
};
