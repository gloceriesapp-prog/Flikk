import { createServer, type RequestListener, type Server } from 'node:http';

type Cleanup = () => Promise<void>;

export function startupMessage(error: unknown, port: number): string {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === 'EADDRINUSE'
    ? `Port ${port} is already in use. Keep the existing backend running, or stop it in its terminal before restarting. The API port has not been changed.`
    : code === 'EACCES'
      ? `Permission denied binding port ${port}. Choose an accessible PORT.`
      : `Backend startup failed: ${error instanceof Error ? error.message : String(error)}`;
}

// The actual listen operation owns the port; a development preflight alone
// cannot prevent another process claiming it between the check and startup.
export async function startServer(
  app: RequestListener,
  port: number,
  startBackground: () => Cleanup,
): Promise<{ server: Server; stop: Cleanup }> {
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    const failed = (error: Error) => { server.off('listening', ready); reject(error); };
    const ready = () => { server.off('error', failed); resolve(); };
    server.once('error', failed);
    server.once('listening', ready);
    server.listen(port);
  });

  let cleanup: Cleanup;
  try { cleanup = startBackground(); }
  catch (error) { await closeServer(server); throw error; }
  let stopping: Promise<void> | undefined;
  return {
    server,
    stop: () => stopping ??= (async () => {
      // Stop accepting connections immediately. Cleanup ends SSE streams and
      // prevents new jobs; ordinary in-flight requests are allowed to finish.
      const closed = closeServer(server);
      await Promise.all([closed, cleanup()]);
    })(),
  };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeIdleConnections();
  });
}
