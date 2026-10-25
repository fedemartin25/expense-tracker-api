
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

  
  it("debe rechazar una transacción con importe negativo", async () => {
    const response = await request(app)
      .post("/api/transactions")
      .send({
        description: "Importe inválido",
        amount: -100,
        type: "expense",
        categoryId: 1,
        transactionDate: "2026-10-11",
      });

    expect(response.status).toBe(400);
  });

  
  it("debe rechazar un tipo de movimiento inválido", async () => {
    const response = await request(app)
      .post("/api/transactions")
      .send({
        description: "Tipo inválido",
        amount: 100,
        type: "transfer",
        categoryId: 1,
        transactionDate: "2026-10-11",
      });

    expect(response.status).toBe(400);
  });

  
  it("debe rechazar una transacción sin descripción", async () => {
    const response = await request(app)
      .post("/api/transactions")
      .send({
        description: "",
        amount: 100,
        type: "expense",
        categoryId: 1,
        transactionDate: "2026-10-11",
      });

    expect(response.status).toBe(400);
  });

  
  it("debe rechazar una fecha inválida", async () => {
    const response = await request(app)
      .post("/api/transactions")
      .send({
        description: "Fecha inválida",
        amount: 100,
        type: "expense",
        categoryId: 1,
        transactionDate: "2026-02-30",
      });

    expect(response.status).toBe(400);
  });

  it("debe rechazar un ID de categoría inválido", async () => {
    const response = await request(app)
      .post("/api/transactions")
      .send({
        description: "Categoría inválida",
        amount: 100,
        type: "expense",
        categoryId: 0,
        transactionDate: "2026-10-11",
      });

    expect(response.status).toBe(400);
  });
  
  it("debe devolver la primera página de transacciones", async () => {
    const response = await request(app).get(
      "/api/transactions?limit=100"
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("total");
    expect(typeof response.body.total).toBe("number");
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(100);
    expect(response.body.totalPages).toBe(
      Math.ceil(response.body.total / 100)
    );
    expect(Array.isArray(response.body.transactions)).toBe(true);
    expect(response.body.transactions.length).toBeLessThanOrEqual(100);
  });
  
  it("debe permitir elegir la página y el límite", async () => {
    const response = await request(app).get(
      "/api/transactions?page=1&limit=5"
    );

    expect(response.status).toBe(200);
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(5);
    expect(response.body.transactions.length).toBeLessThanOrEqual(5);
    expect(response.body.totalPages).toBe(
      Math.ceil(response.body.total / 5)
    );
  });
  
  it("debe rechazar una página igual a cero", async () => {
    const response = await request(app).get(
      "/api/transactions?page=0"
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "La página debe ser un entero positivo y el límite debe estar entre 1 y 100."
    );
  });

  it("debe rechazar un límite superior a 100", async () => {
    const response = await request(app).get(
      "/api/transactions?limit=101"
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "La página debe ser un entero positivo y el límite debe estar entre 1 y 100."
    );
  });

  it("debe filtrar las transacciones por tipo de movimiento", async () => {
    const response = await request(app).get(
      "/api/transactions?type=expense"
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.transactions)).toBe(true);

    expect(
      response.body.transactions.every(
        (transaction: { type: string }) => transaction.type === "expense"
      )
    ).toBe(true);
  });

  it("debe filtrar las transacciones por categoría", async () => {
    const response = await request(app).get(
      "/api/transactions?categoryId=1"
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.transactions)).toBe(true);

    expect(
      response.body.transactions.every(
        (transaction: { categoryId: number | string }) =>
          Number(transaction.categoryId) === 1
      )
    ).toBe(true);
  });

  it("debe filtrar las transacciones por rango de fechas", async () => {
    const response = await request(app).get(
      "/api/transactions?from=2026-10-01&to=2026-10-31"
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.transactions)).toBe(true);

    expect(
      response.body.transactions.every(
        (transaction: { transactionDate: string }) => {
          const date = String(transaction.transactionDate).slice(0, 10);
          return date >= "2026-10-01" && date <= "2026-10-31";
        }
      )
    ).toBe(true);
  });

  it("debe combinar los filtros de tipo, categoría y fechas", async () => {
    const response = await request(app).get(
      "/api/transactions?type=expense&categoryId=1&from=2026-10-01&to=2026-10-31"
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.transactions)).toBe(true);

    expect(
      response.body.transactions.every(
        (transaction: {
          type: string;
          categoryId: number | string;
          transactionDate: string;
        }) => {
          const date = String(transaction.transactionDate).slice(0, 10);

          return (
            transaction.type === "expense" &&
            Number(transaction.categoryId) === 1 &&
            date >= "2026-10-01" &&
            date <= "2026-10-31"
          );
        }
      )
    ).toBe(true);
  });

  it("debe actualizar una transacción existente", async () => {
    // Primero creamos una transacción para actualizar.
    const created = await request(app)
      .post("/api/transactions")
      .send({
        description: "Transacción para actualizar",
        amount: 500,
        type: "expense",
        categoryId: 1,
        transactionDate: "2026-10-11",
      });

    expect(created.status).toBe(201);

    const id = created.body.transaction.id;

    // Después actualizamos esa transacción.
    const response = await request(app)
      .put(`/api/transactions/${id}`)
      .send({
        description: "Transacción actualizada",
        amount: 750,
        type: "expense",
        categoryId: 1,
        transactionDate: "2026-10-12",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Movimiento actualizado correctamente."
    );
    expect(response.body.transaction.description).toBe(
      "Transacción actualizada"
    );
    expect(Number(response.body.transaction.amount)).toBe(750);
    expect(response.body.transaction.transactionDate).toBe("2026-10-12");
  });

  it("debe eliminar una transacción existente", async () => {
    const created = await request(app)
      .post("/api/transactions")
      .send({
        description: "Transacción para eliminar",
        amount: 300,
        type: "expense",
        categoryId: 1,
        transactionDate: "2026-10-11",
      });

    expect(created.status).toBe(201);

    const id = created.body.transaction.id;

    const response = await request(app).delete(
      `/api/transactions/${id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "Movimiento eliminado correctamente."
    );
    expect(response.body.id).toBe(id);

    const check = await request(app).get(
      `/api/transactions?categoryId=1`
    );

    expect(
      check.body.transactions.some(
        (transaction: { id: number }) => transaction.id === id
      )
    ).toBe(false);
  });

  it("debe rechazar la actualización con un ID inválido", async () => {
    const response = await request(app)
      .put("/api/transactions/abc")
      .send({
        description: "Movimiento de prueba",
        amount: 100,
        type: "expense",
        categoryId: 1,
        transactionDate: "2026-10-11",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("ID inválido.");
  });

  it("debe devolver 404 al actualizar un movimiento inexistente", async () => {
    const response = await request(app)
      .put("/api/transactions/999999999")
      .send({
        description: "Movimiento inexistente",
        amount: 100,
        type: "expense",
        categoryId: 1,
        transactionDate: "2026-10-11",
      });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe(
      "Movimiento no encontrado."
    );
  });

  it("debe devolver el resumen financiero de un período", async () => {
    const response = await request(app).get(
      "/api/transactions/summary?from=2026-09-01&to=2026-09-30"
    );

    expect(response.status).toBe(200);
    expect(Number(response.body.income)).toBe(0);
    expect(Number(response.body.expenses)).toBe(0);
    expect(Number(response.body.balance)).toBe(0);
    expect(Number(response.body.transactionCount)).toBe(0);
  });

  it("debe rechazar una fecha inválida en el resumen", async () => {
    const response = await request(app).get(
      "/api/transactions/summary?from=2026-02-30&to=2026-03-31"
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "El parámetro from debe tener formato YYYY-MM-DD."
    );
  });

  it("debe rechazar un rango de fechas invertido en el resumen", async () => {
    const response = await request(app).get(
      "/api/transactions/summary?from=2026-10-31&to=2026-10-01"
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "La fecha inicial no puede ser posterior a la final."
    );
  });

});