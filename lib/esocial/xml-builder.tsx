import { createClient } from "@/lib/supabase/client"
import type { DadosS2220, DadosS2240, DadosS2210, DadosS1000 } from "./types"

export class EsocialXmlBuilder {
  private supabase = createClient()
  private ambiente: "producao" | "homologacao" = "homologacao"
  private procEmi: "1" | "2" | "3" | "4" = "1"
  private verProc: string = "1.0.0"
  private tpAmb: "1" | "2" = "2"

  constructor(options?: { ambiente?: "producao" | "homologacao"; procEmi?: "1" | "2" | "3" | "4"; verProc?: string }) {
    // Ambiente (default homologação; rotas podem sobrepor para produção)
    if (options?.ambiente) this.ambiente = options.ambiente

    // procEmi pode vir de opções ou variáveis de ambiente
    const envProcEmi = (process.env.NEXT_PUBLIC_ESOCIAL_PROC_EMI || process.env.ESOCIAL_PROC_EMI) as
      | "1"
      | "2"
      | "3"
      | "4"
      | undefined
    if (options?.procEmi) this.procEmi = options.procEmi
    else if (envProcEmi && ["1", "2", "3", "4"].includes(envProcEmi)) this.procEmi = envProcEmi

    // verProc pode vir de opções ou variáveis de ambiente
    const envVerProc = (process.env.NEXT_PUBLIC_ESOCIAL_VER_PROC || process.env.ESOCIAL_VER_PROC) as string | undefined
    if (options?.verProc) this.verProc = options.verProc
    else if (envVerProc && envVerProc.trim().length > 0) this.verProc = envVerProc.trim()

    this.tpAmb = this.ambiente === "producao" ? "1" : "2"
  }

  // Gerar S-2220 (ASO) baseado em exame real do banco
  async gerarS2220FromExame(exame_id: string, empresa_id: string): Promise<string> {
    const { data: exame, error } = await this.supabase
      .from("exames_aso")
      .select(`
        *,
        funcionarios!inner(cpf, pis_pasep, nome, data_nascimento),
        empresas!inner(cnpj, razao_social),
        medicos (nome, crm)
      `)
      .eq("id", exame_id)
      .eq("empresa_id", empresa_id)
      .single()

    if (error || !exame) {
      throw new Error(`Exame não encontrado: ${error?.message}`)
    }

    const dados: DadosS2220 = {
      funcionario: {
        cpf: this.limparCPF(exame.funcionarios.cpf),
        pis: exame.funcionarios.pis_pasep || "",
        nome: exame.funcionarios.nome,
        data_nascimento: exame.funcionarios.data_nascimento,
      },
      exame: {
        tipo: this.mapearTipoExameASO(exame.tipo_exame),
        data_exame: exame.data_exame,
        data_validade: exame.data_validade,
        medico_crm: (exame.medicos?.crm as string) || exame.medico_crm || "",
        medico_nome: (exame.medicos?.nome as string) || exame.medico_nome || exame.medico_responsavel || "",
        resultado: exame.resultado_aso === "Apto" ? "Apto" : "Inapto",
        observacoes: exame.observacoes,
      },
      empresa: {
        cnpj: this.limparCNPJ(exame.empresas.cnpj),
        razao_social: exame.empresas.razao_social,
      },
    }

    return this.buildS2220XML(dados)
  }

