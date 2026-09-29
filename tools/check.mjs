import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let count=0;
for(const folder of ['src','tools','tests'])for(const name of await readdir(path.join(root,folder))){
  if(!/\.(m?js)$/.test(name))continue;
  const result=spawnSync(process.execPath,['--check',path.join(root,folder,name)],{encoding:'utf8'});
  if(result.status!==0){console.error(result.stderr);process.exit(1);}count++;
}
console.log(`${count} arquivos JavaScript passaram na verificação de sintaxe.`);
