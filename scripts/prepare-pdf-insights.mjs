import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const source = resolve(root, 'insights');
const destination = resolve(root, 'public/insights');
const output = resolve(root, 'src/data/pdf-insights.json');
const areas = {
  'sustainability-climate-change': 'Sustainability & Climate Change',
  'geospatial-intelligence': 'Geospatial Intelligence',
  'biodiversity-nature': 'Biodiversity & Nature',
  'circular-economy': 'Circular Economy',
  'carbon-markets-methodologies': 'Carbon Markets & Methodologies'
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    if (entry.isFile() && extname(entry.name).toLowerCase() === '.pdf') files.push(path);
  }
  return files;
}

const titleFrom = (file) => file.replace(/\.pdf$/i, '').replace(/^\d{4}-\d{2}-\d{2}[-_]?/, '').replaceAll(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateFrom = (file) => /^\d{4}-\d{2}-\d{2}/.exec(file)?.[0] ?? null;

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true }).catch(() => {});

const insights = [];
for (const file of await walk(source)) {
  const path = relative(source, file).split('\\').join('/');
  const [areaKey] = path.split('/');
  if (!areas[areaKey]) {
    console.warn(`Skipped ${path}: place PDFs inside one of the five area folders.`);
    continue;
  }
  insights.push({ title: titleFrom(path.split('/').at(-1)), date: dateFrom(path.split('/').at(-1)), areaKey, area: areas[areaKey], file: path });
}
insights.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')) || a.title.localeCompare(b.title));
await writeFile(output, `${JSON.stringify(insights, null, 2)}\n`);
console.log(`Prepared ${insights.length} PDF insight(s).`);