  // Gerar S-2240 (Riscos) baseado em funcionário e riscos ocupacionais
  async gerarS2240FromFuncionario(funcionario_id: string, empresa_id: string): Promise<string> {
    console.log(`[DEBUG] Buscando funcionário - ID: ${funcionario_id}, Empresa ID: ${empresa_id}`)
    
    const { data: funcionario, error: funcError } = await this.supabase
      .from("funcionarios")
      .select(`
        *,
        empresas!inner(cnpj, nome)
      `)
      .eq("id", funcionario_id)
      .eq("empresa_id", empresa_id)
      .single()

    console.log(`[DEBUG] Resultado da consulta:`, { funcionario, funcError })

    if (funcError) {
      console.error(`[ERROR] Erro na consulta do funcionário:`, funcError)
      throw new Error(`Erro ao buscar funcionário: ${funcError.message}`)
    }

    if (!funcionario) {
      console.error(`[ERROR] Funcionário não encontrado - ID: ${funcionario_id}, Empresa: ${empresa_id}`)
      throw new Error(`Funcionário não encontrado com ID ${funcionario_id} na empresa ${empresa_id}`)
    }

    // Buscar riscos ocupacionais da empresa
    const { data: riscos } = await this.supabase
      .from("gestao_riscos")
      .select("*")
      .eq("empresa_id", empresa_id)
      .eq("ativo", true)

    const dados: DadosS2240 = {
      funcionario: {
        cpf: this.limparCPF(funcionario.cpf),
        pis: funcionario.pis_pasep || "",
        matricula: funcionario.matricula || funcionario.pis_pasep || "",
      },
      empresa: {
        cnpj: this.limparCNPJ((funcionario as any).empresas?.cnpj || ""),
        razao_social: (funcionario as any).empresas?.nome,
      },
      ambiente: {
        setor: funcionario.setor || "Administrativo",
        descricao_atividade: funcionario.cargo || "Atividades administrativas",
        fatores_risco: (riscos || []).map((risco) => ({
          codigo: this.mapearCodigoRisco(risco.tipo_risco),
          intensidade: risco.nivel_risco,
          tecnica_medicao: "Avaliação qualitativa",
          epi_eficaz: risco.nivel_risco === "Baixo",
        })),
      },
      periodo: {
        data_inicio: funcionario.data_admissao,
        data_fim: funcionario.data_demissao,
      },
    }

    return this.buildS2240XML(dados)
  }

  // Gerar S-2210 (CAT) baseado em incidente real
  async gerarS2210FromIncidente(incidente_id: string, empresa_id: string): Promise<string> {
    const { data: incidente, error } = await this.supabase
      .from("incidentes")
      .select(`
        *,
        funcionarios!inner(cpf, pis_pasep, nome, cargo),
        empresas!inner(cnpj, razao_social)
      `)
      .eq("id", incidente_id)
      .eq("empresa_id", empresa_id)
      .single()

    if (error || !incidente) {
      throw new Error(`Incidente não encontrado: ${error?.message}`)
    }

    const dados: DadosS2210 = {
      acidente: {
        data_acidente: incidente.data_ocorrencia,
        hora_acidente: incidente.hora_ocorrencia || "08:00",
        tipo_acidente: this.mapearTipoIncidente(incidente.tipo_incidente),
        local_acidente: incidente.local_ocorrencia || "Local de trabalho",
        descricao: incidente.descricao,
        houve_afastamento: incidente.gravidade === "Alta",
        dias_afastamento: incidente.gravidade === "Alta" ? 15 : 0,
      },
      funcionario: {
        cpf: this.limparCPF(incidente.funcionarios.cpf),
        pis: incidente.funcionarios.pis_pasep || "",
        nome: incidente.funcionarios.nome,
        cargo: incidente.funcionarios.cargo || "Funcionário",
      },
      empresa: {
        cnpj: this.limparCNPJ(incidente.empresas.cnpj),
        razao_social: incidente.empresas.razao_social,
      },
    }

    return this.buildS2210XML(dados)
  }

  // Gerar S-1000 (Informações do Empregador) com dados fornecidos e CNPJ da empresa
  async gerarS1000(empresa_id: string, dados: DadosS1000): Promise<string> {
    const { data: empresa, error } = await this.supabase
      .from("empresas")
      .select("cnpj, nome")
      .eq("id", empresa_id)
      .single()

    if (error || !empresa) {
      throw new Error(`Empresa não encontrada: ${error?.message}`)
    }

    const cnpj = this.limparCNPJ(empresa.cnpj || "")
    if (!cnpj) {
      throw new Error("CNPJ da empresa é obrigatório para gerar S-1000")
    }

    return this.buildS1000XML(dados, cnpj)
  }

