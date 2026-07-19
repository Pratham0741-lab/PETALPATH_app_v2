import { execSync } from 'child_process';
import process from 'process';

const PORT = 5000;

try {
  if (process.platform === 'win32') {
    // Find PID of process listening on PORT
    const stdout = execSync(`netstat -ano | findstr :${PORT}`).toString();
    const lines = stdout.split('\n');
    const pids = new Set();
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      // Ensure the local address ends with the port
      if (parts.length >= 5 && (parts[1].endsWith(`:${PORT}`) || parts[1].includes(`127.0.0.1:${PORT}`) || parts[1].includes(`[::]:${PORT}`))) {
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(Number(pid))) {
          pids.add(pid);
        }
      }
    }
    
    for (const pid of pids) {
      console.log(`[PetalPath] Port ${PORT} in use by PID ${pid}. Terminating process...`);
      try {
        execSync(`taskkill /F /PID ${pid}`);
      } catch (err) {
        // Process might have exited already
      }
    }
  } else {
    try {
      execSync(`lsof -t -i:${PORT} | xargs kill -9`);
      console.log(`[PetalPath] Terminated processes using port ${PORT}.`);
    } catch (err) {
      // No process listening or command failed
    }
  }
} catch (error) {
  // netstat returns exit code 1 if findstr finds no match. That is completely normal.
}
