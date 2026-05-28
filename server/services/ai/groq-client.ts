import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.warn('⚠️ WARNING: GROQ_API_KEY is not defined in environment variables. AI verification will run in fallback mock mode.');
}

export const groq = apiKey ? new Groq({ apiKey }) : null;

export async function askGroqJSON<T>(systemPrompt: string, userPrompt: string, fallbackResponse: T): Promise<T> {
  if (!groq) {
    console.log('[Groq] GROQ_API_KEY is missing. Using fallback mock verification response.');
    return fallbackResponse;
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'llama-3.1-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.1, // low temperature for deterministic evaluation
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      console.warn('[Groq] Empty completion content received.');
      return fallbackResponse;
    }

    return JSON.parse(content) as T;
  } catch (error) {
    console.error('[Groq] Error during chat completion:', error);
    return fallbackResponse;
  }
}
