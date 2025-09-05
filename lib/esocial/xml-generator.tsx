import type { DadosS2220, DadosS2240, DadosS2210 } from "./types"

export class EsocialXmlGenerator {
  private static gerarCabecalho(cnpj: string, tipoEvento: string): string {
    const agora = new Date().toISOString()
    const sequencial = Math.floor(Math.random() * 99999) + 1

    return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/v1_1_1">
  <envioLoteEventos grupo="2">
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpj}</nrInsc>
    </ideEmpregador>
    <ideTransmissor>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpj}</nrInsc>
    </ideTransmissor>
    <eventos>`
  }

  private static gerarRodape(): string {
    return `    </eventos>
  </envioLoteEventos>
</eSocial>`
  }

  static gerarS2220(dados: DadosS2220): string {
    const agora = new Date().toISOString()
    const sequencial = Math.floor(Math.random() * 99999) + 1

    const xml = `
      <evento Id="ID1${dados.empresa.cnpj}${agora.replace(/[-:T.]/g, "").substring(0, 14)}${sequencial.toString().padStart(5, "0")}">
        <evtMonit xmlns="http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_02_00">
          <ideEvento>
            <indRetif>1</indRetif>
            <tpAmb>2</tpAmb>
            <procEmi>1</procEmi>
            <verProc>1.0</verProc>
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
            <tpExameOcup>${this.mapearTipoExame(dados.exame.tipo)}</tpExameOcup>
            <aso>
              <dtAso>${dados.exame.data_exame}</dtAso>
              <resAso>${dados.exame.resultado === "Apto" ? "1" : "2"}</resAso>
              <exame>
                <dtExm>${dados.exame.data_exame}</dtExm>
                <procRealizado>0101</procRealizado>
                <obsProc>${dados.exame.observacoes || ""}</obsProc>
              </exame>
              <medico>
                <nmMed>${dados.exame.medico_nome}</nmMed>
                <nrCRM>${dados.exame.medico_crm}</nrCRM>
                <ufCRM>SP</ufCRM>
              </medico>
            </aso>
          </exMedOcup>
        </evtMonit>
      </evento>`

    return this.gerarCabecalho(dados.empresa.cnpj, "S-2220") + xml + this.gerarRodape()
  }

  static gerarS2240(dados: DadosS2240): string {
    const agora = new Date().toISOString()
    const sequencial = Math.floor(Math.random() * 99999) + 1

    const fatoresRisco = dados.ambiente.fatores_risco
      .map(
        (fator) => `
              <fatorRisco>
                <codFatorRisco>${fator.codigo}</codFatorRisco>
                <intConc>${fator.intensidade || ""}</intConc>
                <tecMedicao>${fator.tecnica_medicao || ""}</tecMedicao>
                <utilizEPC>S</utilizEPC>
                <utilizEPI>${fator.epi_eficaz ? "S" : "N"}</utilizEPI>
              </fatorRisco>`,
      )
      .join("")

    const xml = `
      <evento Id="ID1${dados.funcionario.cpf}${agora.replace(/[-:T.]/g, "").substring(0, 14)}${sequencial.toString().padStart(5, "0")}">
        <evtExpRisco xmlns="http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_02_00">
          <ideEvento>
            <indRetif>1</indRetif>
            <tpAmb>2</tpAmb>
            <procEmi>1</procEmi>
            <verProc>1.0</verProc>
          </ideEvento>
          <ideVinculo>
            <cpfTrab>${dados.funcionario.cpf}</cpfTrab>
            <matricula>${dados.funcionario.matricula}</matricula>
          </ideVinculo>
          <infoExpRisco>
            <dtIniCondicao>${dados.periodo.data_inicio}</dtIniCondicao>
            <infoAmb>
              <localAmb>1</localAmb>
              <dscSetor>${dados.ambiente.setor}</dscSetor>
              <tpInsc>1</tpInsc>
              <nrInsc>12345678000199</nrInsc>
            </infoAmb>
            <infoAtiv>
              <dscAtivDes>${dados.ambiente.descricao_atividade}</dscAtivDes>
            </infoAtiv>
            <agNoc>${fatoresRisco}
            </agNoc>
          </infoExpRisco>
        </evtExpRisco>
      </evento>`

    return this.gerarCabecalho("12345678000199", "S-2240") + xml + this.gerarRodape()
  }

  static gerarS2210(dados: DadosS2210): string {
    const agora = new Date().toISOString()
    const sequencial = Math.floor(Math.random() * 99999) + 1

    const xml = `
      <evento Id="ID1${dados.empresa.cnpj}${agora.replace(/[-:T.]/g, "").substring(0, 14)}${sequencial.toString().padStart(5, "0")}">
        <evtCAT xmlns="http://www.esocial.gov.br/schema/evt/evtCAT/v_S_01_02_00">
          <ideEvento>
            <indRetif>1</indRetif>
            <tpAmb>2</tpAmb>
            <procEmi>1</procEmi>
            <verProc>1.0</verProc>
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
            <dtAcid>${dados.acidente.data_acidente}</dtAcid>
            <tpAcid>${this.mapearTipoAcidente(dados.acidente.tipo_acidente)}</tpAcid>
            <hrAcid>${dados.acidente.hora_acidente}</hrAcid>
            <hrsTrabAntesAcid>0800</hrsTrabAntesAcid>
            <tpCat>1</tpCat>
            <indCatObito>N</indCatObito>
            <dtObito></dtObito>
            <indComunPolicia>N</indComunPolicia>
            <codSitGeradora>200000001</codSitGeradora>
            <iniciatCAT>1</iniciatCAT>
            <obsCAT>${dados.acidente.descricao}</obsCAT>
            <localAcidente>
              <tpLocal>1</tpLocal>
              <dscLocal>${dados.acidente.local_acidente}</dscLocal>
            </localAcidente>
            <parteAtingida>
              <codParteAting>753000000</codParteAting>
            </parteAtingida>
            <agenteCausador>
              <codAgntCausador>301010100</codAgntCausador>
            </agenteCausador>
            <atestado>
              <dtAtendimento>${dados.acidente.data_acidente}</dtAtendimento>
              <hrAtendimento>${dados.acidente.hora_acidente}</hrAtendimento>
              <indInternacao>N</indInternacao>
              <durTrat>1</durTrat>
              <indAfast>${dados.acidente.houve_afastamento ? "S" : "N"}</indAfast>
              <dscLesao>Lesão decorrente de acidente de trabalho</dscLesao>
              <dscCompLesao>Descrição complementar da lesão</dscCompLesao>
              <codCID>S000</codCID>
              <emitente>
                <nmEmit>Médico Responsável</nmEmit>
                <ideOC>1</ideOC>
                <nrOc>123456</nrOc>
                <ufOC>SP</ufOC>
              </emitente>
            </atestado>
          </cat>
        </evtCAT>
      </evento>`

    return this.gerarCabecalho(dados.empresa.cnpj, "S-2210") + xml + this.gerarRodape()
  }

  private static mapearTipoExame(tipo: string): string {
    const mapeamento = {
      ASO: "0",
      Periodico: "1",
      Mudanca: "2",
      Retorno: "3",
      Demissional: "4",
    }
    return mapeamento[tipo as keyof typeof mapeamento] || "0"
  }

  private static mapearTipoAcidente(tipo: string): string {
    const mapeamento = {
      Tipico: "1",
      Trajeto: "2",
      Doenca: "3",
    }
    return mapeamento[tipo as keyof typeof mapeamento] || "1"
  }
}
