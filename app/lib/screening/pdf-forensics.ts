// ============================================================
// PDF forensics — metadata-based tamper detection
// ============================================================
//
// v1 scope: PDF metadata only. Reads the document's Producer,
// Creator, ModDate, and CreateDate fields. Photo-editor producers
// (Photoshop, GIMP) on a financial document are a strong red.
// Modified-after-creation is amber.
//
// Out of scope for v1 (planned for later phases):
//   - Font-family mixing detection (requires text-run parsing)
//   - Raster-image overlay on text regions
//   - Cross-page font analysis

import { PDFDocument } from 'pdf-lib'
import { pdfMetadataAnomaly, type SignalRow } from './signal-builders'

export type PdfForensicsResult = {
  signals: SignalRow[]
  metadata: {
    producer: string | null
    creator: string | null
    modDate: string | null
    createDate: string | null
  }
}

function dateToIso(d: Date | undefined): string | null {
  if (!d) return null
  try {
    return d.toISOString()
  } catch {
    return null
  }
}

function dateToString(d: Date | undefined): string | null {
  if (!d) return null
  try {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

export async function analyzePdfDocument(opts: {
  documentId: string
  bytes: Uint8Array
}): Promise<PdfForensicsResult> {
  let pdf: PDFDocument
  try {
    pdf = await PDFDocument.load(opts.bytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    })
  } catch {
    // Couldn't parse the PDF — return empty signals. The engine
    // will downgrade the report to 'partial' if no document
    // could be analyzed.
    return {
      signals: [],
      metadata: {
        producer: null,
        creator: null,
        modDate: null,
        createDate: null,
      },
    }
  }

  const producer = pdf.getProducer() ?? null
  const creator = pdf.getCreator() ?? null
  const modDate = pdf.getModificationDate()
  const createDate = pdf.getCreationDate()

  const modIso = dateToIso(modDate)
  const createIso = dateToIso(createDate)

  // Compute the gap between create and modify
  let modCreateGapMs: number | null = null
  if (modDate && createDate) {
    modCreateGapMs = modDate.getTime() - createDate.getTime()
  }

  const signals: SignalRow[] = []

  const isPhotoEditor =
    !!producer &&
    /(photoshop|gimp|illustrator|preview \(macos\)|inkscape|pixelmator)/i.test(
      producer,
    )

  // Decide whether to raise. We raise if any of:
  //   - Producer is a photo editor (always)
  //   - Mod date is more than 60 seconds after create date (was modified after generation)
  const wasModified =
    modCreateGapMs !== null && modCreateGapMs > 60 * 1000

  if (isPhotoEditor || wasModified) {
    signals.push(
      pdfMetadataAnomaly({
        documentId: opts.documentId,
        producer,
        creator,
        modDate: dateToString(modDate),
        createDate: dateToString(createDate),
        modCreateGapMs,
      }),
    )
  }

  return {
    signals,
    metadata: {
      producer,
      creator,
      modDate: modIso,
      createDate: createIso,
    },
  }
}
