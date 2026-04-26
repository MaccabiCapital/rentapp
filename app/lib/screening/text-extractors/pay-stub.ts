// ============================================================
// Pay-stub text extractor (v1 stub)
// ============================================================
//
// v1: returns null. Full text extraction from PDFs requires
// pdfjs-dist (text-layer parse) or an OCR provider for scanned
// PDFs. Both are deferred — the engine still runs successfully
// without text, just without the income-consistency signal.
//
// When a text extractor is wired, this file should return the
// PDF's full text content as a single string. The income-
// consistency check uses regex over that string to find gross
// pay and pay frequency.

export async function extractPayStubText(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _bytes: Uint8Array,
): Promise<string | null> {
  return null
}
