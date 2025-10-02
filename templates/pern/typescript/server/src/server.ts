import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
});

app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("select 1 as ok");
    res.json({ ok: true, db: result.rows[0]?.ok === 1 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

app.get("/api/todos", async (_req: Request, res: Response) => {
  try {
    await pool.query(
      "create table if not exists todos (id serial primary key, title text not null, done boolean not null default false)"
    );
    const { rows } = await pool.query("select id, title, done from todos order by id desc");
    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

app.post("/api/todos", async (req: Request, res: Response) => {
  try {
    const { title } = req.body as { title?: string };
    if (!title) return res.status(400).json({ error: "title is required" });
    const { rows } = await pool.query(
      "insert into todos(title) values($1) returning id, title, done",
      [title]
    );
    res.status(201).json(rows[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});



