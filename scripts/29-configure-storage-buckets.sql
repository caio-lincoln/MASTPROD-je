-- Configurar buckets de storage para o sistema SST
-- Executar após criar as tabelas

-- Criar buckets de storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('pgr', 'pgr', false, 52428800, ARRAY['application/pdf']), -- 50MB, apenas PDFs
    ('certificados', 'certificados', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']), -- 10MB
    ('biblioteca', 'biblioteca', false, 104857600, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']), -- 100MB
    ('relatorios', 'relatorios', false, 52428800, ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']), -- 50MB
    ('esocial', 'esocial', false, 5242880, ARRAY['application/xml', 'text/xml']), -- 5MB, apenas XML
    ('backups', 'backups', false, 1073741824, ARRAY['application/zip', 'application/json', 'text/csv']) -- 1GB
ON CONFLICT (id) DO NOTHING;

-- Políticas para bucket PGR
CREATE POLICY "Usuários podem ver PGR da sua empresa" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'pgr' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem fazer upload de PGR da sua empresa" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'pgr' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem atualizar PGR da sua empresa" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'pgr' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem deletar PGR da sua empresa" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'pgr' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

-- Políticas para bucket Certificados
CREATE POLICY "Usuários podem ver certificados da sua empresa" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'certificados' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem fazer upload de certificados da sua empresa" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'certificados' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem atualizar certificados da sua empresa" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'certificados' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem deletar certificados da sua empresa" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'certificados' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

-- Políticas para bucket Biblioteca
CREATE POLICY "Usuários podem ver biblioteca da sua empresa" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'biblioteca' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem fazer upload na biblioteca da sua empresa" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'biblioteca' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem atualizar biblioteca da sua empresa" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'biblioteca' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem deletar da biblioteca da sua empresa" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'biblioteca' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

-- Políticas para bucket Relatórios
CREATE POLICY "Usuários podem ver relatórios da sua empresa" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'relatorios' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem fazer upload de relatórios da sua empresa" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'relatorios' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem deletar relatórios da sua empresa" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'relatorios' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

-- Políticas para bucket eSocial
CREATE POLICY "Usuários podem ver eSocial da sua empresa" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'esocial' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem fazer upload de eSocial da sua empresa" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'esocial' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

CREATE POLICY "Usuários podem deletar eSocial da sua empresa" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'esocial' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.empresa_id::text = (storage.foldername(name))[1]
        )
    );

-- Políticas para bucket Backups (apenas admins)
CREATE POLICY "Apenas admins podem ver backups" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'backups' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.role = 'admin'
        )
    );

CREATE POLICY "Apenas admins podem fazer upload de backups" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'backups' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.role = 'admin'
        )
    );

CREATE POLICY "Apenas admins podem deletar backups" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'backups' AND 
        EXISTS (
            SELECT 1 FROM usuario_empresas ue 
            WHERE ue.usuario_id = auth.uid() 
            AND ue.role = 'admin'
        )
    );

-- Função para limpar arquivos expirados automaticamente
CREATE OR REPLACE FUNCTION cleanup_expired_files()
RETURNS void AS $$
BEGIN
    -- Deletar backups expirados
    DELETE FROM storage.objects 
    WHERE bucket_id = 'backups' 
    AND created_at < NOW() - INTERVAL '90 days';
    
    -- Deletar relatórios antigos (mais de 1 ano)
    DELETE FROM storage.objects 
    WHERE bucket_id = 'relatorios' 
    AND created_at < NOW() - INTERVAL '1 year';
    
    -- Log da limpeza
    INSERT INTO logs_gerais (empresa_id, modulo, acao, descricao)
    VALUES (NULL, 'sistema', 'limpeza_automatica', 'Limpeza automática de arquivos expirados executada');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
