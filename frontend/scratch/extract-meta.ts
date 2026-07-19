import fs from 'fs';
import path from 'path';

const curriculumDir = 'd:/petalpath/PETALPATH_app_v2.0/curriculum/cbse';
const files = ['prenursery.json', 'nursery.json', 'lkg.json', 'ukg.json'];

const subjects = new Set<string>();
const months = new Set<string>();

for (const file of files) {
  const filePath = path.join(curriculumDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    continue;
  }
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  for (const theme of content.themes || []) {
    for (const node of theme.nodes || []) {
      if (node.curriculum) {
        if (node.curriculum.subject) {
          subjects.add(node.curriculum.subject);
        }
        if (node.curriculum.month) {
          months.add(node.curriculum.month);
        }
      }
    }
  }
}

console.log('UNIQUE SUBJECTS:', Array.from(subjects));
console.log('UNIQUE MONTHS:', Array.from(months));
