import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface LoadingSkeletonProps {
  variant?: "card" | "table" | "list" | "dashboard"
  count?: number
  className?: string
}

/**
 * Componente de skeleton padronizado para diferentes layouts
 */
export function LoadingSkeleton({ variant = "card", count = 1, className }: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i)

  switch (variant) {
    case "dashboard":
      return (
        <div className={`space-y-4 sm:space-y-6 ${className}`}>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="min-h-[120px]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <div className="flex items-center space-x-1">
                    <Skeleton className="h-3 w-3" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )

    case "table":
      return (
        <div className={`space-y-4 ${className}`}>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {skeletons.map((i) => (
              <div key={i} className="flex space-x-4 p-4 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </div>
      )

    case "list":
      return (
        <div className={`space-y-4 ${className}`}>
          {skeletons.map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )

    case "card":
    default:
      return (
        <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
          {skeletons.map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
  }
}
