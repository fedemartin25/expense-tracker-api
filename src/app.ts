
import express from "express";
import dotenv from "dotenv";
import { pool } from "./db.js";
import transactionsRouter from "./routes/transactions.js";

dotenv.config();

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Expense Tracker API",
    version: "1.0.0",
    status: "running",
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS server_time"
    );

    res.json({
      status: "connected",
      database: result.rows[0].database,
      serverTime: result.rows[0].server_time,
    });
  } catch (error) {
    console.error("Error al conectar con PostgreSQL:", error);

    res.status(503).json({
      status: "error",
      message: "No se pudo conectar con la base de datos.",
    });
  }
});

app.use("/api/transactions", transactionsRouter);

export default app;