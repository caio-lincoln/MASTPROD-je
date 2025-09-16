import { createClient } from '@supabase/supabase-js'
import { ESocialXMLParser } from '../lib/esocial/xml-parser'
import * as fs from 'fs'
import * as path from 'path'

async function debugImport() {
  try {
    console.log('🔍 Iniciando debug da importação...')
    
    // 1. Testar conexão com Supabase
    console.log('1. Testando conexão com Supabase...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variáveis de ambiente do Supabase não encontradas')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Testar conexão
    const { data, error } = await supabase.from('empresas').select('count').limit(1)
    if (error) {
      console.error('❌ Erro na conexão com Supabase:', error)
      return
    }
    console.log('✅ Conexão com Supabase OK')
    
    // 2. Testar parser XML
    console.log('2. Testando parser XML...')
    const parser = new ESocialXMLParser()
    
    // 3. Listar arquivos XML
    const xmlDir = process.argv[3] || "C:\\Users\\caiol\\OneDrive\\Documentos\\GitHub\\MASTPROD-je\\XML EMPRESAS"
    console.log(`3. Listando arquivos em: ${xmlDir}`)
    
    if (!fs.existsSync(xmlDir)) {
      throw new Error(`Diretório não encontrado: ${xmlDir}`)
    }
    
    const files = fs.readdirSync(xmlDir).filter(file => file.endsWith('.xml'))
    console.log(`✅ Encontrados ${files.length} arquivos XML`)
    
    // 4. Testar parsing do primeiro arquivo
    if (files.length > 0) {
      const firstFile = files[0]
      const filePath = path.join(xmlDir, firstFile)
      console.log(`4. Testando parsing do arquivo: ${firstFile}`)
      
      const evento = await parser.parseXMLFile(filePath)
      console.log('✅ Parse realizado com sucesso')
      console.log('Dados extraídos:', {
        tipoEvento: evento.tipoEvento,
        cnpj: evento.cnpj,
        periodoApuracao: evento.periodoApuracao,
        dadosSize: evento.dados ? Object.keys(evento.dados).length : 0
      })
    }
    
    console.log('🎉 Debug concluído com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro durante o debug:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

debugImport()