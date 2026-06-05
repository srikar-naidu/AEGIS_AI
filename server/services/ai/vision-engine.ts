import Groq from 'groq-sdk';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export interface VisionAnalysisResult {
  hasDamage: boolean;
  damageType: string | null;
  confidence: number;
  tags: string[];
  rawAnalysis: string;
}

/**
 * Sentinel Vision AI Engine (Powered by Roboflow CLIP & Groq)
 * Analyzes citizen-uploaded media to verify disaster severity and authenticity.
 */
export async function analyzeImage(imageUrl: string, claimedType: string, description: string): Promise<VisionAnalysisResult> {
  const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY || '21IpOwYOPyTyHWw6in1p';
  
  if (!GROQ_API_KEY) {
    console.warn('[Vision AI] No GROQ_API_KEY found. Returning neutral analysis.');
    return {
      hasDamage: false,
      damageType: null,
      confidence: 0.5,
      tags: ['no_api_key_available'],
      rawAnalysis: 'Vision analysis unavailable — no Groq API key configured.',
    };
  }

  const groq = new Groq({ apiKey: GROQ_API_KEY });

  try {
    console.log(`[Vision AI] Analyzing image with Roboflow CLIP: ${imageUrl}`);

    // Step 1: Call Roboflow CLIP Workflow
    const classes = [...new Set([claimedType, 'flood', 'wildfire', 'earthquake damage', 'drought', 'storm', 'cyclone', 'normal clear scene', 'building debris', 'heavy smoke'])];

    let subjectPayload: any = { type: "url", value: imageUrl };
    if (imageUrl.startsWith('data:image/')) {
      const base64Data = imageUrl.split(',')[1];
      subjectPayload = { type: "base64", value: base64Data };
    }

    const clipResponse = await fetch(`https://infer.roboflow.com/clip/compare?api_key=${ROBOFLOW_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: subjectPayload,
        subject_type: "image",
        prompt: classes
      })
    });

    if (!clipResponse.ok) {
      const errorText = await clipResponse.text();
      throw new Error(`Roboflow CLIP failed: ${clipResponse.status} ${errorText}`);
    }

    const clipData = await clipResponse.json();
    let parsedClipData = clipData;
    if (clipData.similarity && clipData.similarity.length === classes.length) {
      const mappedResults: Record<string, number> = {};
      classes.forEach((c, idx) => {
        mappedResults[c] = clipData.similarity[idx];
      });
      parsedClipData = mappedResults;
    }
    console.log(`[Vision AI] Roboflow CLIP response received. Interpreting with Groq...`);

    // Step 2: Use Groq text model to interpret CLIP output against citizen claims
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a disaster image forensics expert. You will receive raw output from a Roboflow CLIP visual model, along with a citizen's claimed disaster type and description.
Your job is to deeply analyze the CLIP output and determine:
1. Does the CLIP data confirm the citizen's claimed disaster type and description?
2. What actual disaster/damage does the image portray?

You MUST respond ONLY in valid JSON format:
{
  "hasDamage": boolean (true if visual data suggests actual disaster or damage),
  "damageType": string | null (the actual disaster type detected, or null if clear/unrelated),
  "confidence": number (0.0 to 1.0, how confident you are that the visual data matches the citizen's claim),
  "tags": string[] (descriptive tags of what the CLIP data found),
  "rawAnalysis": string (2-4 sentence detailed forensic report explaining if the claim matches the image, based purely on the CLIP data)
}`
        },
        {
          role: 'user',
          content: `Claimed Disaster Type: ${claimedType}
Claimed Description: ${description}

Roboflow CLIP Output:
${JSON.stringify(parsedClipData, null, 2)}

Analyze this data and determine if the visual data matches the claims.`
        },
      ],
      model: 'llama3-70b-8192',
      temperature: 0.1,
      max_tokens: 1024,
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      console.warn('[Vision AI] Empty response from Groq Text Model.');
      throw new Error('Groq model returned empty response.');
    }

    // Try to parse JSON from the response
    let parsed: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseErr) {
      console.error('[Vision AI] Failed to parse Groq JSON:', parseErr);
      return {
        hasDamage: false,
        damageType: null,
        confidence: 0.5,
        tags: ['vision_parse_error'],
        rawAnalysis: content,
      };
    }

    const result: VisionAnalysisResult = {
      hasDamage: parsed.hasDamage || false,
      damageType: parsed.damageType || null,
      confidence: parsed.confidence ?? 0.5,
      tags: parsed.tags || [],
      rawAnalysis: parsed.rawAnalysis || 'Analysis complete.',
    };

    console.log(`[Vision AI] Analysis complete: confidence=${result.confidence}, tags=[${result.tags.join(', ')}]`);
    return result;
  } catch (error: any) {
    console.error('[Vision AI] Vision inference failed:', error?.message || error);
    
    return {
      hasDamage: false,
      damageType: null,
      confidence: 0.4,
      tags: ['vision_analysis_failed'],
      rawAnalysis: `Vision analysis failed: ${error?.message || 'Unknown error'}`,
    };
  }
}
