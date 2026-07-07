import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { config } from '../config'
import { ValidationError } from '../middleware/error-handler'

const router = Router()

const analyzeImageSchema = z.object({
  image: z.string().min(1, 'Image base64 data is required'),
  mimeType: z.string().default('image/jpeg'),
})

interface AiImageAnalysis {
  category: string
  severity: string
  title: string
  description: string
  department: string
  confidence: number
  is_valid_civic_issue: boolean
  rejection_reason?: string
  estimated_resolution_days?: number
}

router.post('/analyze-image', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = analyzeImageSchema.parse(req.body)

    if (!config.geminiApiKey) {
      res.status(503).json({ error: 'AI analysis is not configured' })
      return
    }

    const analysis = await callGeminiVision(body.image, body.mimeType)
    if (!analysis) {
      res.status(502).json({ error: 'AI analysis failed' })
      return
    }

    res.json({ analysis })
  } catch (err) {
    if (err instanceof z.ZodError) return next(new ValidationError(err.errors[0].message))
    next(err)
  }
})

async function callGeminiVision(imageBase64: string, mimeType: string): Promise<AiImageAnalysis | null> {
  const prompt = `Analyze this image of a civic issue and respond with JSON only.

Respond with this exact JSON structure:
{
  "category": one of [pothole, road_damage, water_leak, sewage, streetlight, garbage, illegal_dumping, fallen_tree, park_damage, other],
  "severity": one of [low, medium, high, critical],
  "title": "very short title max 50 chars describing the issue",
  "description": "one sentence description of what you see, max 150 chars",
  "department": one of [roads, water, electricity, waste, parks, other],
  "confidence": float between 0 and 1,
  "is_valid_civic_issue": true or false,
  "rejection_reason": "only if is_valid_civic_issue is false, explain why",
  "estimated_resolution_days": integer estimate of how long this typically takes to fix
}`

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: imageBase64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
        signal: AbortSignal.timeout(30000),
      }
    )

    if (!resp.ok) {
      const errorBody = await resp.text()
      console.error(`Gemini API error: ${resp.status} - ${errorBody.slice(0, 500)}`)
      return null
    }

    const data: any = await resp.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim()
    try {
      return JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('Failed to parse Gemini response as JSON:', cleaned.slice(0, 300))
      return null
    }
  } catch (err) {
    console.error('Gemini Vision API call failed:', err)
    return null
  }
}

export default router
