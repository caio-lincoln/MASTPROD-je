# Configuração do Supabase para Produção

Este projeto foi configurado para funcionar diretamente no Vercel sem necessidade de variáveis de ambiente.

## Como Configurar

### 1. Obter as Credenciais do Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie as seguintes informações:
   - **Project URL** (algo como: `https://xxxxxxxxxxx.supabase.co`)
   - **anon public** key (chave pública anônima)
   - **service_role** key (chave de service role - apenas para operações server-side)

### 2. Configurar no Código

Edite o arquivo `lib/config/supabase-config.ts` e substitua os valores:

```typescript
export const SUPABASE_CONFIG = {
  url: "https://seu-project-ref.supabase.co", // Substitua pela sua Project URL
  anonKey: "sua-chave-anonima-aqui", // Substitua pela sua anon key
  serviceRoleKey: "sua-chave-service-role-aqui" // Substitua pela sua service role key
}
```

### 3. Verificar a Configuração

Após configurar, o sistema automaticamente verificará se as credenciais são válidas através da função `isSupabaseConfigured()`.

## Segurança

- A **anon key** é segura para uso público no frontend
- A **service role key** deve ser usada apenas em operações server-side
- Ambas as chaves são necessárias para o funcionamento completo do sistema

## Deploy no Vercel

Após configurar as credenciais:

1. Faça commit das alterações
2. Faça push para o repositório
3. O Vercel fará o deploy automaticamente
4. Não é necessário configurar variáveis de ambiente no painel do Vercel

## Vantagens desta Abordagem

- ✅ Não precisa configurar variáveis de ambiente
- ✅ Deploy mais simples e direto
- ✅ Funciona imediatamente após o deploy
- ✅ Menos pontos de falha na configuração
- ✅ Configuração centralizada em um único arquivo

## Troubleshooting

Se encontrar erros relacionados ao Supabase:

1. Verifique se as credenciais estão corretas no arquivo `supabase-config.ts`
2. Confirme se o projeto Supabase está ativo
3. Verifique se as políticas RLS estão configuradas corretamente
4. Confirme se os buckets de storage estão criados

## Suporte

Para mais informações sobre configuração do Supabase, consulte a [documentação oficial](https://supabase.com/docs).