import Groq from 'groq-sdk';

export async function askGroqJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  fallbackResponse: T,
  imageUrl?: string
): Promise<T> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.log('[Groq] GROQ_API_KEY is missing. Using fallback mock verification response.');
    return fallbackResponse;
  }

  const groq = new Groq({ apiKey });

  try {
    let messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: userPrompt });
    }

    const modelToUse = imageUrl ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile';

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: modelToUse,
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
