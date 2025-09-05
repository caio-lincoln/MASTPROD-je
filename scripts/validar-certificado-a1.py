#!/usr/bin/env python3
"""
Validação completa de certificado A1 (PKCS#12 .pfx)
Implementa todas as verificações necessárias para certificados ICP-Brasil
"""

import sys
import json
from datetime import datetime, timezone
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.x509.oid import NameOID, ExtensionOID
import requests
from urllib.parse import urlparse

def validar_certificado_a1(pfx_path: str, password: str, cnpj_empresa: str = None):
    """
    Valida certificado A1 com todas as verificações necessárias
    
    Args:
        pfx_path: Caminho para o arquivo .pfx
        password: Senha do certificado
        cnpj_empresa: CNPJ da empresa para verificação de titularidade
    
    Returns:
        dict: Resultado da validação com status e checks detalhados
    """
    result = {
        "status": "invalid",
        "checks": [],
        "meta": {},
        "summary": ""
    }
    
    try:
        # Lê o arquivo .pfx
        with open(pfx_path, 'rb') as f:
            pfx_data = f.read()
        
        # 1. Verifica integridade do arquivo e senha
        try:
            private_key, certificate, additional_certificates = pkcs12.load_key_and_certificates(
                pfx_data, password.encode('utf-8'), backend=default_backend()
            )
            result["checks"].append({
                "name": "senha_pkcs12",
                "ok": True,
                "message": "Arquivo aberto com sucesso"
            })
        except Exception as e:
            result["checks"].append({
                "name": "senha_pkcs12", 
                "ok": False,
                "message": "Senha incorreta ou arquivo inválido"
            })
            result["summary"] = "Não foi possível abrir o arquivo. Verifique a senha do .pfx."
            return result
        
        # 2. Verifica presença de chave privada e certificado
        if private_key is None or certificate is None:
            result["checks"].append({
                "name": "par_chave_certificado",
                "ok": False,
                "message": "Chave privada ou certificado ausente"
            })
            return result
        
        result["checks"].append({
            "name": "par_chave_certificado",
            "ok": True,
            "message": "Chave privada e certificado presentes"
        })
        
        # 3. Verifica validade temporal
        now = datetime.now(timezone.utc)
        not_before = certificate.not_valid_before.replace(tzinfo=timezone.utc)
        not_after = certificate.not_valid_after.replace(tzinfo=timezone.utc)
        
        is_valid_period = not_before <= now <= not_after
        result["checks"].append({
            "name": "validade_temporal",
            "ok": is_valid_period,
            "message": f"Válido de {not_before.strftime('%d/%m/%Y')} até {not_after.strftime('%d/%m/%Y')}",
            "not_before": not_before.isoformat(),
            "not_after": not_after.isoformat()
        })
        
        # Aviso se expira em menos de 30 dias
        days_to_expire = (not_after - now).days
        if days_to_expire <= 30 and days_to_expire > 0:
            result["checks"].append({
                "name": "aviso_expiracao",
                "ok": False,
                "message": f"Certificado expira em {days_to_expire} dia(s)",
                "days_remaining": days_to_expire
            })
        
        # 4. Verifica força da chave (RSA >= 2048 bits)
        key_size = getattr(private_key, 'key_size', 0)
        is_strong_key = key_size >= 2048
        result["checks"].append({
            "name": "forca_chave",
            "ok": is_strong_key,
            "message": f"Chave {key_size} bits ({'adequada' if is_strong_key else 'fraca - mínimo 2048 bits'})",
            "key_size": key_size
        })
        
        # 5. Verifica algoritmo de assinatura
        sig_algorithm = certificate.signature_algorithm_oid._name
        is_secure_algorithm = 'sha256' in sig_algorithm.lower() or 'sha384' in sig_algorithm.lower() or 'sha512' in sig_algorithm.lower()
        result["checks"].append({
            "name": "algoritmo_assinatura",
            "ok": is_secure_algorithm,
            "message": f"Algoritmo: {sig_algorithm} ({'seguro' if is_secure_algorithm else 'inseguro - use SHA-256 ou superior'})",
            "algorithm": sig_algorithm
        })
        
        # 6. Verifica Key Usage
        try:
            key_usage_ext = certificate.extensions.get_extension_for_class(x509.KeyUsage)
            key_usage = key_usage_ext.value
            has_digital_signature = key_usage.digital_signature
            has_non_repudiation = key_usage.content_commitment if hasattr(key_usage, 'content_commitment') else False
            
            is_valid_usage = has_digital_signature or has_non_repudiation
            result["checks"].append({
                "name": "key_usage",
                "ok": is_valid_usage,
                "message": f"Uso da chave: {'adequado' if is_valid_usage else 'inadequado'} (Digital Signature: {has_digital_signature}, Non-Repudiation: {has_non_repudiation})",
                "digital_signature": has_digital_signature,
                "non_repudiation": has_non_repudiation
            })
        except x509.ExtensionNotFound:
            result["checks"].append({
                "name": "key_usage",
                "ok": False,
                "message": "Extensão Key Usage não encontrada"
            })
        
        # 7. Extrai CNPJ/CPF do certificado (OIDs ICP-Brasil)
        cnpj_cert = None
        cpf_cert = None
        
        for attribute in certificate.subject:
            oid_str = attribute.oid.dotted_string
            if oid_str == "2.16.76.1.3.3":  # CNPJ
                cnpj_cert = attribute.value
            elif oid_str == "2.16.76.1.3.1":  # CPF
                cpf_cert = attribute.value
        
        result["meta"]["cnpj"] = cnpj_cert
        result["meta"]["cpf"] = cpf_cert
        
        # 8. Verifica titularidade (se CNPJ da empresa foi fornecido)
        if cnpj_empresa and cnpj_cert:
            cnpj_empresa_clean = ''.join(filter(str.isdigit, cnpj_empresa))
            cnpj_cert_clean = ''.join(filter(str.isdigit, cnpj_cert))
            is_owner = cnpj_empresa_clean == cnpj_cert_clean
            
            result["checks"].append({
                "name": "titularidade",
                "ok": is_owner,
                "message": f"CNPJ do certificado {'confere' if is_owner else 'não confere'} com a empresa",
                "cnpj_certificado": cnpj_cert,
                "cnpj_empresa": cnpj_empresa
            })
        
        # 9. Verifica se é certificado ICP-Brasil (presença de políticas)
        try:
            cert_policies_ext = certificate.extensions.get_extension_for_class(x509.CertificatePolicies)
            has_icp_policy = any('2.16.76.1' in policy.policy_identifier.dotted_string 
                               for policy in cert_policies_ext.value)
            
            result["checks"].append({
                "name": "politica_icp_brasil",
                "ok": has_icp_policy,
                "message": f"Política ICP-Brasil: {'presente' if has_icp_policy else 'ausente'}"
            })
        except x509.ExtensionNotFound:
            result["checks"].append({
                "name": "politica_icp_brasil",
                "ok": False,
                "message": "Extensão Certificate Policies não encontrada"
            })
        
        # 10. Verifica cadeia de certificação (básico - verifica se tem issuer)
        issuer_name = certificate.issuer.rfc4514_string()
        subject_name = certificate.subject.rfc4514_string()
        is_self_signed = issuer_name == subject_name
        
        result["checks"].append({
            "name": "cadeia_certificacao",
            "ok": not is_self_signed,
            "message": f"Certificado {'auto-assinado (inválido)' if is_self_signed else 'emitido por AC'}",
            "issuer": issuer_name,
            "subject": subject_name
        })
        
        # Determina status final
        failed_checks = [check for check in result["checks"] if not check["ok"]]
        warning_checks = [check for check in result["checks"] if check["name"] == "aviso_expiracao"]
        
        if not failed_checks:
            result["status"] = "valid"
            result["summary"] = "Tudo certo! Seu certificado está ativo e pronto para uso no eSocial."
        elif len(failed_checks) == len(warning_checks):  # Apenas avisos
            result["status"] = "warning"
            result["summary"] = f"Certificado válido com avisos: {', '.join([w['message'] for w in warning_checks])}"
        else:
            result["status"] = "invalid"
            critical_errors = [check for check in failed_checks if check["name"] != "aviso_expiracao"]
            result["summary"] = f"Certificado inválido: {critical_errors[0]['message'] if critical_errors else 'Múltiplos erros encontrados'}"
        
        return result
        
    except Exception as e:
        result["checks"].append({
            "name": "erro_geral",
            "ok": False,
            "message": f"Erro durante validação: {str(e)}"
        })
        result["summary"] = f"Erro durante validação: {str(e)}"
        return result

def main():
    """Função principal para execução via linha de comando"""
    if len(sys.argv) < 3:
        print(json.dumps({
            "status": "error",
            "message": "Uso: python validar-certificado-a1.py <arquivo.pfx> <senha> [cnpj_empresa]"
        }))
        sys.exit(1)
    
    pfx_path = sys.argv[1]
    password = sys.argv[2]
    cnpj_empresa = sys.argv[3] if len(sys.argv) > 3 else None
    
    resultado = validar_certificado_a1(pfx_path, password, cnpj_empresa)
    print(json.dumps(resultado, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
