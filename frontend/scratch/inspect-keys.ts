import fs from 'fs';
import path from 'path';

const curriculumDir = 'd:/petalpath/PETALPATH_app_v2.0/curriculum/cbse';
const files = ['prenursery.json', 'nursery.json', 'lkg.json', 'ukg.json'];

for (const file of files) {
  const filePath = path.join(curriculumDir, file);
  if (!fs.existsSync(filePath)) continue;
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`=== FILE: ${file} ===`);
  console.log('Grade Keys:', Object.keys(content.grade || {}));
  console.log('Theme Keys (first theme):', Object.keys(content.themes?.[0] || {}));
  const node = content.themes?.[0]?.nodes?.[0];
  if (node) {
    console.log('Node Keys:', Object.keys(node));
    console.log('Node Activity Keys (first):', Object.keys(node.activities?.[0] || {}));
    console.log('Node Reward Keys:', Object.keys(node.reward || {}));
    console.log('Node Mastery Keys:', Object.keys(node.mastery || {}));
    console.log('Node Curriculum Keys:', Object.keys(node.curriculum || {}));
  }
  console.log();
}
