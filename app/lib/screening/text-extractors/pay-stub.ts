// ============================================================
// Pay-stub text extractor
// ============================================================
//
// Uses Anthropic vision to read paystub PDFs (both clean PDFs
// with text layers and scanned image-PDFs). The model returns
// the raw text content — the income-consistency check downstream
// runs regex over that text to find gross pay and pay frequency.
//
// Why vision over pdfjs-dist:
//   - Scanned paystubs (photo of a paper stub) have no text layer.
//     pdfjs-dist would return empty for those.
//   - Vision works on both with one code path, no OCR fallback.
//   - Haiku is cheap (~$0.001 per stub) and fast (~1-2s).
//
// Falls back to null when ANTHROPIC_API_KEY is missing — the
// engine handles a null return by simply skipping the income
// consistency signal, same as before.

import Anthropic from '@anthropic-ai/sdk'

const EXTRACTION_MODEL =
  process.env.PAYSTUB_EXTRACTION_MODEL ?? 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You are an OCR engine for rental-application
pay stubs. Extract the raw text from the document.

Rules:
- Return ONLY the text content of the paystub. No commentary.
- Preserve line breaks where possible so labels and values stay
  near each other (e.g. "Gross Pay: $2,500.00" on one line).
- Include header info (employer name, pay date, pay period),
  earnings table, deductions table, and totals.
- If you cannot read the document, return the literal string
  "EXTRACTION_FAILED" and nothing else.`

export async function extractPayStubText(
  bytes: Uint8Array,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  if (bytes.byteLength === 0) return null

  // Anthropic accepts PDFs via base64 document blocks. The model
  // reads the PDF page-by-page and returns extracted text.
  const base64 = Buffer.from(bytes).toString('base64')

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Extract the full text from this paystub.',
            },
          ],
        },
      ],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const text = textBlock && 'text' in textBlock ? textBlock.text : ''
    if (!text || text.trim() === 'EXTRACTION_FAILED') return null
    return text
  } catch {
    // Any API error → fall back to null. The engine continues
    // without the income-consistency signal rather than crashing
    // the whole screening run.
    return null
  }
}
