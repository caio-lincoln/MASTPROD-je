"use client"

import Image from "next/image"
import type React from "react"

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

export function Logo({ variant = "original", width = 160, height = 48, className, priority = false }: LogoProps) {
  const src = srcByVariant[variant]
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