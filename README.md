📘 README — MASTPROD SST
📌 Visão Geral

O MASTPROD SST é uma plataforma completa de Gestão de Segurança e Saúde no Trabalho (SST).
Foi projetado para garantir 100% de conformidade com as Normas Regulamentadoras (NRs) e com o eSocial, além de centralizar todos os processos de SST em uma única solução.

Principais benefícios:

Redução de riscos de acidentes e não conformidades;

Automação de processos manuais (envio automático ao eSocial);

Dashboards estratégicos com KPIs em tempo real;

Conformidade com LGPD e NRs aplicáveis.

🛠️ Arquitetura

Frontend/UI: Next.js (hospedado na Vercel)

Banco de Dados: Supabase (Postgres, Auth, Storage)

Integração eSocial: Gateway dedicado (certificado digital A1, IP fixo)

Cliente HTTP: trae (consumo de APIs)

CI/CD: GitHub Actions + Deploy Contínuo

📂 Estrutura de Módulos

Dashboard – KPIs, gráficos e alertas em tempo real.

Gestão de Riscos (PGR) – Inventário e matriz de riscos.

Saúde Ocupacional – Exames periódicos, ASO, histórico médico.

Colaboradores – Cadastro completo e histórico de SST.

Treinamentos – Gestão de capacitações e certificados digitais.

Biblioteca Digital – Controle de documentos e versões.

Relatórios Gerenciais – Análises e estatísticas.

Integração com eSocial – Eventos S-2210, S-2220, S-2230, S-2240, S-3000.

Não Conformidades – Registro e planos de ação.

Segurança do Trabalho – EPIs, inspeções, acidentes.

Configurações – Usuários, permissões, parâmetros gerais.

⚙️ Instalação e Execução (para desenvolvedores)
Pré-requisitos

Node.js >= 18

Supabase CLI

GitHub Actions configurado

Certificado Digital A1 válido

Passos
# Clonar o repositório
git clone https://github.com/seuprojeto/mastprod-sst.git
cd mastprod-sst

# Instalar dependências
npm install

# Rodar em ambiente de desenvolvimento
npm run dev

🔗 Integração com eSocial

Suporte aos eventos: S-2210, S-2220, S-2230, S-2240, S-3000.

Geração e assinatura de XML com certificado digital A1.

Comunicação segura com os webservices do governo.

Monitoramento de protocolos e recibos.

🔒 Segurança & LGPD

Autenticação via Supabase Auth (JWT).

Controle de acesso por papéis (RBAC).

Criptografia em repouso (AES) e em trânsito (TLS).

Logs e auditoria de todas as ações críticas.

Políticas de retenção e consentimento em conformidade com a LGPD.

📑 Documentação

Documentos de Negócio: Proposta Técnica, Requisitos, BRD, User Stories, Backlog.

Documentos Técnicos: SRS, Arquitetura, DER, Wireframes, Plano de Testes, Deploy Runbook.

Guias de Uso: Manual do Usuário, Manual Técnico.

👥 Responsabilidades do Cliente

O cliente deve fornecer:

Certificado Digital A1 válido;

Dados cadastrais da empresa (CNPJ, CNAE, FPAS, lotações);

Planilhas ou bases legadas de colaboradores, exames e treinamentos;

Modelos atuais de documentos (ASO, CAT, fichas de EPI);

Nomeação de responsáveis para homologação;

Aprovação de políticas LGPD.

📅 Cronograma

Duração estimada: 120 a 150 dias

Metodologia ágil: sprints quinzenais

Entregas incrementais com homologação contínua


👉 Esse README serve como documento executivo para o cliente e também como guia de onboarding para qualquer dev que entrar no projeto.
