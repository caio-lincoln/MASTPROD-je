# Deploy no Vercel - MASTPROD

## Configuração Simplificada

✅ **Não são necessárias variáveis de ambiente!**

Este projeto foi configurado para funcionar diretamente no Vercel sem necessidade de configurar variáveis de ambiente no painel.

### Configuração do Supabase

Antes do deploy, configure as credenciais do Supabase no arquivo `lib/config/supabase-config.ts`:

```typescript
export const SUPABASE_CONFIG = {
  url: "https://seu-project-ref.supabase.co",
  anonKey: "sua-chave-anonima-aqui",
  serviceRoleKey: "sua-chave-service-role-aqui"
}
```

Veja o arquivo `CONFIGURACAO-SUPABASE.md` para instruções detalhadas.
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

- [ ] Credenciais do Supabase configuradas em `lib/config/supabase-config.ts`
- [ ] Build local executado com sucesso (`npm run build`)
- [ ] Testes de API funcionando
- [ ] Configuração do Supabase validada
- [ ] RLS (Row Level Security) configurado no Supabase
- [ ] Certificados de teste disponíveis
- [ ] Projeto commitado e enviado para o repositório

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
```bash
# Deploy manual (opcional - o Vercel faz deploy automático)
vercel --prod

# Visualizar logs
vercel logs

# Testar build local
npm run build
npm run start
```
\`\`\`

## Contato

Para suporte técnico, consulte a documentação do projeto ou entre em contato com a equipe de desenvolvimento.
