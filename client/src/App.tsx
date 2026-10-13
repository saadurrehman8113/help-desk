import { useEffect, useState } from 'react';

export function App() {
  const [status, setStatus] = useState('Checking API connection…');
  const [connected, setConnected] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('Checking API connection…');
    setConnected(false);
    async function check() {
      try {
        const response = await fetch('/api/health', { signal: controller.signal });
        if (!response.ok) throw new Error('API request failed');
        const data: unknown = await response.json();
        if (typeof data !== 'object' || data === null || !('status' in data) || data.status !== 'ok') {
          throw new Error('Unexpected API response');
        }
        setConnected(true);
        setStatus('Express API is connected');
      } catch {
        if (!controller.signal.aborted) setStatus('Cannot connect to the API. Make sure the server is running.');
      }
    }
    void check();
    return () => controller.abort();
  }, [attempt]);

  return (
    <main>
      <div className="brand">HD <span>Help Desk</span></div>
      <section>
        <p className="eyebrow">PROJECT FOUNDATION</p>
        <h1>A better home for<br />customer support.</h1>
        <p className="intro">Your React and Express workspace is ready. Build ticket workflows, connect your database, and bring your help desk to life.</p>
        <div className="connection" role="status"><span className={connected ? 'dot online' : 'dot'} />{status}</div>
        <button onClick={() => setAttempt(value => value + 1)}>Check connection</button>
      </section>
      <div className="stack">
        <article><span>01 / FRONTEND</span><h2>React</h2><p>Vite development server and a typed component foundation.</p></article>
        <article><span>02 / BACKEND</span><h2>Express</h2><p>A modular API with health checks and consistent error responses.</p></article>
        <article><span>03 / LANGUAGE</span><h2>TypeScript</h2><p>Strict type checking across both applications.</p></article>
      </div>
    </main>
  );
}
