import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_next_session',
    description: "Get the student's next upcoming class session with date, time, and join link",
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_past_sessions',
    description: 'Get the last 5 past sessions with recording links',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_payment_summary',
    description: 'Get payment history and total amount paid',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_certificates',
    description: 'Get list of earned certificates with download links',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'raise_support_request',
    description: 'Raise a support ticket on behalf of the student',
    input_schema: {
      type: 'object' as const,
      properties: {
        message: { type: 'string', description: 'The support request message' },
      },
      required: ['message'],
    },
  },
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return new Response('Unauthorized', { status: 401 })
    const user = authUser

    const { messages } = await request.json()
    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages', { status: 400 })
    }

    const service = createServiceClient()

    // Fetch student profile
    const { data: student } = await (service as any)
      .from('users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    const systemPrompt = `You are a personal AI tutor and assistant for ${student?.full_name ?? 'this student'} on the withArijit AI Education Platform.

Student profile:
- Name: ${student?.full_name ?? 'Unknown'}
- Course: ${student?.course_name ?? 'Not set'}
- Batch: ${student?.batch_day_time ?? 'Not set'}
- Email: ${user.email}

You have tools to look up their sessions, recordings, payments, and certificates. Always use tools to fetch live data before answering questions about schedules, payments, or certificates.

Be warm, supportive, and proactive. Help them get the most out of their learning journey.`

    async function executeTool(toolName: string, input: Record<string, unknown>): Promise<string> {
      if (toolName === 'get_next_session') {
        const { data } = await (service as any)
          .from('session_master_table')
          .select('session_title, session_date, session_time, session_link')
          .eq('batch_id', student?.batch_id ?? '')
          .gte('session_date', new Date().toISOString().split('T')[0])
          .order('session_date')
          .limit(1)
          .maybeSingle()
        return JSON.stringify(data ?? { message: 'No upcoming sessions found' })
      }

      if (toolName === 'get_past_sessions') {
        const { data } = await (service as any)
          .from('session_master_table')
          .select('session_title, session_date, recording_link')
          .eq('batch_id', student?.batch_id ?? '')
          .lt('session_date', new Date().toISOString().split('T')[0])
          .order('session_date', { ascending: false })
          .limit(5)
        return JSON.stringify(data ?? [])
      }

      if (toolName === 'get_payment_summary') {
        const { data } = await (service as any)
          .from('payments')
          .select('amount, payment_date, status')
          .eq('email', user.email)
          .order('payment_date', { ascending: false })
          .limit(10)
        return JSON.stringify(data ?? [])
      }

      if (toolName === 'get_certificates') {
        const { data } = await (service as any)
          .from('certificates')
          .select('course_name, issued_date, certificate_url')
          .eq('user_email', user.email)
        return JSON.stringify(data ?? [])
      }

      if (toolName === 'raise_support_request') {
        const message = input.message as string
        await (service as any).from('contact_submissions').insert({
          name: student?.full_name ?? user.email,
          email: user.email,
          purpose: 'support',
          additional_details: message,
        })
        return JSON.stringify({ success: true, message: 'Support ticket raised. Team will respond within 24 hours.' })
      }

      return JSON.stringify({ error: 'Unknown tool' })
    }

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Build conversation history (last 10 exchanges)
          const conversationMessages: Anthropic.MessageParam[] = messages
            .slice(-10)
            .map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }))

          let currentMessages = conversationMessages

          // Agentic loop
          for (let i = 0; i < 5; i++) {
            const response = await anthropic.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 1024,
              system: systemPrompt,
              tools: TOOLS,
              messages: currentMessages,
            })

            // Stream text blocks
            for (const block of response.content) {
              if (block.type === 'text') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: block.text })}\n\n`))
              }
            }

            if (response.stop_reason === 'end_turn') break

            if (response.stop_reason === 'tool_use') {
              const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[]
              const toolResults: Anthropic.ToolResultBlockParam[] = []

              for (const toolUse of toolUseBlocks) {
                const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>)
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: result,
                })
              }

              currentMessages = [
                ...currentMessages,
                { role: 'assistant' as const, content: response.content },
                { role: 'user' as const, content: toolResults },
              ]
            } else {
              break
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          console.error('Student agent error:', err)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Agent error occurred' })}\n\n`))
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
    console.error('Student agent route error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
