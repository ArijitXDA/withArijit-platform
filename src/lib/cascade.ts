/**
 * src/lib/cascade.ts — THE commission cascade. (Keep byte-identical with the copy in the
 * partner repo at lib/cascade.ts; both the payout engine and the earnings simulator must
 * compute the same numbers or partners see one figure and get paid another.)
 * ─────────────────────────────────────────────────────────────────────────────
 * MODEL (geometric_75_25 + per-partner "keep" dial)
 *
 *  • The enroller keeps `enrollerShare` of the pool P … EXCEPT a root partner with no
 *    sponsor above them, who keeps 100% of P (there is no upline to pay).
 *  • The remaining `upstreamShare` (pool U) is split up the chain GEOMETRICALLY, doubling
 *    toward the enroller: with the enroller at position n (root = position 1), the upline at
 *    position j receives 2^(j-1) x baseUnit, where baseUnit = U / (2^(n-1) - 1).
 *    So the nearest sponsor earns the most and the sum is exactly U.
 *  • Each upline may KEEP only part of their entitlement (`keepFraction`, 0..1, default 1).
 *    Whatever they forgo is redistributed DOWNWARD ONLY — across every position strictly
 *    below them (intermediate uplines AND the enroller) using those same doubling weights.
 *    Money never flows upward, so a passive upline can never profit from someone else's
 *    generosity.
 *
 * GUARANTEES (asserted by allocateCascade, and unit-checked by the callers):
 *  1. The allocations always sum to EXACTLY P — nothing is ever left credited to nobody.
 *     (The engine this replaced leaked the undistributed tail on every single enrolment.)
 *  2. No partner can ever receive more than their entitlement plus what those above chose
 *     to pass down; a dial can only ever reduce your own take.
 *  3. A partner on keepFraction = 0 takes nothing at all — including redistributions from
 *     above, which flow straight past them.
 */

export interface CascadeUpline {
  partnerId: string
  /** 0..1 — the share of their own entitlement this upline keeps. Default 1 (keep all). */
  keepFraction: number
}

export interface CascadeAllocation {
  partnerId: string
  /** 1 = enroller, 2 = direct sponsor, 3 = their sponsor, … (matches partner_level_in_chain) */
  layerInChain: number
  /** What they'd have earned with keepFraction = 1 and nothing passed down to them. */
  entitlement: number
  /** Extra received because someone above forwent their slice. */
  received: number
  /** The dial that was applied (snapshot this on the ledger row). */
  keepFraction: number
  /** entitlement + received - amount. What they chose to pass downward. */
  forgone: number
  /** What they are actually paid. */
  amount: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

/**
 * @param pool          P — the whole partner pool for this enrolment (netTaxable x poolPct)
 * @param uplines       the chain above the enroller, NEAREST FIRST (direct sponsor … root)
 * @param enrollerShare fraction the enroller keeps when they DO have an upline (e.g. 0.75)
 * @param upstreamShare fraction shared up the chain (e.g. 0.25)
 */
export function allocateCascade(
  pool: number,
  uplines: CascadeUpline[],
  enrollerShare = 0.75,
  upstreamShare = 0.25,
): CascadeAllocation[] {
  if (!(pool > 0)) return []

  // A root enroller keeps the FULL pool — there is nobody above them to share with.
  // (The previous engine still took 75% here and credited the other 25% to no one.)
  if (uplines.length === 0) {
    return [{ partnerId: '', layerInChain: 1, entitlement: pool, received: 0, keepFraction: 1, forgone: 0, amount: r2(pool) }]
  }

  // Normalise so the two shares always sum to 1 (mirrors lib/commission.ts).
  const es = Math.max(0, enrollerShare), us = Math.max(0, upstreamShare)
  const tot = es + us
  const [eShare, uShare] = tot > 0 ? [es / tot, us / tot] : [0.75, 0.25]

  const n = uplines.length + 1            // positions: 1 = root … n = enroller
  const weight = (pos: number) => Math.pow(2, pos - 1)
  const U = pool * uShare
  const baseUnit = U / (Math.pow(2, n - 1) - 1)

  // uplines are nearest-first, so uplines[t] sits at position n-1-t (root is last).
  const posOf = (t: number) => n - 1 - t
  const keepAt = new Map<number, number>()
  const idAt   = new Map<number, string>()
  uplines.forEach((u, t) => {
    const p = posOf(t)
    keepAt.set(p, Math.min(1, Math.max(0, Number.isFinite(u.keepFraction) ? u.keepFraction : 1)))
    idAt.set(p, u.partnerId)
  })

  const pending: Record<number, number> = {}
  const out = new Map<number, CascadeAllocation>()

  // TOP-DOWN so a forgone slice from a higher partner is already in `pending` by the time we
  // reach the partners below it (and can itself be partially passed on again).
  for (let j = 1; j <= n - 1; j++) {
    const entitlement = baseUnit * weight(j)
    const received    = pending[j] ?? 0
    const available   = entitlement + received
    const kf          = keepAt.get(j) ?? 1
    const amount      = available * kf
    const forgone     = available - amount

    out.set(j, {
      partnerId: idAt.get(j)!, layerInChain: n - j + 1,   // position 1 (root) is the DEEPEST layer
      entitlement, received, keepFraction: kf, forgone, amount,
    })

    if (forgone > 0) {
      // Recipients: every position strictly below, minus anyone who has opted fully out
      // (keepFraction 0 means zero, including redistributions). The enroller always qualifies.
      const recips: number[] = []
      for (let i = j + 1; i <= n; i++) if (i === n || (keepAt.get(i) ?? 1) > 0) recips.push(i)
      const totalW = recips.reduce((s, i) => s + weight(i), 0)
      if (totalW > 0) for (const i of recips) pending[i] = (pending[i] ?? 0) + forgone * (weight(i) / totalW)
    }
  }

  const enrollerAmount = pool * eShare + (pending[n] ?? 0)
  const allocations: CascadeAllocation[] = [
    { partnerId: '', layerInChain: 1, entitlement: pool * eShare, received: pending[n] ?? 0, keepFraction: 1, forgone: 0, amount: enrollerAmount },
    ...Array.from(out.values()).sort((a, b) => a.layerInChain - b.layerInChain),
  ]

  // Round to paise and push any rounding remainder onto the enroller, so the parts still add
  // up to EXACTLY the pool.
  const rounded = allocations.map(a => ({ ...a, amount: r2(a.amount) }))
  const drift = r2(pool - rounded.reduce((s, a) => s + a.amount, 0))
  if (drift !== 0) rounded[0].amount = r2(rounded[0].amount + drift)
  return rounded
}
