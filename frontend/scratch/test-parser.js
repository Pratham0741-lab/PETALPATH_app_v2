import { execSync } from 'child_process';

const PORT = 5000;

try {
  const stdout = execSync(`netstat -ano | findstr :${PORT}`).toString();
  console.log('STDOUT IS:', JSON.stringify(stdout));
  const lines = stdout.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s+/);
    console.log('LINE:', JSON.stringify(line.trim()));
    console.log('PARTS:', parts, 'LENGTH:', parts.length);
    const endsWithPort = parts[1].endsWith(`:${PORT}`);
    console.log('ends with port:', endsWithPort);
    if (parts.length >= 5 && (parts[1].endsWith(`:${PORT}`) || parts[1].includes(`127.0.0.1:${PORT}`) || parts[1].includes(`[::]:${PORT}`))) {
      const pid = parts[parts.length - 1];
      console.log('FOUND PID:', pid);
    }
  }
} catch (err) {
  console.log('ERROR:', err);
}
