# Deploy no Vercel - MASTPROD

## Variáveis de Ambiente Necessárias

Antes de fazer o deploy no Vercel, configure as seguintes variáveis de ambiente no painel do Vercel:

### Supabase
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_do_supabase
\`\`\`

## Configurações do Vercel

### 1. Configuração de Build
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node.js Version**: 18.x ou superior

### 2. Configurações de Função
- **Max Duration**: 30 segundos (configurado no vercel.json)
- **Memory**: 1024 MB (recomendado para processamento XML)

### 3. Domínio e HTTPS
- Certifique-se de que o domínio está configurado com HTTPS
- Configure redirects se necessário

## Funcionalidades Específicas

### Assinatura Digital XML (eSocial)
- Utiliza `node-forge` e `xml-crypto` para assinatura
- Certificados A1 são suportados via upload
- Certificados A3 requerem configuração adicional

### Autenticação
- Sistema de autenticação via Supabase
- Middleware configurado para proteção de rotas
- Redirecionamento automático para login

## Checklist de Deploy

- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Build local executado com sucesso (`npm run build`)
- [ ] Testes de API funcionando
- [ ] Configuração do Supabase validada
- [ ] RLS (Row Level Security) configurado no Supabase
- [ ] Certificados de teste disponíveis

## Monitoramento

### Logs
- Use `vercel logs` para monitorar logs em tempo real
- Configure alertas para erros críticos

### Performance
- Monitore tempo de resposta das APIs
- Verifique uso de memória nas funções serverless

## Troubleshooting

### Erro de Timeout
- Verifique se as funções não excedem 30 segundos
- Otimize processamento de XML se necessário

### Erro de Memória
- Aumente limite de memória se necessário
- Otimize manipulação de arquivos grandes

### Erro de Certificado
- Verifique formato do certificado A1
- Confirme senha do certificado
- Valide data de validade

## Comandos Úteis

\`\`\`bash
# Deploy manual
vercel --prod

# Visualizar logs
vercel logs

# Configurar variáveis de ambiente
vercel env add VARIABLE_NAME

# Testar build local
npm run build
npm run start
\`\`\`

## Contato

Para suporte técnico, consulte a documentação do projeto ou entre em contato com a equipe de desenvolvimento.
