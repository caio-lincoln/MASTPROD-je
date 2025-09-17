-- Criar bucket para fotos de perfil dos usuários
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Política para permitir que usuários vejam fotos de perfil (público)
CREATE POLICY "Fotos de perfil são públicas" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-pictures');

-- Política para permitir que usuários autenticados façam upload de suas próprias fotos
CREATE POLICY "Usuários podem fazer upload de suas fotos de perfil" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir que usuários atualizem suas próprias fotos
CREATE POLICY "Usuários podem atualizar suas fotos de perfil" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir que usuários deletem suas próprias fotos
CREATE POLICY "Usuários podem deletar suas fotos de perfil" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Criar tabela para dados adicionais do perfil do usuário
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Habilitar RLS na tabela user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam perfis públicos
CREATE POLICY "Perfis são visíveis para usuários autenticados" ON public.user_profiles
FOR SELECT TO authenticated
USING (true);

-- Política para permitir que usuários gerenciem seus próprios perfis
CREATE POLICY "Usuários podem gerenciar seus próprios perfis" ON public.user_profiles
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Função para atualizar o timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar automaticamente o updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil automaticamente quando um usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Comentários para documentação
COMMENT ON TABLE public.user_profiles IS 'Perfis estendidos dos usuários com informações adicionais';
COMMENT ON COLUMN public.user_profiles.display_name IS 'Nome de exibição do usuário';
COMMENT ON COLUMN public.user_profiles.avatar_url IS 'URL da foto de perfil do usuário';
COMMENT ON COLUMN public.user_profiles.bio IS 'Biografia ou descrição do usuário';
COMMENT ON COLUMN public.user_profiles.phone IS 'Telefone do usuário';