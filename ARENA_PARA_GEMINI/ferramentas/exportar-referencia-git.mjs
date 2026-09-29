#!/usr/bin/env node
/** Read-only export of committed gameplay sources. No fetch, checkout, commit or push. */
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function git(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], {
    encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw new Error(`Git indisponível: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Git recusou a leitura: ${(result.stderr || '').trim()}`);
  return result.stdout.trim();
}

try {
  const { values } = parseArgs({ options: {
    repo: { type: 'string' }, ref: { type: 'string', default: '0279da1a936982094e018ca70385ebe6db0a7c9e' },
    out: { type: 'string' }, help: { type: 'boolean', default: false },
  } });
  if (values.help) {
    console.log('node exportar-referencia-git.mjs --repo "C:\\projetos\\futbol_ready" --ref HEAD --out "C:\\backups\\arena"');
    process.exit(0);
  }
  if (!values.repo || !values.out) throw new Error('Informe --repo e --out. Use --help para o exemplo.');
  if (!/^[A-Za-z0-9][A-Za-z0-9._/~-]{0,150}$/.test(values.ref)) throw new Error('Ref inválida. Use SHA, HEAD ou nome de branch simples.');
  const repo = realpathSync(values.repo);
  const top = realpathSync(git(repo, ['rev-parse', '--show-toplevel']));
  const out = path.resolve(values.out);
  const relative = path.relative(top, out);
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Escolha --out fora da pasta do repositório para preservar a árvore de trabalho.');
  }
  const sha = git(repo, ['rev-parse', '--verify', `${values.ref}^{commit}`]);
  if (!/^[0-9a-f]{40,64}$/.test(sha)) throw new Error('O Git não retornou um commit válido.');
  const roots = new Set(git(repo, ['ls-tree', '--name-only', sha]).split('\n'));
  const candidates = ['src', 'tests', 'package.json', 'pnpm-lock.yaml', 'package-lock.json',
    'tsconfig.json', 'vitest.config.ts', 'vitest.config.mts', 'PLANEJAMENTO.md', 'README.md', 'CLAUDE.md', 'GEMINI.md'];
  const paths = candidates.filter(p => roots.has(p));
  if (!paths.includes('src')) throw new Error('Não foi encontrada a pasta src no commit solicitado.');
  const stem = `jogabilidade-${sha.slice(0,12)}`;
  const archive = path.join(out, `${stem}.zip`);
  const record = path.join(out, `${stem}.json`);
  if (existsSync(archive) || existsSync(record)) throw new Error('O destino já existe; escolha outra pasta. Nada foi sobrescrito.');
  mkdirSync(out, { recursive: true });
  git(repo, ['archive', '--format=zip', `--output=${archive}`, sha, '--', ...paths]);
  writeFileSync(record, JSON.stringify({ commit: sha, paths, archive: path.basename(archive),
    scope: 'Fontes commitadas; sem arte antiga, node_modules, .env ou mudanças não commitadas.',
    operation: 'Somente leitura do Git; nenhum checkout, fetch, commit ou push.' }, null, 2) + '\n');
  console.log(`Snapshot criado: ${archive}\nCommit: ${sha}\nÁrvore Git original inalterada.`);
} catch (error) {
  console.error(`Não foi possível exportar: ${error.message}`);
  process.exitCode = 1;
}
