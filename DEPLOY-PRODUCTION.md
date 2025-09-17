# Guia de Deploy para Produção - MASTPROD SST

## 📋 Pré-requisitos

### 1. Configurações do Supabase (Produção)
- [ ] Criar projeto Supabase de produção
- [ ] Executar todas as migrations do diretório `/scripts/`
- [ ] Configurar RLS (Row Level Security)
- [ ] Configurar buckets de storage
- [ ] Obter credenciais de produção

### 2. Certificados Digitais
- [ ] Certificado A1 ou A3 válido para eSocial
- [ ] Configurar armazenamento seguro dos certificados
- [ ] Testar conectividade com ambiente de produção do eSocial

### 3. Configurações de Email/SMS
- [ ] Configurar provedor SMTP de produção
- [ ] Configurar provedor SMS de produção
- [ ] Testar envio de notificações

## 🔧 Variáveis de Ambiente

### Arquivo `.env.production`
```bash
# Ambiente
NODE_ENV=production

# Supabase - OBRIGATÓRIO CONFIGURAR
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# URLs de Produção
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your-production-nextauth-secret

# Email (OBRIGATÓRIO PARA NOTIFICAÇÕES)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-production-email@domain.com
SMTP_PASSWORD=your-production-email-password

# SMS (OBRIGATÓRIO PARA NOTIFICAÇÕES)
SMS_API_KEY=your-production-sms-api-key
SMS_API_URL=https://api.your-sms-provider.com

# eSocial (OBRIGATÓRIO)
ESOCIAL_ENVIRONMENT=producao
ESOCIAL_CERTIFICATE_PATH=/path/to/production/certificate
ESOCIAL_CERTIFICATE_PASSWORD=your-production-certificate-password

# Segurança
ENCRYPTION_KEY=your-production-encryption-key-32-chars
JWT_SECRET=your-production-jwt-secret

# Cache (Opcional)
REDIS_URL=redis://your-production-redis-url:6379

# Monitoramento (Recomendado)
SENTRY_DSN=https://your-production-sentry-dsn
LOG_LEVEL=error
```

## 🚀 Deploy no Vercel

### 1. Configuração do Projeto
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login no Vercel
vercel login

# Deploy inicial
vercel --prod
```

### 2. Configurar Variáveis no Vercel Dashboard
1. Acesse o projeto no Vercel Dashboard
2. Vá em Settings > Environment Variables
3. Adicione todas as variáveis do `.env.production`
4. Marque como "Production" environment

### 3. Configurações Específicas do Vercel
- ✅ `vercel.json` já configurado
- ✅ Timeout de 30s para APIs
- ✅ NODE_ENV=production configurado

## 🔒 Implementações Necessárias

### ⚠️ CRÍTICO - Implementar antes do deploy:

#### 1. Assinatura Digital XML A3
**Arquivo:** `app/api/esocial/assinar-xml-a3/route.ts`
- [ ] Implementar `buscarCertificadoPorThumbprint()`
- [ ] Implementar `gerarAssinaturaA3()`
- [ ] Integrar com HSM ou store de certificados

#### 2. Configurações de Sistema
**Arquivo:** `components/modules/settings.tsx`
- [ ] Implementar teste real de conexão eSocial
- [ ] Implementar teste real de conexão SMTP
- [ ] Implementar teste real de conexão SMS

#### 3. Dados da Empresa
- ✅ Removidos dados mockados
- ✅ Usando dados reais da empresa selecionada

## 🧪 Testes Pré-Deploy

### 1. Testes Locais
```bash
# Build de produção
npm run build

# Testar build localmente
npm start

# Verificar logs de erro
npm run lint
```

### 2. Testes de Integração
- [ ] Testar conexão com Supabase de produção
- [ ] Testar assinatura digital (se implementada)
- [ ] Testar envio de emails
- [ ] Testar envio de SMS
- [ ] Testar upload de arquivos

### 3. Testes de Segurança
- [ ] Verificar RLS no Supabase
- [ ] Testar autenticação
- [ ] Verificar permissões de usuário
- [ ] Testar proteção de rotas

## 📊 Monitoramento Pós-Deploy

### 1. Logs e Métricas
- Configurar Sentry para error tracking
- Monitorar performance no Vercel Analytics
- Configurar alertas para APIs críticas

### 2. Backup e Recuperação
- Configurar backup automático do Supabase
- Documentar procedimentos de rollback
- Testar restauração de dados

## 🚨 Checklist Final

### Antes do Deploy:
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Certificados digitais válidos e configurados
- [ ] Provedores de email/SMS configurados
- [ ] Supabase de produção configurado
- [ ] Testes de integração passando
- [ ] Build de produção funcionando

### Após o Deploy:
- [ ] Verificar funcionamento da aplicação
- [ ] Testar fluxos críticos
- [ ] Verificar logs de erro
- [ ] Confirmar integrações externas
- [ ] Documentar URLs e credenciais

## 📞 Suporte

Em caso de problemas durante o deploy:
1. Verificar logs no Vercel Dashboard
2. Verificar logs no Supabase Dashboard
3. Verificar configurações de DNS
4. Verificar certificados SSL

---

**⚠️ IMPORTANTE:** Este sistema contém funcionalidades críticas que requerem implementação real antes do uso em produção. Não deploy sem implementar as funcionalidades marcadas como "TODO" no código.