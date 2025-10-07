"use client"

import Image from "next/image"
import type React from "react"
import { useTheme } from "next-themes"

interface LogoProps {
  variant?: "original" | "branca" | "preta"
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

const srcByVariant = {
  original: "/logo/LogoOriginal.png",
  branca: "/logo/LogoBranca.png",
  preta: "/logo/LogoPreta.png",
}

export function Logo({ variant, width = 160, height = 48, className, priority = false }: LogoProps) {
  const { resolvedTheme } = useTheme()
  const finalVariant: keyof typeof srcByVariant = variant ?? (resolvedTheme === "dark" ? "branca" : "original")
  const src = srcByVariant[finalVariant]
  return (
    <Image
      src={src}
      alt="MASTPROD SST"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  )
}