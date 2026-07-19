import { roadmapService } from './modules/roadmap/roadmap.service.js';

async function main() {
  console.log('--- TESTING GET ROADMAP FOR AARAV ---');
  try {
    const rm = await roadmapService.getRoadmap('5de0701c-938d-4236-94f3-dc8fe2f88fc6');
    console.log('Roadmap title:', rm.grade);
    console.log('Themes count:', rm.themes.length);
    console.log('Nodes count:', rm.nodes.length);
    console.log('First 5 nodes:', rm.nodes.slice(0, 5));
    console.log('currentNode:', rm.currentNode);
  } catch (err) {
    console.error(err);
  }
}

main();