  // Construir XML S-2220 com validações completas
  private buildS2220XML(dados: DadosS2220): string {
    this.validarDadosS2220(dados)

    const eventoId = this.gerarEventoId(dados.empresa.cnpj, "S2220")
    const dataHoraAtual = new Date().toISOString().slice(0, 19)

    return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/v1_1_1">
  <envioLoteEventos grupo="2">
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${dados.empresa.cnpj}</nrInsc>
    </ideEmpregador>
    <ideTransmissor>
      <tpInsc>1</tpInsc>
      <nrInsc>${dados.empresa.cnpj}</nrInsc>
    </ideTransmissor>
    <eventos>
      <evento Id="${eventoId}">
        <evtMonit xmlns="http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_02_00">
          <ideEvento>
            <indRetif>1</indRetif>
            <tpAmb>${this.tpAmb}</tpAmb>
            <procEmi>${this.procEmi}</procEmi>
            <verProc>${this.verProc}</verProc>
          </ideEvento>
          <ideEmpregador>
            <tpInsc>1</tpInsc>
            <nrInsc>${dados.empresa.cnpj}</nrInsc>
          </ideEmpregador>
          <ideVinculo>
            <cpfTrab>${dados.funcionario.cpf}</cpfTrab>
            <matricula>${dados.funcionario.pis}</matricula>
          </ideVinculo>
          <exMedOcup>
            <tpExameOcup>${this.mapearTipoExameParaESocial(dados.exame.tipo)}</tpExameOcup>
            <aso>
              <dtAso>${this.formatarData(dados.exame.data_exame)}</dtAso>
              <resAso>${dados.exame.resultado === "Apto" ? "1" : "2"}</resAso>
              <exame>
                <dtExm>${this.formatarData(dados.exame.data_exame)}</dtExm>
                <procRealizado>0101</procRealizado>
                <obsProc>${this.escaparXML(dados.exame.observacoes || "Exame ocupacional realizado")}</obsProc>
              </exame>
              <medico>
                <nmMed>${this.escaparXML(dados.exame.medico_nome)}</nmMed>
                <nrCRM>${dados.exame.medico_crm}</nrCRM>
                <ufCRM>SP</ufCRM>
              </medico>
            </aso>
          </exMedOcup>
        </evtMonit>
      </evento>
    </eventos>
  </envioLoteEventos>
</eSocial>`
  }

  // Construir XML S-2240 com validações completas
  private buildS2240XML(dados: DadosS2240): string {
    this.validarDadosS2240(dados)

    const eventoId = this.gerarEventoId(dados.funcionario.cpf, "S2240")

    const fatoresRiscoXML = dados.ambiente.fatores_risco
      .map(
        (fator) => `
              <fatorRisco>
                <codFatorRisco>${fator.codigo}</codFatorRisco>
                <intConc>${fator.intensidade || "NE"}</intConc>
                <tecMedicao>${this.escaparXML(fator.tecnica_medicao || "Avaliação qualitativa")}</tecMedicao>
                <utilizEPC>S</utilizEPC>
                <utilizEPI>${fator.epi_eficaz ? "S" : "N"}</utilizEPI>
              </fatorRisco>`,
      )
      .join("")

    const cnpjEmpresa = dados.empresa?.cnpj || "12345678000199"
    return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/v1_1_1">
  <envioLoteEventos grupo="2">
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjEmpresa}</nrInsc>
    </ideEmpregador>
    <ideTransmissor>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjEmpresa}</nrInsc>
    </ideTransmissor>
    <eventos>
      <evento Id="${eventoId}">
        <evtExpRisco xmlns="http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_02_00">
          <ideEvento>
            <indRetif>1</indRetif>
            <tpAmb>${this.tpAmb}</tpAmb>
            <procEmi>${this.procEmi}</procEmi>
            <verProc>${this.verProc}</verProc>
          </ideEvento>
          <ideVinculo>
            <cpfTrab>${dados.funcionario.cpf}</cpfTrab>
            <matricula>${dados.funcionario.matricula}</matricula>
          </ideVinculo>
          <infoExpRisco>
            <dtIniCondicao>${this.formatarData(dados.periodo.data_inicio)}</dtIniCondicao>
            ${dados.periodo.data_fim ? `<dtFimCondicao>${this.formatarData(dados.periodo.data_fim)}</dtFimCondicao>` : ""}
            <infoAmb>
              <localAmb>1</localAmb>
              <dscSetor>${this.escaparXML(dados.ambiente.setor)}</dscSetor>
              <tpInsc>1</tpInsc>
              <nrInsc>${cnpjEmpresa}</nrInsc>
            </infoAmb>
            <infoAtiv>
              <dscAtivDes>${this.escaparXML(dados.ambiente.descricao_atividade)}</dscAtivDes>
            </infoAtiv>
            <agNoc>${fatoresRiscoXML}
            </agNoc>
          </infoExpRisco>
        </evtExpRisco>
      </evento>
    </eventos>
  </envioLoteEventos>
</eSocial>`
  }

