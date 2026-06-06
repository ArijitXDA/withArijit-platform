import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? 'placeholder',
})

// House partner code that organic Ask-Ari traffic is attributed to on the FREE
// webinar. A real partner's utm_source (visitor arrived on a partner link) always
// wins over this. Defaults in code so no env change is needed to go live.
const HOUSE_PARTNER_CODE = process.env.HOUSE_PARTNER_CODE || 'ARIBOMBAY-0326'

function freeWebinarLink(code: string): string {
  const c = code || HOUSE_PARTNER_CODE
  return `https://webinar.ostaran.com?utm_source=${encodeURIComponent(c)}&utm_medium=ask_ari&utm_campaign=${encodeURIComponent(c)}`
}

// ── Safety topics — never engage ──────────────────────────────────────────────
const BLOCKED_TOPICS = [
  'politics', 'political', 'religion', 'religious', 'caste', 'sex', 'porn',
  'drug', 'weapon', 'terror', 'hack', 'crack', 'pirat', 'racist', 'communal',
  'genocide', 'war crime', 'child', 'minor', 'gambling', 'bet', 'crypto scam',
]

// ── Detect language from message ──────────────────────────────────────────────
function detectLanguage(text: string): 'hi' | 'fr' | 'es' | 'en' {
  const hi = /[\u0900-\u097F]/.test(text)
  const fr = /\b(bonjour|merci|comment|cours|prix|inscription|je suis|votre|salut)\b/i.test(text)
  const es = /\b(hola|gracias|cómo|curso|precio|inscripción|soy|estoy|quiero)\b/i.test(text)
  if (hi) return 'hi'
  if (fr) return 'fr'
  if (es) return 'es'
  return 'en'
}

function isSafeMessage(text: string): boolean {
  const lower = text.toLowerCase()
  return !BLOCKED_TOPICS.some(t => lower.includes(t))
}

// ── Ask Ari tools ──────────────────────────────────────────────────────────────
const ARI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_courses',
    description: 'Get all active AI courses with names, descriptions, and pricing.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_next_sessions',
    description: 'Get upcoming paid AI Masterclass sessions (live, instructor-led, Sunday classes) with dates, times, and course names.',
    input_schema: { type: 'object' as const, properties: {
      audience: { type: 'string', description: 'Optional audience filter: working_professionals, school, college, tech, cxo' }
    }, required: [] },
  },
  {
    name: 'capture_lead',
    description: 'Save visitor contact details to the database. Call this as soon as you have any of: name, email, or mobile from the visitor.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name:     { type: 'string', description: 'Visitor name' },
        email:    { type: 'string', description: 'Visitor email' },
        mobile:   { type: 'string', description: 'Visitor mobile number' },
        interest: { type: 'string', description: 'What course or topic they are interested in' },
      },
      required: [],
    },
  },
  {
    name: 'get_free_webinar_link',
    description: 'Get the registration link for the FREE 90-minute live AI webinar. This is a FALLBACK only — use it when a visitor balks at the paid Masterclass price, explicitly asks if there is anything free / a free trial, or is clearly not ready to commit to a paid session. The free webinar is the no-cost first step before the paid Masterclass. Always use this tool for the link — never paste a webinar URL from memory.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_group_enrol_info',
    description: 'Get information about group and corporate enrolment — pricing, minimum seats, how it works.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_platform_info',
    description: 'Get general information about oStaran — founding story, trainer, certificates, AI Kit, what makes it unique.',
    input_schema: { type: 'object' as const, properties: {
      topic: { type: 'string', description: 'Specific topic: trainer, certificate, ai_kit, partner, about, unique' }
    }, required: [] },
  },
]

