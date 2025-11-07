# Checklist de Produção

Este checklist garante que a plataforma opere 100% funcional em modo produção.

## 1) Variáveis de Ambiente
- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase (publishable).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave anon/publishable do Supabase (client-side).
- `SUPABASE_SERVICE_ROLE_KEY`: service key do Supabase (apenas server-side).
- `NEXT_PUBLIC_APP_ENV`: defina `production` em produção.
- `ESOCIAL_CERT_BUCKET`: nome do bucket de certificados (se aplicável).
- `NEXT_PUBLIC_SITE_URL`: URL pública da aplicação.

## 2) Segurança do Banco de Dados
- Habilitar RLS e validar políticas: executar scripts `06-enable-rls.sql` e `07-create-rls-policies.sql` (já existentes).
- Revisar views seguras: `23-create-secure-views.sql`.
- Criar buckets com permissões adequadas: `41-create-profile-storage-bucket.sql`, `42-create-certificados-bucket.sql`, `29-configure-storage-buckets.sql`.

## 3) Seeds e Dados de Exemplo
- NÃO executar scripts `05-insert-sample-data.sql`, `15-insert-sample-treinamentos-ncs.sql`, `18-insert-sample-seguranca-data.sql`, `21-insert-sample-epis-data.sql` em produção.
- Se necessário, crie uma pasta `scripts/dev-seed/` para uso exclusivo em desenvolvimento.
- Caso já existam dados de exemplo em produção, planejar migração de limpeza.

## 4) Build e Deploy
- Rodar `npm ci` e `npm run build`.
- Em Node/PM2: `npm run start` com `NODE_ENV=production`.
- Em Vercel: configurar `Environment Variables` e `Build Command` padrão do Next.js.
- Confirmar `middleware.ts` está ativo para SSR com Supabase.

## 5) Headers e Proteções
- Confirmar headers de segurança: `lib/security/headers.ts`.
- Habilitar CSRF: `lib/security/csrf.ts` e uso no middleware.
- Rate limiting: `lib/security/rate-limit.ts` (aplicar em rotas críticas).

## 6) Armazenamento e Uploads
- Buckets: `biblioteca`, `esocial`, `relatorios`, `backups` existentes no Supabase Storage.
- Validar limites de tamanho/tipos de arquivo na UI e backend.
- Garantir URLs públicas só quando necessário.

## 7) Integração eSocial
- Certificados e chaves carregados no bucket correto.
- Configuração de ambiente (produção/homologação) definida nas telas de Integração.
- Testar conectividade (`soap-client.tsx::testarConectividade`).

## 8) Observabilidade
- Monitorar logs: Supabase (API/Postgres/Realt-time) e plataforma de deploy.
- Usar `components/error-boundary.tsx` para capturar erros de renderização.

## 9) UX e Dados Dinâmicos
- Confirmar que listas estáticas críticas foram substituídas por dados do BD quando necessário (setores, médicos, categorias de treinamento).
- Placeholders de imagens devem ser substituídos por logos/avatares reais em produção.

## 10) Checklist de Verificação
- Login, troca de senha, CSRF e rate limit funcionam.
- Upload/Download na Biblioteca Digital operam e salvam `arquivo_url`, `tipo`, `tamanho`.
- Filtros e contadores dinâmicos funcionam na Biblioteca.
- Integração eSocial: envio/consulta operando (ambiente e credenciais válidas).
- Relatórios geram e exportam arquivos corretamente (PDF/Excel/CSV).

