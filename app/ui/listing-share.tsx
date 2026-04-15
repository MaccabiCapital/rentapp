'use client'

// ============================================================
// ListingShare — the share panel for a listing
// ============================================================
//
// Shows the full URL, a copy-to-clipboard button, and an inline
// SVG QR code generated with the `qrcode` package. Lets the
// landlord grab a URL for Zillow / Craigslist or print a QR
// code for a yard sign.

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function ListingShare({
  slug,
  appUrl,
}: {
  slug: string
  appUrl: string
}) {
  const [copied, setCopied] = useState(false)
  const [qrSvg, setQrSvg] = useState<string | null>(null)

  const fullUrl = `${appUrl}/listings/${slug}`

  useEffect(() => {
    let cancelled = false
    QRCode.toString(fullUrl, {
      type: 'svg',
      margin: 1,
      width: 200,
      errorCorrectionLevel: 'M',
    })
      .then((svg) => {
        if (!cancelled) setQrSvg(svg)
      })
      .catch(() => {
        if (!cancelled) setQrSvg(null)
      })
    return () => {
      cancelled = true
    }
  }, [fullUrl])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">
        Share this listing
      </h3>

      {/* URL + copy */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={fullUrl}
          className="flex-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700"
          onClick={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        Paste this URL into Zillow, Craigslist, Facebook Marketplace, or
        text it directly to a prospect.
      </p>

      {/* QR code */}
      <div className="mt-5 flex items-start gap-5">
        {qrSvg ? (
          <div
            className="h-[200px] w-[200px] flex-shrink-0 rounded-md border border-zinc-200 bg-white p-2"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        ) : (
          <div className="h-[200px] w-[200px] flex-shrink-0 animate-pulse rounded-md border border-zinc-200 bg-zinc-100" />
        )}
        <div className="flex-1 text-sm text-zinc-600">
          <p className="font-medium text-zinc-900">Yard sign QR code</p>
          <p className="mt-1 text-xs text-zinc-500">
            Print this QR code and staple it to a yard sign. Passersby can
            scan with their phone and land directly on this listing.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            Right-click the image to save or print. The QR code encodes the
            full URL above, so it stays valid as long as the listing is
            active.
          </p>
        </div>
      </div>
    </div>
  )
}