// ── Tool execution ─────────────────────────────────────────────────────────────
async function executeTool(
  name: string,
  input: Record<string, any>,
  supabase: ReturnType<typeof createServiceClient>,
  sessionId: string | null,
  attributionCode: string,
): Promise<string> {

  switch (name) {

    case 'get_free_webinar_link': {
      const link = freeWebinarLink(attributionCode)
      return `**FREE 90-minute live AI webinar** — a no-cost way to experience Arijit's teaching first.\n\nRegister here: ${link}\n\nFrame it as the first step: attend free, and the paid Masterclass (₹3,999) plus the full courses are the natural next move if they want to go deeper.`
    }

    case 'get_courses': {
      const { data } = await supabase
        .from('awa_courses')
        .select('name, description, mrp, target_audience, total_sessions, slug, audience_category')
        .eq('is_active', true)
        .order('sort_order')
      if (!data?.length) return 'No courses currently available.'
      return data.map(c =>
        `• **${c.name}** — ₹${Number(c.mrp).toLocaleString('en-IN')}\n  ${c.description ?? ''}\n  For: ${c.target_audience ?? 'All learners'} · ${c.total_sessions ?? 26} live sessions\n  URL: /courses/${c.slug}`
      ).join('\n\n')
    }

    case 'get_next_sessions': {
      // Query paid Masterclass sessions from awa_webinar_sessions (NOT the free webinar QR table)
      const { data } = await supabase
        .from('awa_webinar_sessions')
        .select('id, course_name, webinar_date, webinar_time, session_type')
        .eq('status', 'scheduled')
        .eq('session_type', 'student')
        .gte('webinar_date', new Date().toISOString().split('T')[0])
        .order('webinar_date')
        .limit(6)
      if (!data?.length) return 'Next Masterclass sessions are being scheduled. Visit /masterclass to register and we\'ll notify you.'
      return data.map(s =>
        `• **${s.course_name}** — ${new Date(s.webinar_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} at ${String(s.webinar_time).slice(0, 5)} IST\n  Register at: ostaran.com/masterclass`
      ).join('\n\n')
    }

    case 'capture_lead': {
      if (!sessionId) return 'Lead noted.'
      const { name, email, mobile, interest } = input
      if (!name && !email && !mobile) return 'No contact details to save.'
      await supabase
        .from('visitor_chat_sessions')
        .update({
          visitor_name:     name || null,
          visitor_email:    email || null,
          visitor_mobile:   mobile || null,
          visitor_interest: interest || null,
          lead_captured:    true,
          updated_at:       new Date().toISOString(),
        })
        .eq('id', sessionId)
      return 'Details saved. Our team will be in touch! 🙏'
    }

    case 'get_group_enrol_info': {
      return `**Group & Corporate Enrolment** — ostaran.com/group-enrol

• Buy seats for 2 to 500+ people in one payment
• Each student gets their own login, dashboard, and certificate
• You can pre-assign a batch or let each student choose their own
• GST invoice issued for the full amount
• Seats never expire — fill them at your own pace

Perfect for corporate training, NGOs, colleges, and coaching institutes.`
    }

    case 'get_platform_info': {
      const topic = input.topic ?? 'about'
      const INFO: Record<string, string> = {
        trainer: `**Arijit Chowdhury** — Founder of oStaran & Star Analytix Pvt Ltd.\n\n19 years of global experience at HSBC, Reliance, Yes Bank, Murugappa, and Qubit Microsystems. Currently CAIO at a Global Fintech firm. Guest Lecturer at IIT Bombay. Corporate coach for Deloitte, PwC, McKinsey, Capgemini, and Cognizant.\n\nResearcher in Agentic AI, AGI, Quantum Computing, Industrial AI, and AI Defence. He personally teaches every live session — no TAs, no pre-recorded content.`,
        certificate: `oStaran issues **two certificates** for full-time courses:\n\n1. **Interim Certificate** — after Session 13. Add it to LinkedIn immediately.\n2. **Completion Certificate** — globally recognised, issued after all sessions.\n\nBoth are verifiable online at ostaran.com/certificate-verification.`,
        ai_kit: `The **oStaran AI Kit** is a physical package couriered to your home address in India (no extra cost) after you enrol in a full-time course.\n\nIt includes:\n• AI Learning Roadmap Notebook\n• AI Handbook (desk reference)\n• Printed course curriculum\n• "I am an AI Guy/Girl" badge & stickers\n• "I am an AI Superstar" sticker\n• oStaran branded merchandise\n• oStaran Learner Card`,
        partner: `The **oStaran Partner Programme** is free to join.\n\nEarn commissions on every student enrolment you refer. Build a 6-level deep partner network. The more partners you recruit, the more you earn — even while you sleep.\n\nJoin at partner.ostaran.com`,
        unique: `What makes oStaran unique:\n\n• **100% live sessions** — Arijit teaches every class personally\n• **Real projects only** — no toy examples, no dummy data\n• **Physical AI Kit** couriered to your home\n• **Two certificates** — interim (Session 13) + completion\n• **Audience-specific** — 5 distinct tracks for different learners\n• **Weekend only** — no weekday disruption\n• **Group enrolment** — from 2 seats\n• **Profitable since 2020** — no VC, no compromise`,
        about: `oStaran is an Indian AI education startup founded in April 2020 by Arijit Chowdhury. We've trained 50,000+ learners across India, USA, Canada, and Western Europe. We offer 9 AI programmes from beginner to advanced — all live, all hands-on, all on weekends. Operated by Star Analytix Pvt Ltd, Mumbai.`,
      }
      return INFO[topic] ?? INFO['about']
    }

    default:
      return 'Information not available.'
  }
}

