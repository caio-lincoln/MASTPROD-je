-- Conceder permissões necessárias para o frontend acessar os dados
-- IMPORTANTE: Execute apenas após todas as políticas RLS estarem ativas

-- Conceder acesso às tabelas principais para usuários autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuario_empresas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exames_aso TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinamentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nao_conformidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exames_medicos TO authenticated;

-- Conceder acesso às sequências (para IDs auto-incrementais se houver)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Conceder execução das funções utilitárias
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_company_access(uuid, uuid) TO authenticated;

-- Verificar se todas as tabelas têm RLS ativo
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('empresas', 'funcionarios', 'usuario_empresas', 'exames_aso', 'treinamentos', 'nao_conformidades', 'exames_medicos');
