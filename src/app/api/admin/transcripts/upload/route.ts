import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient }        from '@/lib/supabase/service'
import Anthropic                       from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── VTT → plain text stripper ─────────────────────────────────────────────────
// Handles: WebVTT timestamps, cue identifiers, NOTE blocks, WEBVTT header
function stripVTT(vttText: string): string {
  const lines = vttText.split('\n')
  const cleaned: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Skip VTT header and metadata
    if (trimmed.startsWith('WEBVTT') || trimmed.startsWith('NOTE') || trimmed === '') continue
    // Skip timestamp lines  (e.g. "00:00:01.000 --> 00:00:04.500")
    if (/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/.test(trimmed)) continue
    // Skip pure numeric cue identifiers
    if (/^\d+$/.test(trimmed)) continue
    // Strip speaker labels if present (e.g. "<v Arijit>text" or "[Arijit]: text")
    const withoutSpeaker = trimmed
      .replace(/<v[^>]*>/g, '')     // <v SpeakerName>
      .replace(/^[A-Z][^:]{0,40}:\s*/, '')  // "Arijit: " style labels
      .replace(/<[^>]+>/g, '')       // any remaining HTML tags
      .trim()

    if (withoutSpeaker) cleaned.push(withoutSpeaker)
  }

  // Deduplicate consecutive identical lines (VTT sometimes repeats)
  const deduped: string[] = []
  for (let i = 0; i < cleaned.length; i++) {
    if (i === 0 || cleaned[i] !== cleaned[i - 1]) deduped.push(cleaned[i])
  }

  return deduped.join(' ').replace(/\s+/g, ' ').trim()
}

// ── Count words ───────────────────────────────────────────────────────────────
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// ── Generate AI summary using Claude ─────────────────────────────────────────
async function generateSummary(
  transcriptText: string,
  sessionNumber:  number,
): Promise<{ summary: string; keyTopics: string[] }> {
  // Truncate to ~80k chars if very long (stays well within Claude's context)
  const truncated = transcriptText.slice(0, 80000)

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 800,
    system:     'You are a helpful assistant that summarises AI education class transcripts. Be concise and accurate.',
    messages: [{
      role:    'user',
      content: `This is the transcript from Session ${sessionNumber} of an AI certification course.

Please provide:
1. A 2-3 sentence summary of what was covered (for student reference)
2. A list of 5-10 key topics/concepts discussed

Respond ONLY with valid JSON in this exact format:
{
  "summary": "...",
  "key_topics": ["topic1", "topic2", ...]
}

TRANSCRIPT:
${truncated}`,
    }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return {
      summary:   parsed.summary   ?? '',
      keyTopics: parsed.key_topics ?? [],
    }
  } catch {
    return { summary: '', keyTopics: [] }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const formData      = await req.formData()
    const file          = formData.get('file')          as File   | null
    const batchId       = formData.get('batch_id')      as string | null
    const sessionNum    = parseInt(formData.get('session_number') as string || '0')
    const sessionDate   = formData.get('session_date')  as string | null
    const courseId      = formData.get('course_id')     as string | null
    const doSummary     = formData.get('generate_summary') === '1'

    if (!file || !batchId || !sessionNum) {
      return NextResponse.json({ error: 'file, batch_id, and session_number are required' }, { status: 400 })
    }

    // ── Read file content ───────────────────────────────────────────────────
    const rawText    = await file.text()
    const isVTT      = file.name.endsWith('.vtt') || file.type === 'text/vtt'
    const plainText  = isVTT ? stripVTT(rawText) : rawText.trim()
    const words      = countWords(plainText)

    if (words < 10) {
      return NextResponse.json({ error: 'Transcript appears to be empty or too short.' }, { status: 400 })
    }

    const service = createServiceClient()

    // ── Upload raw file to Supabase Storage ─────────────────────────────────
    const storagePath = `${batchId}/session_${String(sessionNum).padStart(2, '0')}.txt`
    const { error: storageErr } = await service.storage
      .from('session-transcripts')
      .upload(storagePath, new Blob([plainText], { type: 'text/plain' }), {
        upsert:      true,
        contentType: 'text/plain',
      })

    if (storageErr) {
      console.error('[transcript upload] storage error:', storageErr.message)
      return NextResponse.json({ error: `Storage error: ${storageErr.message}` }, { status: 500 })
    }

    // Get the storage URL (private — not publicly accessible)
    const { data: urlData } = service.storage
      .from('session-transcripts')
      .getPublicUrl(storagePath)   // will 403 for public access — that's correct
    const transcriptUrl = urlData?.publicUrl ?? null

    // ── Optionally generate AI summary ──────────────────────────────────────
    let summary:   string   = ''
    let keyTopics: string[] = []

    if (doSummary && process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('placeholder')) {
      try {
        const result = await generateSummary(plainText, sessionNum)
        summary   = result.summary
        keyTopics = result.keyTopics
      } catch (summaryErr: any) {
        console.warn('[transcript upload] summary generation failed:', summaryErr.message)
        // Non-fatal — proceed without summary
      }
    }

    // ── Upsert session_transcripts row ──────────────────────────────────────
    const { data: transcript, error: dbErr } = await service
      .from('session_transcripts')
      .upsert({
        batch_id:        batchId,
        session_number:  sessionNum,
        session_date:    sessionDate || null,
        course_id:       courseId    || null,
        transcript_url:  transcriptUrl,
        transcript_text: plainText,
        summary:         summary   || null,
        key_topics:      keyTopics.length > 0 ? keyTopics : null,
        word_count:      words,
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'batch_id,session_number' })
      .select()
      .single()

    if (dbErr) {
      console.error('[transcript upload] db error:', dbErr.message)
      return NextResponse.json({ error: `DB error: ${dbErr.message}` }, { status: 500 })
    }

    return NextResponse.json({ transcript, word_count: words })

  } catch (err: any) {
    console.error('[transcript upload] unhandled:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