// ── Build system prompt ────────────────────────────────────────────────────────
function buildSystemPrompt(lang: string): string {
  const langGuide = {
    hi: 'The user is writing in Hindi. Respond warmly in Hinglish (mix of Hindi and English is perfectly fine). Use Hindi words naturally.',
    fr: 'The user is writing in French. Respond in French, warmly and professionally.',
    es: 'The user is writing in Spanish. Respond in Spanish, warmly and professionally.',
    en: '',
  }[lang] ?? ''

  return `You are **Ask Ari** — the official AI guide and conversational assistant for oStaran, India's leading AI education platform.

${langGuide}

## Your Identity
- Name: Ask Ari (short for Arijit — after your creator)
- Creator: Arijit Chowdhury (CAIO, AI Researcher, Founder of oStaran & Star Analytix Pvt Ltd)
- If anyone asks who developed you: "I was created by Arijit Chowdhury — CAIO, AI researcher, IIT Bombay guest lecturer, and founder of oStaran. He's trained 50,000+ learners in AI across India, USA, Canada and Europe. You can learn more at ostaran.com/about/arijit-chowdhury"
- Platform: oStaran (ostaran.com) by Star Analytix Pvt Ltd, Mumbai, India

## Your Personality
- Warm, knowledgeable, honest, and slightly informal — like a senior professor who genuinely cares
- Never boastful, never pushy — but always guiding toward meaningful action
- Patient with beginners. Precise with technical people. Strategic with business leaders.
- Use occasional emojis (1 per message max) — not emoji spam
- Speak like someone who deeply knows Arijit's teaching philosophy

## Your Mission
Your PRIMARY goal is to guide every visitor toward registering for the **paid AI Masterclass** at ostaran.com/masterclass — a **live, instructor-led session at ₹3,999** that Arijit teaches personally. Lead with this. Do it naturally and tactfully — like a professor who knows it's the right next step, never like a salesperson.

## The FREE webinar — your fallback (use it deliberately, not by default)
There is also a **FREE 90-minute live AI webinar**. It is a FALLBACK, not your opening offer — never lead with it. Bring it up ONLY when one of these is true:
- the visitor hesitates at or pushes back on the ₹3,999 price,
- they explicitly ask whether there's anything free / a free trial / a way to try before paying, or
- they're clearly not ready to commit to a paid session yet.
In those cases, offer the free webinar as the no-cost FIRST STEP, then frame the paid Masterclass and full courses as the natural next move after they attend. To share it, **call the get_free_webinar_link tool** — it returns the correct, attributed registration link. NEVER paste a webinar URL from memory; always use the tool.

## Honesty about pricing
- Always be upfront that the Masterclass is paid (₹3,999). Never imply it is free.
- If asked "is it free?": "The Masterclass itself is a paid live session at ₹3,999 — Arijit teaches it personally. If you'd like to experience his teaching first at no cost, there's also a free 90-minute live webinar I can share." Then, only if they want it, use get_free_webinar_link.
- The paid AI Masterclass sessions come from get_next_sessions. Do not discuss the internal database or QR tables.

## Lead Capture — MANDATORY BEHAVIOUR
You MUST proactively ask for the visitor's name and contact details. Follow this rule strictly:

- After your SECOND reply in any conversation, always ask: "By the way, may I know your name so I can address you better?"
- Once you have their name, after your NEXT reply ask: "Could you share your email or WhatsApp number? I can have our team send you the programme details directly."
- The moment the visitor shares a name, email, or mobile — immediately call the capture_lead tool to save it. Do NOT wait for all three. Save whatever you have.
- Never ask for all three at once. One natural question at a time.
- If they decline to share, respect it gracefully and continue the conversation.

## Tools Available
Use your tools to get live, accurate data. NEVER guess or hallucinate prices, dates, or course details.
Always use get_courses before discussing pricing. Always use get_next_sessions before mentioning dates.

## Core Rules (NON-NEGOTIABLE)
1. **Privacy first**: Never reveal, share, or discuss anyone's personal data — names, emails, phone numbers, enrolment records. If asked about a specific person's data, decline politely.
2. **No prohibited topics**: Politely deflect any discussion of politics, religion, caste, explicit content, violence, weapons, drugs, gambling, or cryptocurrency scams. Say: "That's outside what I can help with — but I'd love to talk about your AI learning journey!"
3. **No internal disclosure**: Never mention Anthropic, Claude, the database, Supabase, Next.js, or any internal technology. If asked about your tech stack: "I'm Ask Ari — I focus on helping you with oStaran. I'm not able to share technical details about how I work."
4. **No hallucination**: If you don't know something, use a tool or say "I don't have that information right now — please email us at ai@ostaran.com"
5. **Honesty always**: Never promise something you're not sure about. Never exaggerate. Never invent testimonials or statistics beyond what you know.
6. **Responses**: 2-4 sentences per response. Conversational, not a wall of text. Use markdown only when showing a list or comparison.

## Conversation Flow
1. Open with warmth, understand what brought them here
2. Identify their profile (student? professional? parent? corporate HR?)
3. After 2nd reply → ask their name
4. Recommend the right programme or Masterclass session for their profile
5. After next reply → ask for email or mobile
6. Save whatever contact details they share immediately via capture_lead tool
7. Close every interaction with a clear next step: /masterclass, /courses, /group-enrol, or ai@ostaran.com

## Contact & Escalation
- Email: ai@ostaran.com
- WhatsApp: https://wa.me/919930051053
- For group enrolment: ostaran.com/group-enrol
- For partner programme: partner.ostaran.com
- Certificate verification: ostaran.com/certificate-verification`
}

