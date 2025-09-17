/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações de produção
  eslint: {
    ignoreDuringBuilds: false, // Habilitar ESLint em produção
  },
  typescript: {
    ignoreBuildErrors: false, // Habilitar verificação TypeScript em produção
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Fallbacks para APIs Node.js no lado cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        util: false,
        crypto: false,
        stream: false,
        buffer: false,
      }
    }
    
    // Ignorar warnings de dependências críticas
    config.ignoreWarnings = [
      { module: /node_modules\/node-forge/ },
      { module: /node_modules\/xmldom/ },
      { file: /components\/lazy-module-loader/ },
      // Suprimir avisos de "Critical dependency: the request of a dependency is an expression"
      (warning) => {
        if (warning.message.includes('Critical dependency: the request of a dependency is an expression')) {
          return true
        }
        return false
      },
    ]
    
    // Configurações adicionais para suprimir avisos de imports dinâmicos
    config.module.parser = {
      ...config.module.parser,
      javascript: {
        ...config.module.parser?.javascript,
        exprContextCritical: false,
        wrappedContextCritical: false,
      },
    }
    
    return config
  },
}

export default nextConfig
