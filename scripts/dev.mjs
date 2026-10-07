import { spawn } from 'node:child_process';

function runNpm(workspace) {
  const npmArguments = ['run', 'dev', `--workspace=${workspace}`];

  if (process.platform === 'win32') {
    return spawn(
      process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe',
      ['/d', '/s', '/c', `npm ${npmArguments.join(' ')}`],
      { stdio: 'inherit' },
    );
  }

  return spawn('npm', npmArguments, { stdio: 'inherit' });
}

const processes = [runNpm('server'), runNpm('client')];

let isStopping = false;

function stop(exitCode = 0) {
  if (isStopping) return;
  isStopping = true;
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
  process.exit(exitCode);
}

for (const child of processes) {
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!isStopping && code !== 0) stop(code ?? 1);
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
