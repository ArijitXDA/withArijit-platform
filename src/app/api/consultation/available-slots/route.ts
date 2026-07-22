import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SKU_SESSIONS, type DurationSku } from '@/lib/consultationCheckoutPricing'

// GET /api/consultation/available-slots?token=<schedule_token>
// Returns the bookable IST {date, time} slots for a paid consultation: generated from the
// admin availability windows (consultation_availability), stepped by the order's session
// duration, over the next ~4 weeks, MINUS every slot already occupied by a consultation OR a
// class (consultation_busy_slots). The client renders these in the buyer's timezone.

const LOOKAHEAD_DAYS = 28
const MAX_SLOTS = 60

const hhmm = (t: string) => String(t).slice(0, 5) // 'HH:MM:SS' | 'HH:MM' → 'HH:MM'
const toMin = (t: string) => {
  const [h, m] = hhmm(t).split(':').map(Number)
  return h * 60 + m
}
const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const ymd = (y: number, mo: number, d: number) =>
  `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const addDaysStr = (dateStr: string, days: number) => {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const t = new Date(Date.UTC(y, mo - 1, d + days, 12))
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')?.trim() ?? ''
    if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 })

    const supabase = createServiceClient()

    const { data: order } = await supabase
      .from('consultation_orders')
      .select('duration_sku, sessions, status')
      .eq('schedule_token', token)
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    const durationMins = order.duration_sku === 'min30' ? 30 : 60
    const sessionCount = Number(order.sessions) || SKU_SESSIONS[order.duration_sku as DurationSku] || 1

    const { data: windows } = await supabase
      .from('consultation_availability')
      .select('day_of_week, start_time, end_time')
      .eq('is_active', true)
    const byDay = new Map<number, { start: number; end: number }[]>()
    for (const w of windows ?? []) {
      const arr = byDay.get(w.day_of_week) ?? []
      arr.push({ start: toMin(w.start_time), end: toMin(w.end_time) })
      byDay.set(w.day_of_week, arr)
    }
    if (byDay.size === 0) return NextResponse.json({ slots: [] })

    // Date window: tomorrow (IST) → +LOOKAHEAD_DAYS.
    const istParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const g = (t: string) => Number(istParts.find((p) => p.type === t)?.value ?? '0')
    const cursor = new Date(Date.UTC(g('year'), g('month') - 1, g('day') + 1, 12))
    const fromStr = ymd(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate())
    // Extend the busy window to cover every weekly recurrence of the latest candidate.
    const endAnchor = new Date(cursor.getTime())
    endAnchor.setUTCDate(endAnchor.getUTCDate() + LOOKAHEAD_DAYS + 7 * (sessionCount - 1))
    const toStr = ymd(endAnchor.getUTCFullYear(), endAnchor.getUTCMonth() + 1, endAnchor.getUTCDate())

    // Busy slots (consultation bookings + class schedule) in the window.
    const { data: busyRows } = await supabase.rpc('consultation_busy_slots', { p_from: fromStr, p_to: toStr })
    const busy = new Set<string>((busyRows ?? []).map((b: any) => `${b.busy_date}|${hhmm(b.busy_time)}`))

    // Generate candidate slots.
    const slots: { date: string; time: string }[] = []
    for (let i = 0; i < LOOKAHEAD_DAYS && slots.length < MAX_SLOTS; i++) {
      const iso = ((cursor.getUTCDay() + 6) % 7) + 1 // Mon=1..Sun=7
      const dateStr = ymd(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate())
      for (const win of byDay.get(iso) ?? []) {
        for (let m = win.start; m + durationMins <= win.end; m += durationMins) {
          const time = fromMin(m)
          // Offer the slot only if every weekly recurrence (k=0..sessions-1) is free.
          let allFree = true
          for (let k = 0; k < sessionCount; k++) {
            if (busy.has(`${addDaysStr(dateStr, 7 * k)}|${time}`)) {
              allFree = false
              break
            }
          }
          if (allFree) slots.push({ date: dateStr, time })
          if (slots.length >= MAX_SLOTS) break
        }
        if (slots.length >= MAX_SLOTS) break
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    return NextResponse.json({ slots })
  } catch (err: any) {
    console.error('[consultation available-slots]', err?.message)
    return NextResponse.json({ error: 'Could not load slots.' }, { status: 500 })
  }
}
