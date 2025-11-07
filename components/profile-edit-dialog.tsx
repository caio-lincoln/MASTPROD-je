"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LoadingButton } from "@/components/ui/loading-button"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Camera, Upload, X } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface UserProfile {
  id: string
  user_id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  phone: string | null
}

interface ProfileEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: SupabaseUser
  onProfileUpdate?: (profile: UserProfile) => void
}

export function ProfileEditDialog({ 
  open, 
  onOpenChange, 
  user,
  onProfileUpdate 
}: ProfileEditDialogProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [phone, setPhone] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  // Carregar perfil do usuário
  useEffect(() => {
    if (open && user) {
      loadUserProfile()
    }
  }, [open, user])

  const loadUserProfile = async () => {
    setIsLoadingProfile(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      if (data) {
        setProfile(data)
        setDisplayName(data.display_name || "")
        setBio(data.bio || "")
        setPhone(data.phone || "")
        setAvatarPreview(data.avatar_url)
      } else {
        // Criar perfil se não existir
        const newProfile = {
          user_id: user.id,
          display_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
          avatar_url: user.user_metadata?.avatar_url || null,
          bio: null,
          phone: null
        }

        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert(newProfile)
          .select()
          .single()

        if (createError) throw createError

        setProfile(createdProfile)
        setDisplayName(createdProfile.display_name || "")
        setBio(createdProfile.bio || "")
        setPhone(createdProfile.phone || "")
        setAvatarPreview(createdProfile.avatar_url)
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil do usuário.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem (JPEG, PNG, WebP ou GIF).",
        variant: "destructive",
      })
      return
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      })
      return
    }

    setAvatarFile(file)

    // Criar preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null

    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, avatarFile, {
        upsert: true,
        contentType: avatarFile.type,
        cacheControl: '0',
      })

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName)

    // Cache busting para garantir atualização imediata no cliente
    return `${data.publicUrl}?v=${Date.now()}`
  }

  const handleSave = async () => {
    if (!profile) return

    setIsLoading(true)
    try {
      let avatarUrl = profile.avatar_url

      // Upload da nova foto se selecionada
      if (avatarFile) {
        avatarUrl = await uploadAvatar()
      }

      const updatedProfile = {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        avatar_url: avatarUrl
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updatedProfile)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      // Atualizar também os metadados do usuário no auth
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: displayName.trim(),
          avatar_url: avatarUrl
        }
      })

      if (authError) {
        console.warn('Erro ao atualizar metadados do usuário:', authError)
      }

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      })

      onProfileUpdate?.(data)
      onOpenChange(false)

      // Limpar estados
      setAvatarFile(null)
      setAvatarPreview(null)

    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setDisplayName(profile.display_name || "")
      setBio(profile.bio || "")
      setPhone(profile.phone || "")
      setAvatarPreview(profile.avatar_url)
    }
    setAvatarFile(null)
    onOpenChange(false)
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  const userInitials = (displayName || user.email?.split("@")[0] || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Atualize suas informações pessoais e foto de perfil.
          </DialogDescription>
        </DialogHeader>

        {isLoadingProfile ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage 
                    src={avatarPreview || profile?.avatar_url || "/placeholder.svg"} 
                    alt="Foto de perfil" 
                  />
                  <AvatarFallback className="text-lg">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                
                {avatarPreview && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={removeAvatar}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {avatarPreview ? "Alterar Foto" : "Adicionar Foto"}
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Campos do formulário */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nome de exibição</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Conte um pouco sobre você..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <LoadingButton
            onClick={handleSave}
            isLoading={isLoading}
            disabled={isLoadingProfile}
            loadingText="Salvando..."
          >
            Salvar Alterações
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
