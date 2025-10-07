import { Button, buttonVariants } from "@/components/ui/button"
import { type VariantProps } from "class-variance-authority"
import { Loader2, Check } from "lucide-react"
import { forwardRef, useEffect, useRef, useState } from "react"

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

interface LoadingButtonProps extends Omit<ButtonProps, 'children'> {
  isLoading?: boolean
  loadingText?: string
  children?: React.ReactNode
}

/**
 * Botão com estado de loading padronizado
 */
const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, isLoading = false, loadingText, disabled, ...props }, ref) => {
    const [showBar, setShowBar] = useState(false)
    const [justFinished, setJustFinished] = useState(false)
    const finishTimeoutRef = useRef<number | null>(null)

    useEffect(() => {
      if (isLoading) {
        setShowBar(true)
        setJustFinished(false)
        if (finishTimeoutRef.current) {
          window.clearTimeout(finishTimeoutRef.current)
          finishTimeoutRef.current = null
        }
      } else {
        // quick success flash
        if (showBar) {
          setJustFinished(true)
          finishTimeoutRef.current = window.setTimeout(() => {
            setShowBar(false)
            setJustFinished(false)
          }, 600)
        } else {
          setShowBar(false)
        }
      }
      return () => {
        if (finishTimeoutRef.current) {
          window.clearTimeout(finishTimeoutRef.current)
          finishTimeoutRef.current = null
        }
      }
    }, [isLoading])

    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        className={justFinished ? "ring-2 ring-primary/40 transition" : undefined}
        {...props}
      >
        {showBar && (
          <div className="button-loading-bar">
            <div className="loading-bar-indicator" />
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText || "Carregando..."}
          </div>
        ) : (
          justFinished ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              {children}
            </div>
          ) : (
            children
          )
        )}
      </Button>
    )
  },
)

LoadingButton.displayName = "LoadingButton"

export { LoadingButton }
