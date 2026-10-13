# Help Desk

This workspace contains two independent TypeScript applications:

- `frontend/` — React application built with Vite
- `backend/` — Node.js API built with Express

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10+

## Get started

Install the dependencies after network access to the npm registry is available:

```powershell
npm install --prefix frontend
npm install --prefix backend
```

Run each application in a separate terminal:

```powershell
npm run dev --prefix backend
npm run dev --prefix frontend
```

The frontend is served at `http://localhost:5173` and proxies `/api` requests to the backend at `http://localhost:3000`. Check the API with `http://localhost:3000/api/health`.

## Production builds

```powershell
npm run build --prefix frontend
npm run build --prefix backend
npm run start --prefix backend
```

