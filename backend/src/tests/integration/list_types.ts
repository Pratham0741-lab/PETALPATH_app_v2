import fs from 'fs';
import path from 'path';

const cbseDir = path.join(process.cwd(), '..', 'curriculum', 'cbse');
const files = ['prenursery.json', 'nursery.json', 'lkg.json', 'ukg.json'];

const types = new Set<string>();
for (const file of files) {
  const filePath = path.join(cbseDir, file);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    for (const theme of data.themes || []) {
      for (const node of theme.nodes || []) {
        for (const act of node.activities || []) {
          types.add(act.type);
        }
      }
    }
  }
}

console.log('All activity types:', Array.from(types));
