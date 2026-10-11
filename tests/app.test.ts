
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("API - ruta principal", () => {
  it("debe devolver el nombre y el estado de la API", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Expense Tracker API",
      version: "1.0.0",
      status: "running",
    });
  });
});

describe("API - estado del servicio", () => {
  it("debe indicar que la API está funcionando", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.timestamp).toBeDefined();
  });
});

describe("API - conexión a la base de datos", () => {
  it("debe confirmar la conexión con PostgreSQL", async () => {
    const response = await request(app).get("/api/health/db");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("connected");
    expect(response.body.database).toBe("expense_tracker_test");
    expect(response.body.serverTime).toBeDefined();
  });
});