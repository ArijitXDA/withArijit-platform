import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/service'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages', { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch live context in parallel
    const [{ data: courses }, { data: webinarData }] = await Promise.all([
      (supabase as any).from('awa_courses').select('name, description, mrp').eq('is_active', true),
      (supabase as any)
        .from('qr_landing_webinar_links')
        .select('webinar_date, webinar_time, webinar_link')
        .order('webinar_date')
        .limit(1)
        .maybeSingle(),
    ])

    const webinar = webinarData ?? null

    const systemPrompt = `You are Ari, an AI assistant for withArijit — India's #1 AI Education Platform.

Your role: Help visitors discover courses, answer questions about pricing and curriculum, and guide them to register for the free webinar.

Available courses:
${JSON.stringify(courses ?? [], null, 2)}

${webinar ? `Next free webinar: ${webinar.webinar_date} at ${webinar.webinar_time} — ${webinar.webinar_link}` : 'Free webinars available — direct them to /free-webinar to register.'}

Instructions:
- Be warm, enthusiastic, and concise (max 3-4 sentences per response)
- Always cite actual course names and prices — never guess
- Guide every conversation towards a next step: free webinar registration or course enrollment
- For pricing, use the live data above — do not hallucinate prices
- If asked about something you don't know, direct them to ai@withArijit.com`

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10), // last 10 messages for context window efficiency
      ],
      stream: true,
      max_tokens: 500,
      temperature: 0.7,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('Visitor agent error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