  // Construir XML S-1000 (S-1.3)
  private buildS1000XML(dados: DadosS1000, cnpj: string): string {
    // Validações mínimas por operação
    if (!dados.ideEvento?.tpAmb || !dados.ideEvento?.procEmi || !dados.ideEvento?.verProc) {
      throw new Error("Campos ideEvento (tpAmb, procEmi, verProc) são obrigatórios")
    }

    const operacao = dados.operacao || "inclusao"

    if (operacao === "inclusao") {
      if (!dados.idePeriodo?.iniValid) {
        throw new Error("idePeriodo.iniValid é obrigatório (AAAA-MM)")
      }
      if (!dados.infoCadastro?.classTrib) {
        throw new Error("infoCadastro.classTrib é obrigatório")
      }
      if (!dados.infoCadastro?.contato?.nmCtt || !dados.infoCadastro?.contato?.cpfCtt || !dados.infoCadastro?.contato?.email) {
        throw new Error("contato (nmCtt, cpfCtt, email) é obrigatório em infoCadastro")
      }
    } else if (operacao === "alteracao") {
      if (!dados.alteracao?.idePeriodo?.iniValid) {
        throw new Error("alteracao.idePeriodo.iniValid é obrigatório (AAAA-MM)")
      }
      if (!dados.alteracao?.infoCadastro?.classTrib) {
        throw new Error("alteracao.infoCadastro.classTrib é obrigatório")
      }
      if (!dados.alteracao?.infoCadastro?.contato?.nmCtt || !dados.alteracao?.infoCadastro?.contato?.cpfCtt || !dados.alteracao?.infoCadastro?.contato?.email) {
        throw new Error("alteracao.infoCadastro.contato (nmCtt, cpfCtt, email) é obrigatório")
      }
    } else if (operacao === "exclusao") {
      if (!dados.exclusao?.idePeriodo?.iniValid) {
        throw new Error("exclusao.idePeriodo.iniValid é obrigatório (AAAA-MM)")
      }
    }

    const eventoId = this.gerarEventoId(cnpj, "S1000")

    const contatoXML = `
          <contato>
            <nmCtt>${this.escaparXML(dados.infoCadastro.contato.nmCtt)}</nmCtt>
            <cpfCtt>${this.limparCPF(dados.infoCadastro.contato.cpfCtt)}</cpfCtt>
            ${dados.infoCadastro.contato.foneFix ? `<foneFixo>${this.escaparXML(dados.infoCadastro.contato.foneFix)}</foneFixo>` : ""}
            ${dados.infoCadastro.contato.foneCel ? `<foneCel>${this.escaparXML(dados.infoCadastro.contato.foneCel)}</foneCel>` : ""}
            <email>${this.escaparXML(dados.infoCadastro.contato.email)}</email>
          </contato>`

    const softHouseXMLInclusao = dados.infoCadastro.softHouse
      ? `
          <softHouse>
            <cnpjSoft>${this.limparCNPJ(dados.infoCadastro.softHouse.cnpjSoft)}</cnpjSoft>
            <nmRazao>${this.escaparXML(dados.infoCadastro.softHouse.nmRazao)}</nmRazao>
            ${dados.infoCadastro.softHouse.nmContato ? `<nmContato>${this.escaparXML(dados.infoCadastro.softHouse.nmContato)}</nmContato>` : ""}
            ${dados.infoCadastro.softHouse.telefone ? `<telefone>${this.escaparXML(dados.infoCadastro.softHouse.telefone)}</telefone>` : ""}
            ${dados.infoCadastro.softHouse.email ? `<email>${this.escaparXML(dados.infoCadastro.softHouse.email)}</email>` : ""}
          </softHouse>`
      : ""

    const softHouseXMLAlteracao = dados.alteracao?.infoCadastro.softHouse
      ? `
          <softHouse>
            <cnpjSoft>${this.limparCNPJ(dados.alteracao.infoCadastro.softHouse.cnpjSoft)}</cnpjSoft>
            <nmRazao>${this.escaparXML(dados.alteracao.infoCadastro.softHouse.nmRazao)}</nmRazao>
            ${dados.alteracao.infoCadastro.softHouse.nmContato ? `<nmContato>${this.escaparXML(dados.alteracao.infoCadastro.softHouse.nmContato)}</nmContato>` : ""}
            ${dados.alteracao.infoCadastro.softHouse.telefone ? `<telefone>${this.escaparXML(dados.alteracao.infoCadastro.softHouse.telefone)}</telefone>` : ""}
            ${dados.alteracao.infoCadastro.softHouse.email ? `<email>${this.escaparXML(dados.alteracao.infoCadastro.softHouse.email)}</email>` : ""}
          </softHouse>`
      : ""

    return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/v1_1_1">
  <envioLoteEventos grupo="1">
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpj}</nrInsc>
    </ideEmpregador>
    <ideTransmissor>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpj}</nrInsc>
    </ideTransmissor>
    <eventos>
      <evento Id="${eventoId}">
        <evtInfoEmpregador xmlns="http://www.esocial.gov.br/schema/evt/evtInfoEmpregador/v_S_01_03_00">
          <ideEvento>
            ${dados.ideEvento.indRetif ? `<indRetif>${dados.ideEvento.indRetif}</indRetif>` : ""}
            ${dados.ideEvento.nrRecibo ? `<nrRecibo>${this.escaparXML(dados.ideEvento.nrRecibo)}</nrRecibo>` : ""}
            <tpAmb>${dados.ideEvento.tpAmb}</tpAmb>
            <procEmi>${dados.ideEvento.procEmi}</procEmi>
            <verProc>${this.escaparXML(dados.ideEvento.verProc)}</verProc>
          </ideEvento>
          <ideEmpregador>
            <tpInsc>1</tpInsc>
            <nrInsc>${cnpj}</nrInsc>
          </ideEmpregador>
          <infoEmpregador>
            ${operacao === "inclusao" ? `
            <inclusao>
              <idePeriodo>
                <iniValid>${dados.idePeriodo.iniValid}</iniValid>
                ${dados.idePeriodo.fimValid ? `<fimValid>${dados.idePeriodo.fimValid}</fimValid>` : ""}
              </idePeriodo>
              <infoCadastro>
                <classTrib>${dados.infoCadastro.classTrib}</classTrib>
                ${dados.infoCadastro.indCoop ? `<indCoop>${dados.infoCadastro.indCoop}</indCoop>` : ""}
                ${dados.infoCadastro.indConstr ? `<indConstr>${dados.infoCadastro.indConstr}</indConstr>` : ""}
                ${dados.infoCadastro.indDesFolha ? `<indDesFolha>${dados.infoCadastro.indDesFolha}</indDesFolha>` : ""}
                ${dados.infoCadastro.indOptRegEletron ? `<indOptRegEletron>${dados.infoCadastro.indOptRegEletron}</indOptRegEletron>` : ""}
                ${dados.infoCadastro.indEntEd ? `<indEntEd>${dados.infoCadastro.indEntEd}</indEntEd>` : ""}
                ${dados.infoCadastro.indEtt ? `<indEtt>${dados.infoCadastro.indEtt}</indEtt>` : ""}
                ${contatoXML}
                ${softHouseXMLInclusao}
              </infoCadastro>
            </inclusao>` : ""}
            ${operacao === "alteracao" ? `
            <alteracao>
              <idePeriodo>
                <iniValid>${dados.alteracao!.idePeriodo.iniValid}</iniValid>
                ${dados.alteracao!.idePeriodo.fimValid ? `<fimValid>${dados.alteracao!.idePeriodo.fimValid}</fimValid>` : ""}
              </idePeriodo>
              <infoCadastro>
                <classTrib>${dados.alteracao!.infoCadastro.classTrib}</classTrib>
                ${dados.alteracao!.infoCadastro.indCoop ? `<indCoop>${dados.alteracao!.infoCadastro.indCoop}</indCoop>` : ""}
                ${dados.alteracao!.infoCadastro.indConstr ? `<indConstr>${dados.alteracao!.infoCadastro.indConstr}</indConstr>` : ""}
                ${dados.alteracao!.infoCadastro.indDesFolha ? `<indDesFolha>${dados.alteracao!.infoCadastro.indDesFolha}</indDesFolha>` : ""}
                ${dados.alteracao!.infoCadastro.indOptRegEletron ? `<indOptRegEletron>${dados.alteracao!.infoCadastro.indOptRegEletron}</indOptRegEletron>` : ""}
                ${dados.alteracao!.infoCadastro.indEntEd ? `<indEntEd>${dados.alteracao!.infoCadastro.indEntEd}</indEntEd>` : ""}
                ${dados.alteracao!.infoCadastro.indEtt ? `<indEtt>${dados.alteracao!.infoCadastro.indEtt}</indEtt>` : ""}
                ${`
                <contato>
                  <nmCtt>${this.escaparXML(dados.alteracao!.infoCadastro.contato.nmCtt)}</nmCtt>
                  <cpfCtt>${this.limparCPF(dados.alteracao!.infoCadastro.contato.cpfCtt)}</cpfCtt>
                  ${dados.alteracao!.infoCadastro.contato.foneFix ? `<foneFixo>${this.escaparXML(dados.alteracao!.infoCadastro.contato.foneFix)}</foneFixo>` : ""}
                  ${dados.alteracao!.infoCadastro.contato.foneCel ? `<foneCel>${this.escaparXML(dados.alteracao!.infoCadastro.contato.foneCel)}</foneCel>` : ""}
                  <email>${this.escaparXML(dados.alteracao!.infoCadastro.contato.email)}</email>
                </contato>`}
                ${softHouseXMLAlteracao}
              </infoCadastro>
            </alteracao>` : ""}
            ${operacao === "exclusao" ? `
            <exclusao>
              <idePeriodo>
                <iniValid>${dados.exclusao!.idePeriodo.iniValid}</iniValid>
                ${dados.exclusao!.idePeriodo.fimValid ? `<fimValid>${dados.exclusao!.idePeriodo.fimValid}</fimValid>` : ""}
              </idePeriodo>
            </exclusao>` : ""}
          </infoEmpregador>
        </evtInfoEmpregador>
      </evento>
    </eventos>
  </envioLoteEventos>
