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
 * Sentinel Vision AI Engine (Powered by Groq Vision)
 * Analyzes citizen-uploaded media to verify disaster severity and authenticity.
 * Uses Groq's llama-3.2-90b-vision-preview model to actually examine the image.
 */
export async function analyzeImage(imageUrl: string): Promise<VisionAnalysisResult> {
  if (!GROQ_API_KEY) {
    console.warn('[Vision AI] No GROQ_API_KEY found. Returning neutral analysis.');
    return {
      hasDamage: false,
      damageType: null,
      confidence: 0.5,
      tags: ['no_api_key_available'],
      rawAnalysis: 'Vision analysis unavailable — no API key configured.',
    };
  }

  const groq = new Groq({ apiKey: GROQ_API_KEY });

  try {
    console.log(`[Vision AI] Analyzing image with Groq Vision: ${imageUrl}`);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a disaster image forensics expert. Analyze the provided image and determine:
1. What the image actually shows (flood, fire, drought, earthquake damage, clear weather, normal scene, etc.)
2. Whether the image appears to be AI-generated, digitally manipulated, or a stock photo
3. Signs of authenticity (EXIF-like visual cues, natural lighting, real-world imperfections) vs AI artifacts (unnatural smoothness, impossible geometry, distorted text, extra fingers/limbs)
4. The severity of any visible damage or disaster conditions

You MUST respond ONLY in valid JSON format:
{
  "detected_scene": string (what the image actually depicts, e.g. "flooding with submerged buildings", "clear dry landscape", "wildfire smoke"),
  "detected_disaster_types": string[] (disaster types visible: "flood", "wildfire", "earthquake", "drought", "cyclone", "tornado", "landslide", "blizzard", "heatwave", "none"),
  "is_ai_generated": boolean (true if image appears artificially generated),
  "ai_generation_indicators": string[] (list any AI artifacts found: "unnatural_smoothness", "distorted_objects", "impossible_geometry", "watermark_detected", "stock_photo_indicators", etc.),
  "authenticity_confidence": number (0.0 to 1.0, how confident you are this is a REAL photo of a REAL disaster),
  "damage_severity": string ("none", "minor", "moderate", "severe", "catastrophic"),
  "visual_tags": string[] (descriptive tags of what you see: "water", "smoke", "debris", "fire", "collapsed_structure", "dry_land", "clear_sky", etc.),
  "analysis_summary": string (2-3 sentence detailed explanation of what you see and your assessment)
}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this disaster report image for authenticity and content verification:'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      model: 'llama-3.2-90b-vision-preview',
      temperature: 0.1,
      max_tokens: 1024,
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      console.warn('[Vision AI] Empty response from Groq Vision.');
      return {
        hasDamage: false,
        damageType: null,
        confidence: 0.5,
        tags: ['vision_analysis_empty'],
        rawAnalysis: 'Vision model returned empty response.',
      };
    }

    console.log('[Vision AI] Raw Groq Vision response:', content);

    // Try to parse JSON from the response (handle markdown code blocks)
    let parsed: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseErr) {
      console.error('[Vision AI] Failed to parse Groq Vision JSON:', parseErr);
      return {
        hasDamage: false,
        damageType: null,
        confidence: 0.5,
        tags: ['vision_parse_error'],
        rawAnalysis: content,
      };
    }

    // Build tags from detected info
    const tags: string[] = [
      ...(parsed.visual_tags || []),
      ...(parsed.detected_disaster_types || []).filter((t: string) => t !== 'none'),
    ];

    if (parsed.is_ai_generated) {
      tags.push('AI_GENERATED_IMAGE');
      if (parsed.ai_generation_indicators) {
        tags.push(...parsed.ai_generation_indicators);
      }
    }

    // Determine damage
    const hasDamage = parsed.damage_severity && parsed.damage_severity !== 'none';
    const damageType = parsed.detected_scene || null;

    // Calculate confidence — heavily penalize AI-generated images
    let confidence = parsed.authenticity_confidence || 0.5;
    if (parsed.is_ai_generated) {
      confidence = Math.min(confidence, 0.15); // AI images get max 15% confidence
    }

    const result: VisionAnalysisResult = {
      hasDamage,
      damageType,
      confidence,
      tags,
      rawAnalysis: parsed.analysis_summary || content,
    };

    console.log(`[Vision AI] Analysis complete: confidence=${confidence}, tags=[${tags.join(', ')}], ai_generated=${parsed.is_ai_generated}`);
    return result;
  } catch (error: any) {
    console.error('[Vision AI] Groq Vision inference failed:', error?.message || error);
    
    // If the vision model fails (e.g., can't access URL), return a cautious neutral result
    return {
      hasDamage: false,
      damageType: null,
      confidence: 0.4,
      tags: ['vision_analysis_failed'],
      rawAnalysis: `Vision analysis failed: ${error?.message || 'Unknown error'}`,
    };
  }
}
