import { readFile, writeFile } from 'node:fs/promises';

const revision = process.env.GITHUB_SHA;
if (!revision || !/^[0-9a-f]{40}$/u.test(revision)) {
  throw new Error('GITHUB_SHA must contain the full 40-character deployment revision.');
}

for (const file of ['dist/health.json', 'dist/integration.json']) {
  const document = JSON.parse(await readFile(file, 'utf8'));
  document.deploymentRevision = revision;
  await writeFile(file, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
}