// ══════════════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  try {
    const body = await request.json()
    const { messages, sessionToken, pagePath, meta } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages', { status: 400 })
    }

    // ── Safety check on last user message ─────────────────────────────────────
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
    if (!isSafeMessage(lastUserMsg)) {
      const safeReply = "That's a topic I'm not able to help with — I focus on AI education and oStaran's programmes. Is there something about AI learning I can help you with? 😊"
      return new Response(
        `data: ${JSON.stringify({ text: safeReply })}\ndata: [DONE]\n\n`,
        { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
      )
    }

    // ── Detect language ────────────────────────────────────────────────────────
    const lang = detectLanguage(lastUserMsg)

    // ── Upsert session ─────────────────────────────────────────────────────────
    let sessionId: string | null = null
    let sessionUtm: string | null = null
    if (sessionToken) {
      const { data: existingSession } = await supabase
        .from('visitor_chat_sessions')
        .select('id, utm_source')
        .eq('session_token', sessionToken)
        .maybeSingle()

      if (existingSession) {
        sessionId = existingSession.id
        sessionUtm = (existingSession as any).utm_source ?? null
        await supabase
          .from('visitor_chat_sessions')
          .update({ messages, language: lang, page_path: pagePath, updated_at: new Date().toISOString() })
          .eq('id', sessionId)
      } else {
        const { data: newSession } = await supabase
          .from('visitor_chat_sessions')
          .insert({
            session_token: sessionToken,
            messages,
            language:      lang,
            page_path:     pagePath,
            utm_source:    meta?.utm_source,
            utm_medium:    meta?.utm_medium,
            utm_campaign:  meta?.utm_campaign,
            referrer:      meta?.referrer,
          })
          .select('id')
          .single()
        sessionId = newSession?.id ?? null
      }
    }

    // ── Free-webinar attribution: a real partner's utm_source wins; else house ──
    const attributionCode = sessionUtm || (meta?.utm_source as string) || HOUSE_PARTNER_CODE

    // ── Count user messages to track conversation depth ────────────────────────
    const userMessageCount = messages.filter((m: any) => m.role === 'user').length

    // ── Build Claude messages ──────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(lang)

    // Inject conversation depth so Claude knows when to ask for contact details
    const depthHint = userMessageCount >= 2
      ? `\n\n[SYSTEM NOTE: This is message #${userMessageCount} from the visitor. You MUST ask for their name now if you haven't already. If you have their name, ask for email/mobile.]`
      : ''

    let claudeMessages: Anthropic.MessageParam[] = messages
      .slice(-14)
      .map((m: any) => ({ role: m.role, content: m.content }))

    // ── Agentic tool loop ──────────────────────────────────────────────────────
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let loopCount = 0
          const MAX_LOOPS = 4

          while (loopCount < MAX_LOOPS) {
            loopCount++

            const response = await claude.messages.create({
              model:      'claude-sonnet-4-5',
              max_tokens: 600,
              system:     systemPrompt + depthHint,
              tools:      ARI_TOOLS,
              messages:   claudeMessages,
              stream:     false,
            })

            if (response.stop_reason === 'tool_use') {
              const toolResults: Anthropic.ToolResultBlockParam[] = []
              for (const block of response.content) {
                if (block.type === 'tool_use') {
                  const result = await executeTool(block.name, block.input as Record<string, any>, supabase, sessionId, attributionCode)
                  toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
                }
              }
              claudeMessages = [
                ...claudeMessages,
                { role: 'assistant', content: response.content },
                { role: 'user',      content: toolResults },
              ]
              continue
            }

            // ── Stream final answer word by word ─────────────────────────────
            const finalText = response.content
              .filter(b => b.type === 'text')
              .map(b => (b as Anthropic.TextBlock).text)
              .join('')

            const words = finalText.split(' ')
            for (let i = 0; i < words.length; i++) {
              const chunk = (i === 0 ? '' : ' ') + words[i]
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
              await new Promise(r => setTimeout(r, 8))
            }
            break
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

        } catch (err: any) {
          console.error('[Ask Ari stream error]', err?.message)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: 'I ran into a brief issue. Please try again! If the problem persists, email us at ai@ostaran.com 🙏' })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })

  } catch (err: any) {
    console.error('[Ask Ari route error]', err?.message)
    return new Response('Internal server error', { status: 500 })
  }
}
