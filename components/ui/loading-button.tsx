import { Button, type ButtonProps } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { forwardRef } from "react"

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
    return (
      <Button ref={ref} disabled={disabled || isLoading} {...props}>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText || "Carregando..."}
          </div>
        ) : (
          children
        )}
      </Button>
    )
  },
)

LoadingButton.displayName = "LoadingButton"

export { LoadingButton }
