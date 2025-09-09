export const dynamicImports = {
  // Chart libraries (heavy)
  recharts: () => import("recharts"),

  // Date utilities
  dateFns: () => import("date-fns"),

  // File processing utilities
  fileUtils: () => import("@/lib/utils/file-utils"),

  // PDF generation (heavy)
  jsPDF: () => import("jspdf"),

  // Excel processing (heavy)
  xlsx: () => import("xlsx"),

  // XML processing utilities
  xmlUtils: () => import("@/lib/utils/xml-utils"),

  // Crypto utilities
  cryptoUtils: () => import("@/lib/utils/crypto-utils"),

  // Image processing
  imageUtils: () => import("@/lib/utils/image-utils"),
}

export async function withDynamicImport<T>(
  importFn: () => Promise<any>,
  operation: (module: any) => T | Promise<T>,
): Promise<T> {
  try {
    const module = await importFn()
    return await operation(module)
  } catch (error) {
    console.error("Dynamic import failed:", error)
    throw new Error("Failed to load required module")
  }
}

export function preloadUtilities(utilities: (keyof typeof dynamicImports)[]) {
  utilities.forEach((utility) => {
    if (dynamicImports[utility]) {
      dynamicImports[utility]().catch((error) => {
        console.warn(`Failed to preload ${utility}:`, error)
      })
    }
  })
}

export function preloadModuleUtilities(moduleId: string) {
  const moduleUtilities: Record<string, (keyof typeof dynamicImports)[]> = {
    reports: ["jsPDF", "xlsx"],
    esocial: ["xmlUtils", "cryptoUtils"],
    dashboard: ["recharts", "dateFns"],
    "digital-library": ["fileUtils", "imageUtils"],
    "occupational-health": ["dateFns", "jsPDF"],
    employees: ["xlsx", "dateFns"],
    training: ["jsPDF", "dateFns"],
  }

  const utilities = moduleUtilities[moduleId]
  if (utilities) {
    setTimeout(() => preloadUtilities(utilities), 500)
  }
}
