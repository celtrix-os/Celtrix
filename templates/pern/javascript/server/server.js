import express from "express";
import dotenv from "dotenv";
import { Client } from 'pg'

dotenv.config();

const app = express();

const pgUri = process.env.PG_URI;
const port = process.env.PORT || 5000;

app.use(express.json());

if (!pgUri) {
  console.warn("⚠️  No Postgres URI provided. Skipping DB connection. You can set it in .env later.");
  app.listen(port, () => console.log(`Server running without DB on port ${port}`));
} else {
  const client = new Client({
    user: env.process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
   });
  client.connect()
    .then(() => {
      console.log("PostgreSQL connected");
      app.listen(port, () => console.log(`Server running on port ${port}`));
    })
    .catch((err) => {
      console.error("PostgreSQL connection failed:", err.message);
      app.listen(port, () => console.log(`Server running without DB on port ${port}`));
    });
}






