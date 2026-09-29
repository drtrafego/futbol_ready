import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: path.resolve(__dirname),
  webpack: (config) => {
    // Esta pasta fica dentro do Google Drive espelhado: o cliente do Drive
    // trava/renomeia arquivo do cache do webpack no meio da escrita e corrompe
    // o build (erro "__webpack_modules__[moduleId] is not a function").
    // Cache em disco desligado pra eliminar essa corrida de arquivo.
    config.cache = false;
    return config;
  },
};

export default nextConfig;
