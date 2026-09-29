import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const order=['config','navigation','simulation','save','scene','render','input','ui','main'];
const pieces=[];
for(const name of order){
 const source=await readFile(path.join(root,'src',name+'.js'),'utf8');
 const stripped=source.replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'');
 if(/^(import|export)\s/m.test(stripped))throw new Error(`Unsupported import/export in ${name}`);
 pieces.push(`\n// src/${name}.js\n${stripped}`);
}
const bundle=`'use strict';\n(()=>{${pieces.join('\n')}\n})();`;
new vm.Script(bundle,{filename:'arena.bundle.js'});
const template=await readFile(path.join(root,'index.html'),'utf8');
let html=template;
for(const css of ['style','visual'])html=html.replace(`<link rel="stylesheet" href="./src/${css}.css">`,`<style>\n${await readFile(path.join(root,'src',css+'.css'),'utf8')}\n</style>`);
html=html.replace('<script type="module" src="./src/main.js"></script>',`<script>\n${bundle.replace(/<\/script/gi,'<\\/script')}\n</script>`);
await rm(path.join(root,'dist'),{recursive:true,force:true});
await mkdir(path.join(root,'dist/assets'),{recursive:true});
const assets=['arena-cenario.png','arena-mapa.png','gerente.png','roupeiro.png','torcedor-verde.png','torcedor-roxo.png','torcedor-dourado.png','icon.svg'];
const embedded={};
for(const name of assets){
 await cp(path.join(root,'assets',name),path.join(root,'dist/assets',name));
 const mime=name.endsWith('.svg')?'image/svg+xml':'image/png';
 embedded[name]=`data:${mime};base64,${(await readFile(path.join(root,'assets',name))).toString('base64')}`;
}
await writeFile(path.join(root,'dist/index.html'),html);
const single=html.replace('<script>',`<script>\nglobalThis.ARENA_ASSETS=${JSON.stringify(embedded)};\n`).replace('href="./assets/icon.svg"',`href="${embedded['icon.svg']}"`);
await writeFile(path.join(root,'JOGAR.html'),single);
console.log(`Production: dist/index.html + ${assets.length} image assets. Standalone: JOGAR.html (${Math.round(Buffer.byteLength(single)/1024)} KiB).`);
