'use client'

import { useEffect, useRef } from 'react'

export function useActionInterval(callback: () => void, delayMs: number | null): void {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (delayMs === null) return undefined

    const id = window.setInterval(() => callbackRef.current(), delayMs)
    return () => window.clearInterval(id)
  }, [delayMs])
}
