# River

River is a collaborative scratchpad with real-time sync and file upload support.

Live: https://myriver.onrender.com

## Development

1. Start infrastructure:

```bash
docker compose up -d postgres redis
```

2. Backend:

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp ../.env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

3. Frontend:

```bash
cd frontend
npm install
npm run dev
```