</eSocial>`
  }

  // Construir XML S-2210 com validações completas
  private buildS2210XML(dados: DadosS2210): string {
    this.validarDadosS2210(dados)

    const eventoId = this.gerarEventoId(dados.empresa.cnpj, "S2210")

    return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/v1_1_1">
  <envioLoteEventos grupo="2">
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${dados.empresa.cnpj}</nrInsc>
    </ideEmpregador>
    <ideTransmissor>
      <tpInsc>1</tpInsc>
      <nrInsc>${dados.empresa.cnpj}</nrInsc>
    </ideTransmissor>
    <eventos>
      <evento Id="${eventoId}">
        <evtCAT xmlns="http://www.esocial.gov.br/schema/evt/evtCAT/v_S_01_02_00">
          <ideEvento>
            <indRetif>1</indRetif>
            <tpAmb>${this.tpAmb}</tpAmb>
            <procEmi>${this.procEmi}</procEmi>
            <verProc>${this.verProc}</verProc>
          </ideEvento>
          <ideEmpregador>
            <tpInsc>1</tpInsc>
            <nrInsc>${dados.empresa.cnpj}</nrInsc>
          </ideEmpregador>
          <ideVinculo>
            <cpfTrab>${dados.funcionario.cpf}</cpfTrab>
            <matricula>${dados.funcionario.pis}</matricula>
          </ideVinculo>
          <cat>
            <dtAcid>${this.formatarData(dados.acidente.data_acidente)}</dtAcid>
            <tpAcid>${this.mapearTipoAcidenteParaESocial(dados.acidente.tipo_acidente)}</tpAcid>
            <hrAcid>${dados.acidente.hora_acidente.replace(":", "")}</hrAcid>
            <hrsTrabAntesAcid>0800</hrsTrabAntesAcid>
            <tpCat>1</tpCat>
            <indCatObito>N</indCatObito>
            <indComunPolicia>N</indComunPolicia>
            <codSitGeradora>200000001</codSitGeradora>
            <iniciatCAT>1</iniciatCAT>
            <obsCAT>${this.escaparXML(dados.acidente.descricao)}</obsCAT>
            <localAcidente>
              <tpLocal>1</tpLocal>
              <dscLocal>${this.escaparXML(dados.acidente.local_acidente)}</dscLocal>
            </localAcidente>
            <parteAtingida>
              <codParteAting>753000000</codParteAting>
            </parteAtingida>
            <agenteCausador>
              <codAgntCausador>301010100</codAgntCausador>
            </agenteCausador>
            <atestado>
              <dtAtendimento>${this.formatarData(dados.acidente.data_acidente)}</dtAtendimento>
              <hrAtendimento>${dados.acidente.hora_acidente.replace(":", "")}</hrAtendimento>
              <indInternacao>N</indInternacao>
              <durTrat>${dados.acidente.dias_afastamento || 1}</durTrat>
              <indAfast>${dados.acidente.houve_afastamento ? "S" : "N"}</indAfast>
              <dscLesao>Lesão decorrente de acidente de trabalho</dscLesao>
              <dscCompLesao>${this.escaparXML(dados.acidente.descricao)}</dscCompLesao>
              <codCID>S000</codCID>
              <emitente>
                <nmEmit>Médico do Trabalho</nmEmit>
                <ideOC>1</ideOC>
                <nrOc>123456</nrOc>
                <ufOC>SP</ufOC>
              </emitente>
            </atestado>
          </cat>
        </evtCAT>
      </evento>
    </eventos>
  </envioLoteEventos>
</eSocial>`
  }

  // Funções utilitárias e validações
  private gerarEventoId(identificador: string, tipoEvento: string): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, "")
      .substring(0, 14)
    const sequencial = Math.floor(Math.random() * 99999) + 1
    return `ID1${identificador}${timestamp}${sequencial.toString().padStart(5, "0")}`
  }

  private formatarData(data: string): string {
    return new Date(data).toISOString().split("T")[0]
  }

  private escaparXML(texto: string): string {
    return texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  }

  private limparCPF(cpf: string): string {
    return cpf.replace(/\D/g, "")
  }

  private limparCNPJ(cnpj: string): string {
    return cnpj.replace(/\D/g, "")
  }

  private mapearTipoExameASO(tipo: string): "ASO" | "Periodico" | "Mudanca" | "Retorno" | "Demissional" {
    const mapeamento: Record<string, "ASO" | "Periodico" | "Mudanca" | "Retorno" | "Demissional"> = {
      admissional: "ASO",
      periodico: "Periodico",
      mudanca_funcao: "Mudanca",
      retorno_trabalho: "Retorno",
      demissional: "Demissional",
    }
    return mapeamento[tipo] || "ASO"
  }

  private mapearTipoExameParaESocial(tipo: "ASO" | "Periodico" | "Mudanca" | "Retorno" | "Demissional"): string {
    const mapeamento = {
      ASO: "0",
      Periodico: "1",
      Mudanca: "2",
      Retorno: "3",
      Demissional: "4",
    }
    return mapeamento[tipo] || "0"
  }

  private mapearCodigoRisco(tipoRisco: string): string {
    const mapeamento: Record<string, string> = {
      ruido: "01.01.001",
      calor: "01.02.001",
      frio: "01.02.002",
      vibracao: "01.03.001",
      radiacao: "01.04.001",
      quimico: "02.01.001",
      biologico: "03.01.001",
      ergonomico: "04.01.001",
      acidente: "05.01.001",
    }
    return mapeamento[tipoRisco] || "05.01.001"
  }

  private mapearTipoIncidente(tipo: string): "Tipico" | "Trajeto" | "Doenca" {
    const mapeamento: Record<string, "Tipico" | "Trajeto" | "Doenca"> = {
      acidente_trabalho: "Tipico",
      acidente_trajeto: "Trajeto",
      doenca_ocupacional: "Doenca",
    }
    return mapeamento[tipo] || "Tipico"
  }

  private mapearTipoAcidenteParaESocial(tipo: "Tipico" | "Trajeto" | "Doenca"): string {
    const mapeamento = {
      Tipico: "1",
      Trajeto: "2",
      Doenca: "3",
    }
    return mapeamento[tipo] || "1"
  }

  // Validações
  private validarDadosS2220(dados: DadosS2220): void {
    if (!dados.funcionario.cpf || dados.funcionario.cpf.length !== 11) {
      throw new Error("CPF do funcionário inválido")
    }
    if (!dados.empresa.cnpj || dados.empresa.cnpj.length !== 14) {
      throw new Error("CNPJ da empresa inválido")
    }
    if (!dados.exame.data_exame) {
      throw new Error("Data do exame é obrigatória")
    }
  }

  private validarDadosS2240(dados: DadosS2240): void {
    if (!dados.funcionario.cpf || dados.funcionario.cpf.length !== 11) {
      throw new Error("CPF do funcionário inválido")
    }
    if (!dados.periodo.data_inicio) {
      throw new Error("Data de início do período é obrigatória")
    }
  }

  private validarDadosS2210(dados: DadosS2210): void {
    if (!dados.funcionario.cpf || dados.funcionario.cpf.length !== 11) {
      throw new Error("CPF do funcionário inválido")
    }
    if (!dados.empresa.cnpj || dados.empresa.cnpj.length !== 14) {
      throw new Error("CNPJ da empresa inválido")
    }
    if (!dados.acidente.data_acidente) {
      throw new Error("Data do acidente é obrigatória")
    }
  }
}
