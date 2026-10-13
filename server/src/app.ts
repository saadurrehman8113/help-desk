import './config.js';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'help-desk-api' });
});

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API route not found' });
});

if (process.env.NODE_ENV === 'production') {
  const clientDirectory = fileURLToPath(new URL('../../client/dist/', import.meta.url));
  app.use(express.static(clientDirectory));
  app.get('/{*path}', (_request, response) => response.sendFile(path.join(clientDirectory, 'index.html')));
}

app.use((_request, response) => response.status(404).json({ error: 'Route not found' }));

const handleError: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  if (typeof error === 'object' && error !== null && 'status' in error && error.status === 413) {
    response.status(413).json({ error: 'Request body too large' });
    return;
  }
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
};
app.use(handleError);
