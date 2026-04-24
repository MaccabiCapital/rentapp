'use client'

// ============================================================
// Application FAQ bot — stubbed AI helper
// ============================================================
//
// Answers common application questions prospects have while
// filling out the form. Uses a static FAQ today; when a real
// LLM provider is configured (APPLICATION_ASSISTANT_ENABLED),
// the `askBot` function can be swapped for a live call.
//
// Fair-housing guardrails: the bot never tells a prospect
// whether they'll be approved. It explains how the process
// works, what counts as income, how to provide documentation.

import { useState } from 'react'

type FaqEntry = {
  question: string
  answer: string
  tags: string[]
}

const FAQ: FaqEntry[] = [
  {
    question: 'What counts as income?',
    answer:
      'W-2 wages, 1099 / self-employment income, Social Security, SSI/SSDI, housing vouchers (Section 8), retirement income, alimony, child support, and investment income all count. Provide the 2-3 most recent paystubs or bank statements, or a benefits letter for government programs. All legal sources of income are considered.',
    tags: ['income', 'paystubs', 'section 8', 'voucher', 'ssi', 'ssdi', 'self-employed'],
  },
  {
    question: 'Do I need a co-signer or guarantor?',
    answer:
      'Not always. If your income is below the landlord\'s threshold (often 2.5–3× monthly rent), a co-signer can help. A co-signer is typically a relative or close friend with stable income who agrees to back up the lease. You can apply without one and the landlord will let you know if additional support is needed.',
    tags: ['co-signer', 'guarantor', 'credit'],
  },
  {
    question: 'What documents will I need?',
    answer:
      'Government-issued photo ID, proof of income (recent paystubs, tax returns, or benefits letter), previous landlord contact info, and permission for a credit + background check. You don\'t need to upload these now — the landlord will request what they need after reviewing your application.',
    tags: ['documents', 'id', 'paystubs', 'credit'],
  },
  {
    question: 'How long does the application process take?',
    answer:
      'Usually 1–3 business days once the landlord has all your documents. Credit and background checks take a day or two. The landlord will reach out to walk you through next steps.',
    tags: ['timeline', 'how long', 'process'],
  },
  {
    question: 'How much is the security deposit?',
    answer:
      'Most leases require a security deposit equal to one month\'s rent, though some states cap the amount. The landlord will confirm the exact figure in the lease. State laws require the deposit to be returned (with any deductions itemized) within a specific window after move-out.',
    tags: ['deposit', 'security deposit', 'move-in cost'],
  },
  {
    question: 'Are pets allowed?',
    answer:
      'It depends on the property and lease. Mention your pets on the application with type, weight, and age. Service animals and emotional support animals (ESAs) are not considered pets under the Fair Housing Act — they can\'t be refused via a no-pets policy.',
    tags: ['pets', 'dog', 'cat', 'esa', 'service animal'],
  },
  {
    question: 'How does the credit check work?',
    answer:
      'The landlord (or their screening service) runs a soft or hard pull on your credit report. A lower score doesn\'t automatically disqualify you — the landlord looks at the full picture including income, rental history, and any explanation you provide. Bring context to the conversation if your credit has dings from medical bills, divorce, or other specific events.',
    tags: ['credit', 'credit check', 'score'],
  },
  {
    question: 'Can I apply before I tour the unit?',
    answer:
      'Yes — applying before a tour can speed up the process, especially in competitive markets. You can still ask to tour the unit before signing a lease. Some landlords prefer you tour first; either way is fine.',
    tags: ['tour', 'viewing', 'before'],
  },
  {
    question: 'What if I have an eviction on my record?',
    answer:
      'Many landlords still consider applicants with past evictions, especially if the situation was years ago or had an unusual cause. Disclose it upfront with a short explanation — surprises in a screening report are more damaging than a clear, proactive explanation.',
    tags: ['eviction', 'record', 'history'],
  },
  {
    question: 'Do I need renters insurance?',
    answer:
      'Most leases require renters insurance, typically $100,000 of liability coverage + personal property coverage. Policies run $10–$25/month from carriers like Lemonade, State Farm, or Geico. You can add it after your application is approved.',
    tags: ['renters insurance', 'insurance'],
  },
]

function searchFaq(query: string): FaqEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const scored = FAQ.map((entry) => {
    let score = 0
    for (const tag of entry.tags) {
      if (q.includes(tag.toLowerCase())) score += 3
    }
    if (entry.question.toLowerCase().includes(q)) score += 2
    const qWords = q.split(/\s+/).filter((w) => w.length > 2)
    for (const w of qWords) {
      if (entry.question.toLowerCase().includes(w)) score += 1
      if (entry.answer.toLowerCase().includes(w)) score += 1
    }
    return { entry, score }
  })
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.entry)
}

type ChatMessage = {
  id: string
  role: 'user' | 'bot'
  content: string
  citations?: string[]
}

export function ApplicationFaqBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'bot',
      content:
        "I'm here to help while you fill out the application. Ask me about income requirements, documents, pets, credit checks — anything except whether you'll be approved (only the landlord decides that). What would you like to know?",
    },
  ])
  const [input, setInput] = useState('')

  function handleAsk() {
    const q = input.trim()
    if (!q) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: q,
    }

    const matches = searchFaq(q)
    let botMsg: ChatMessage
    if (matches.length === 0) {
      botMsg = {
        id: `b-${Date.now()}`,
        role: 'bot',
        content:
          "I don't have a stock answer for that one. Try rephrasing, or include it in the 'additional notes' field below — the landlord will see your question and can follow up directly.",
      }
    } else {
      botMsg = {
        id: `b-${Date.now()}`,
        role: 'bot',
        content: matches[0].answer,
        citations: matches.slice(1).map((m) => m.question),
      }
    }

    setMessages((prev) => [...prev, userMsg, botMsg])
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  return (
    <div className="sticky top-6 rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">
          💬 Application helper
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          Common questions about the rental process
        </p>
      </div>
      <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'user'
                ? 'ml-6 rounded-md bg-indigo-50 p-2.5 text-sm text-indigo-900'
                : 'mr-6 rounded-md bg-zinc-50 p-2.5 text-sm text-zinc-800'
            }
          >
            {m.content}
            {m.citations && m.citations.length > 0 && (
              <div className="mt-2 border-t border-zinc-200 pt-2 text-xs text-zinc-500">
                Related: {m.citations.join(' · ')}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-200 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question…"
            className="block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={handleAsk}
            disabled={!input.trim()}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            Ask
          </button>
        </div>
      </div>
      <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-[10px] text-zinc-500">
        💡 Tip: the bot never decides on applications — it just explains the
        process. Under the Fair Housing Act, decisions come from the landlord
        based on legally-allowed signals.
      </div>
    </div>
  )
}
