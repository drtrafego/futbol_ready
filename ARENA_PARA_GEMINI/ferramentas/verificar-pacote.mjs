#!/usr/bin/env node
/** Verify the bytes of the delivered package. Run before editing files. */
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
try {
  const manifest = JSON.parse(readFileSync(path.join(root, 'MANIFESTO_SHA256.json'), 'utf8'));
  if (!Array.isArray(manifest.files)) throw new Error('Manifesto sem lista de arquivos.');
  for (const entry of manifest.files) {
    try {
      if (typeof entry.path !== 'string' || entry.path.includes('\\') ||
          path.isAbsolute(entry.path) || entry.path.split('/').includes('..')) throw new Error('Caminho inválido');
      const file = path.join(root, entry.path);
      if (!statSync(file).isFile()) throw new Error('Não é arquivo');
      const bytes = readFileSync(file);
      const sha = createHash('sha256').update(bytes).digest('hex');
      if (sha !== entry.sha256 || bytes.length !== entry.bytes) throw new Error('Conteúdo diferente');
    } catch (error) {
      failures++; console.error(`FALHA ${entry.path}: ${error.message}`);
    }
  }
  if (failures) process.exitCode = 1;
  else console.log(`Integridade conferida: ${manifest.files.length} arquivos. Isso não testa as futuras funcionalidades.`);
} catch (error) {
  console.error(`Falha ao ler manifesto: ${error.message}`); process.exitCode = 1;
}
