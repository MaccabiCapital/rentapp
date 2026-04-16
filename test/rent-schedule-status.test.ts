import { describe, it, expect } from 'vitest'
import { computeRentScheduleStatus } from '@/app/lib/rent-schedule-status'

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Fixed "now" for deterministic tests — 2026-03-10T12:00:00Z
const NOW = new Date('2026-03-10T12:00:00Z').getTime()

function daysFromNow(days: number): string {
  const d = new Date(NOW + days * MS_PER_DAY)
  return d.toISOString().slice(0, 10)
}

describe('computeRentScheduleStatus', () => {
  it('returns paid when paid_amount covers amount', () => {
    expect(
      computeRentScheduleStatus(
        {
          due_date: daysFromNow(5),
          amount: 2000,
          paid_amount: 2000,
          status: 'upcoming',
        },
        NOW,
      ),
    ).toBe('paid')
  })

  it('returns paid when paid_amount exceeds amount', () => {
    expect(
      computeRentScheduleStatus(
        {
          due_date: daysFromNow(5),
          amount: 2000,
          paid_amount: 2100,
          status: 'upcoming',
        },
        NOW,
      ),
    ).toBe('paid')
  })

  it('respects explicit skipped status', () => {
    expect(
      computeRentScheduleStatus(
        {
          due_date: daysFromNow(-5),
          amount: 2000,
          paid_amount: 0,
          status: 'skipped',
        },
        NOW,
      ),
    ).toBe('skipped')
  })

  it('returns partial when some amount paid but not full', () => {
    expect(
      computeRentScheduleStatus(
        {
          due_date: daysFromNow(5),
          amount: 2000,
          paid_amount: 800,
          status: 'upcoming',
        },
        NOW,
      ),
    ).toBe('partial')
  })

  it('returns partial even past due date when partially paid', () => {
    expect(
      computeRentScheduleStatus(
        {
          due_date: daysFromNow(-10),
          amount: 2000,
          paid_amount: 500,
          status: 'upcoming',
        },
        NOW,
      ),
    ).toBe('partial')
  })

  it('returns overdue when due date passed and nothing paid', () => {
    expect(
      computeRentScheduleStatus(
        {
          due_date: daysFromNow(-1),
          amount: 2000,
          paid_amount: 0,
          status: 'upcoming',
        },
        NOW,
      ),
    ).toBe('overdue')
  })

  it('returns due when within 3 days of due date', () => {
    expect(
      computeRentScheduleStatus(
        {
          due_date: daysFromNow(2),
          amount: 2000,
          paid_amount: 0,
          status: 'upcoming',
        },
        NOW,
      ),
    ).toBe('due')
  })

  it('returns due exactly at today', () => {
    expect(
      computeRentScheduleStatus(
        {
          due_date: daysFromNow(0),
          amount: 2000,
          paid_amount: 0,
          status: 'upcoming',
        },
        NOW,
      ),
    ).toBe('due')
  })

  it('returns upcoming when further than 3 days out', () => {
    expect(
      computeRentScheduleStatus(
        {
          due_date: daysFromNow(10),
          amount: 2000,
          paid_amount: 0,
          status: 'upcoming',
        },
        NOW,
      ),
    ).toBe('upcoming')
  })

  it('handles string amounts from Supabase numeric type', () => {
    // DB returns numeric(10,2) as strings in some paths; the
    // Number() coercion inside the pure function must handle this.
    expect(
      computeRentScheduleStatus(
        {
          due_date: daysFromNow(5),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          amount: '2000' as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          paid_amount: '2000' as any,
          status: 'upcoming',
        },
        NOW,
      ),
    ).toBe('paid')
  })
})
