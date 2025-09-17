# Configuração de Credenciais para Produção

## 🔧 Credenciais que Precisam ser Configuradas

### 1. **URL do Domínio de Produção**
```bash
NEXTAUTH_URL=https://mastprod-sst.vercel.app
```
**Ação:** Altere para o domínio real onde a aplicação será hospedada.

### 2. **Configurações de Email (Gmail)**
```bash
SMTP_USER=mastprod.sst@gmail.com
SMTP_PASSWORD=sua-senha-de-app-gmail
```

**Como configurar:**
1. Acesse sua conta Gmail
2. Vá em "Gerenciar sua Conta Google"
3. Segurança > Verificação em duas etapas
4. Senhas de app > Gerar nova senha de app
5. Use a senha gerada no campo `SMTP_PASSWORD`

### 3. **Configurações SMS (Twilio)**
```bash
TWILIO_ACCOUNT_SID=sua-twilio-account-sid
TWILIO_AUTH_TOKEN=sua-twilio-auth-token
TWILIO_PHONE_NUMBER=+5511999999999
```

**Como configurar:**
1. Crie conta no [Twilio](https://www.twilio.com)
2. Acesse o Console Dashboard
3. Copie Account SID e Auth Token
4. Compre um número de telefone brasileiro

### 4. **Certificado Digital eSocial (A1) - Supabase Storage**
```bash
ESOCIAL_CERTIFICATE_STORAGE=supabase
ESOCIAL_CERTIFICATE_BUCKET=certificados-esocial
ESOCIAL_CERTIFICATE_FILENAME=certificado-a1.p12
ESOCIAL_CERTIFICATE_PASSWORD=sua-senha-do-certificado
```

**Como configurar:**
1. **Execute o script:** `scripts/42-create-certificados-bucket.sql` no Supabase
2. **Faça upload do certificado:**
   - Acesse o Supabase Dashboard > Storage
   - Vá no bucket `certificados-esocial`
   - Faça upload do arquivo `.p12` do certificado A1
3. **Configure a senha** do certificado A1
4. **Vantagens do Supabase Storage:**
   - ✅ Bucket privado e seguro
   - ✅ Políticas RLS para controle de acesso
   - ✅ Backup automático
   - ✅ Acesso apenas para admins/owners

### 5. **Cache Redis (Opcional)**
```bash
REDIS_URL=redis://default:sua-redis-password@redis-host:6379
```

**Recomendação:** Use [Upstash Redis](https://upstash.com) (gratuito até 10k requests/dia)

### 6. **Monitoramento Sentry**
```bash
SENTRY_DSN=https://sua-sentry-dsn@sentry.io/projeto
```

**Como configurar:**
1. Crie conta no [Sentry](https://sentry.io)
2. Crie novo projeto Next.js
3. Copie o DSN fornecido

## ✅ Já Configurado

### ✅ **Supabase**
- URL: `https://ifvgnuhyfmadzkqmtfkl.supabase.co`
- Chaves: Já configuradas com as credenciais reais

### ✅ **Chaves de Segurança**
- Encryption Key: Gerada automaticamente
- JWT Secret: Configurado para produção
- Crypto Secret: Configurado para produção

### ✅ **Configurações de Sistema**
- NODE_ENV: production
- Rate Limiting: Habilitado
- Backup: Configurado
- Log Level: error (produção)

## 🚀 Próximos Passos

1. **Configure as credenciais pendentes** listadas acima
2. **Teste cada integração** antes do deploy final
3. **Configure no Vercel Dashboard** todas as variáveis de ambiente
4. **Execute o deploy** com `vercel --prod`

## ⚠️ Importante

- **NUNCA** commite o arquivo `.env.production` no Git
- **SEMPRE** use o Vercel Dashboard para configurar as variáveis
- **TESTE** todas as integrações em ambiente de staging primeiro