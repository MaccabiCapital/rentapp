'use client'

// ============================================================
// Signature pad — HTML5 canvas
// ============================================================
//
// Captures a hand-drawn signature on a 600x180 canvas. Outputs a
// PNG data URL into a hidden form field. Supports mouse + touch.
// "Clear" button resets. Shape: a single component used by both
// the public tenant page and the dashboard landlord modal.

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

type Point = { x: number; y: number }

export function SignaturePad({
  name,
  onChange,
  width = 600,
  height = 180,
}: {
  name: string
  onChange?: (dataUrl: string | null) => void
  width?: number
  height?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<Point | null>(null)
  const [hasInk, setHasInk] = useState(false)
  const [dataUrl, setDataUrl] = useState<string>('')

  // Prepare canvas + scale for high-DPI screens. Run on mount.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = width * ratio
    canvas.height = height * ratio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111827'
    // White background for the PNG export
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }, [width, height])

  function pointFromEvent(e: ReactPointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function startStroke(e: ReactPointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastPointRef.current = pointFromEvent(e)
  }

  function continueStroke(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const p = pointFromEvent(e)
    const last = lastPointRef.current ?? p
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    lastPointRef.current = p
    if (!hasInk) setHasInk(true)
  }

  function endStroke(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastPointRef.current = null
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    const url = canvasRef.current?.toDataURL('image/png') ?? ''
    setDataUrl(url)
    if (onChange) onChange(hasInk ? url : null)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    setHasInk(false)
    setDataUrl('')
    if (onChange) onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-zinc-300 bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
          className="block touch-none cursor-crosshair"
          aria-label="Signature canvas — sign here"
        />
      </div>
      <input
        type="hidden"
        name={name}
        value={hasInk ? dataUrl : ''}
        readOnly
      />
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {hasInk
            ? 'Signature captured.'
            : 'Sign with your finger, mouse, or stylus.'}
        </span>
        <button
          type="button"
          onClick={clearCanvas}
          className="text-zinc-600 hover:text-zinc-900"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
