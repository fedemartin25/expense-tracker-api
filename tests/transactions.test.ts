
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { pool } from "../src/db.js";

describe("API - transacciones", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("debe registrar una transacción de prueba", async () => {
    const response = await request(app)
      .post("/api/transactions")
      .send({
        description: "Test automático",
        amount: 1250.50,
        type: "expense",
        categoryId: 1,
        transactionDate: "2026-10-11",
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe(
      "Movimiento registrado correctamente."
    );
    expect(response.body.transaction).toHaveProperty("id");
    expect(response.body.transaction.description).toBe("Test automático");
    expect(Number(response.body.transaction.amount)).toBe(1250.50);
    expect(response.body.transaction.type).toBe("expense");
    expect(response.body.transaction.transactionDate).toBe("2026-10-11");
  });

  
  it("debe devolver la lista de transacciones", async () => {
    const response = await request(app).get("/api/transactions");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("total");
    expect(typeof response.body.total).toBe("number");
    expect(Array.isArray(response.body.transactions)).toBe(true);

    expect(
      response.body.transactions.some(
        (transaction: { description: string }) =>
          transaction.description === "Test automático"
      )
    ).toBe(true);
  });
});