import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateCatalog} from '../src/catalog.js';
const root = fileURLToPath(new URL('../',import.meta.url));
validateCatalog(JSON.parse(await readFile(path.join(root,'data/projects.json'),'utf8')));
const files = ['index.html','styles.css','src/app.js','src/catalog.js','data/projects.json'];
for (const entry of await readdir(path.join(root,'assets'),{withFileTypes:true})) {
  if (entry.isFile() && /\.(svg|png|jpg|jpeg|webp)$/.test(entry.name)) files.push('assets/'+entry.name);
}
// Output is an allowlist: docs, tests, credentials and development scripts are never copied.
const walk = async dir => (await Promise.all((await readdir(dir,{withFileTypes:true})).map(async e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.relative(path.join(root,'dist'),path.join(dir,e.name)).replaceAll('\\','/')]))).flat();
await mkdir(path.join(root,'dist'),{recursive:true});
const extra = (await walk(path.join(root,'dist'))).filter(f => !files.includes(f));
if(extra.length) throw new Error('dist에 이전 또는 허용되지 않은 파일이 있습니다. 해당 파일을 별도로 옮긴 후 다시 빌드하세요: '+extra.join(', '));
for(const file of files) {
  const target = path.join(root,'dist',file);
  await mkdir(path.dirname(target),{recursive:true});
  await writeFile(target,await readFile(path.join(root,file)));
}
console.log(`배포 파일 ${files.length}개 준비 완료: dist/`);
