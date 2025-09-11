-- Criar bucket para evidências de incidentes
-- Suporte para imagens, vídeos e áudios

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('evidencias-incidentes', 'evidencias-incidentes', false, 104857600, ARRAY[
        -- Imagens
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        -- Vídeos
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm',
        -- Áudios
        'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac',
        -- Documentos
        'application/pdf', 'text/plain'
    ]) -- 100MB limite
ON CONFLICT (id) DO NOTHING;

-- Políticas para bucket evidências de incidentes
CREATE POLICY "Usuários podem ver evidências da sua empresa" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'evidencias-incidentes' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem fazer upload de evidências da sua empresa" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'evidencias-incidentes' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem atualizar evidências da sua empresa" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'evidencias-incidentes' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem deletar evidências da sua empresa" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'evidencias-incidentes' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

COMMIT;