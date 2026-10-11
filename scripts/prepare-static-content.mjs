import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const source = resolve(root, 'articles');
const destination = resolve(root, 'public/articles');
const dataDirectory = resolve(root, 'src/data');
const output = resolve(dataDirectory, 'publications.json');
const accepted = new Set(['.html', '.htm', '.pdf']);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    if (entry.isFile() && accepted.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
}

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true }).catch(() => {});

const groups = new Map();
for (const file of await walk(source)) {
  const filePath = relative(source, file).split('\\').join('/');
  const extension = extname(filePath).toLowerCase();
  const key = filePath.slice(0, -extension.length);
  const item = groups.get(key) ?? { key, title: key.split('/').pop().replaceAll(/[-_]/g, ' '), html: null, pdf: null };
  if (extension === '.pdf') item.pdf = filePath;
  else item.html = filePath;
  groups.set(key, item);
}
const publications = [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
await mkdir(dataDirectory, { recursive: true });
await writeFile(output, `${JSON.stringify(publications, null, 2)}\n`);
console.log(`Prepared ${publications.length} publication record(s).`);
