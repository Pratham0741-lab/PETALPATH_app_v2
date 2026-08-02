import * as fs from 'fs';
import * as path from 'path';

interface Activity {
  type: string;
  name?: string;
}

interface Node {
  id: string;
  subject?: string;
  activities?: Activity[];
}

interface Theme {
  id: string;
  title: string;
  nodes: Node[];
}

interface GradeFile {
  grade: { id: string; name: string };
  themes: Theme[];
}

interface DragDropEntry {
  grade: string;
  gradeFile: string;
  theme: string;
  themeTitle: string;
  nodeId: string;
  activityIndex: number;
  activityName: string;
  subject: string;
}

const cbseDir = path.join(__dirname, '..', 'curriculum', 'cbse');
const gradeFiles = ['prenursery.json', 'nursery.json', 'lkg.json', 'ukg.json'];
const allDragDrop: DragDropEntry[] = [];

for (const gf of gradeFiles) {
  const raw = fs.readFileSync(path.join(cbseDir, gf), 'utf8');
  const data: GradeFile = JSON.parse(raw);
  const gradeName = data.grade.name;

  for (const theme of data.themes) {
    for (const node of theme.nodes) {
      if (!node.activities) continue;
      for (let i = 0; i < node.activities.length; i++) {
        if (node.activities[i].type === 'drag_drop') {
          allDragDrop.push({
            grade: gradeName,
            gradeFile: gf,
            theme: theme.id,
            themeTitle: theme.title,
            nodeId: node.id,
            activityIndex: i,
            activityName: node.activities[i].name || '',
            subject: node.subject || '',
          });
        }
      }
    }
  }
}

console.log(JSON.stringify({ total: allDragDrop.length, activities: allDragDrop }, null, 2));
