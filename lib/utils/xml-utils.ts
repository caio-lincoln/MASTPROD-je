/**
 * Utilitários para manipulação de XML
 */

/**
 * Valida se uma string é um XML válido
 * @param xmlString String XML para validar
 * @returns true se o XML é válido
 */
export function isValidXML(xmlString: string): boolean {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    const parseError = doc.getElementsByTagName('parsererror')
    return parseError.length === 0
  } catch (error) {
    return false
  }
}

/**
 * Formata XML com indentação
 * @param xmlString String XML para formatar
 * @param indent Caracteres de indentação (padrão: 2 espaços)
 * @returns XML formatado
 */
export function formatXML(xmlString: string, indent: string = '  '): string {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    
    if (doc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('XML inválido')
    }

    return formatNode(doc.documentElement, '', indent)
  } catch (error) {
    console.error('Erro ao formatar XML:', error)
    return xmlString
  }
}

/**
 * Função auxiliar para formatar nós XML recursivamente
 */
function formatNode(node: Node, currentIndent: string, indent: string): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim()
    return text ? text : ''
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element
    let result = currentIndent + '<' + element.tagName

    // Adicionar atributos
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i]
      result += ` ${attr.name}="${attr.value}"`
    }

    if (element.childNodes.length === 0) {
      result += '/>'  
    } else {
      result += '>'
      
      let hasTextContent = false
      let childContent = ''
      
      for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes[i]
        
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent?.trim()
          if (text) {
            hasTextContent = true
            childContent += text
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          childContent += '\n' + formatNode(child, currentIndent + indent, indent)
        }
      }
      
      if (hasTextContent && element.childNodes.length === 1) {
        result += childContent
      } else if (childContent) {
        result += childContent + '\n' + currentIndent
      }
      
      result += '</' + element.tagName + '>'
    }
    
    return result
  }

  return ''
}

/**
 * Extrai texto de um elemento XML
 * @param xmlString String XML
 * @param elementName Nome do elemento
 * @returns Texto do elemento ou null se não encontrado
 */
export function extractElementText(xmlString: string, elementName: string): string | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    const element = doc.getElementsByTagName(elementName)[0]
    return element ? element.textContent : null
  } catch (error) {
    console.error('Erro ao extrair texto do elemento:', error)
    return null
  }
}

/**
 * Extrai valor de atributo de um elemento XML
 * @param xmlString String XML
 * @param elementName Nome do elemento
 * @param attributeName Nome do atributo
 * @returns Valor do atributo ou null se não encontrado
 */
export function extractAttributeValue(
  xmlString: string, 
  elementName: string, 
  attributeName: string
): string | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    const element = doc.getElementsByTagName(elementName)[0]
    return element ? element.getAttribute(attributeName) : null
  } catch (error) {
    console.error('Erro ao extrair atributo:', error)
    return null
  }
}

/**
 * Remove elementos XML por nome
 * @param xmlString String XML
 * @param elementName Nome do elemento a remover
 * @returns XML sem os elementos especificados
 */
export function removeElements(xmlString: string, elementName: string): string {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    const elements = doc.getElementsByTagName(elementName)
    
    // Remover elementos (de trás para frente para evitar problemas de índice)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i]
      element.parentNode?.removeChild(element)
    }
    
    const serializer = new XMLSerializer()
    return serializer.serializeToString(doc)
  } catch (error) {
    console.error('Erro ao remover elementos:', error)
    return xmlString
  }
}

/**
 * Converte XML para objeto JavaScript
 * @param xmlString String XML
 * @returns Objeto JavaScript
 */
export function xmlToObject(xmlString: string): any {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    
    if (doc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('XML inválido')
    }
    
    return nodeToObject(doc.documentElement)
  } catch (error) {
    console.error('Erro ao converter XML para objeto:', error)
    return null
  }
}

/**
 * Função auxiliar para converter nó XML em objeto
 */
function nodeToObject(node: Element): any {
  const obj: any = {}
  
  // Adicionar atributos
  if (node.attributes.length > 0) {
    obj['@attributes'] = {}
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i]
      obj['@attributes'][attr.name] = attr.value
    }
  }
  
  // Processar nós filhos
  const children: { [key: string]: any } = {}
  
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i]
    
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim()
      if (text) {
        obj['#text'] = text
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childElement = child as Element
      const childName = childElement.tagName
      const childObj = nodeToObject(childElement)
      
      if (children[childName]) {
        if (!Array.isArray(children[childName])) {
          children[childName] = [children[childName]]
        }
        children[childName].push(childObj)
      } else {
        children[childName] = childObj
      }
    }
  }
  
  // Mesclar children com obj
  Object.assign(obj, children)
  
  return obj
}

/**
 * Valida XML contra um namespace específico
 * @param xmlString String XML
 * @param namespace Namespace esperado
 * @returns true se o XML pertence ao namespace
 */
export function validateNamespace(xmlString: string, namespace: string): boolean {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    const rootElement = doc.documentElement
    
    return rootElement.namespaceURI === namespace ||
           rootElement.getAttribute('xmlns') === namespace
  } catch (error) {
    console.error('Erro ao validar namespace:', error)
    return false
  }
}
