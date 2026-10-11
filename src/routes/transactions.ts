
import { Request, Response, Router } from "express";
import { pool } from "../db.js";

const router = Router();

const validTypes = ["income", "expense"] as const;

// GET /api/transactions
// Consultar movimientos

router.get("/", async (req: Request, res: Response) => {
  const { type, categoryId, from, to } = req.query;

  if (
    type !== undefined &&
    type !== "income" &&
    type !== "expense"
  ) {
    res.status(400).json({
      message: "El tipo debe ser income o expense.",
    });
    return;
  }

  let parsedCategoryId: number | undefined;

  if (categoryId !== undefined) {
    parsedCategoryId = Number(categoryId);

    if (
      !Number.isSafeInteger(parsedCategoryId) ||
      parsedCategoryId <= 0
    ) {
      res.status(400).json({
        message: "El ID de categoría debe ser un entero positivo.",
      });
      return;
    }
  }

  const isValidDate = (value: unknown): value is string =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

  if (from !== undefined && !isValidDate(from)) {
    res.status(400).json({
      message: "El parámetro from debe tener formato YYYY-MM-DD.",
    });
    return;
  }

  if (to !== undefined && !isValidDate(to)) {
    res.status(400).json({
      message: "El parámetro to debe tener formato YYYY-MM-DD.",
    });
    return;
  }

  if (from && to && String(from) > String(to)) {
    res.status(400).json({
      message: "La fecha inicial no puede ser posterior a la final.",
    });
    return;
  }

  try {
    const values: unknown[] = [];
    const conditions: string[] = [];

    if (type) {
      values.push(type);
      conditions.push(`t.type = $${values.length}`);
    }

    if (parsedCategoryId !== undefined) {
      values.push(parsedCategoryId);
      conditions.push(`t.category_id = $${values.length}`);
    }

    if (from) {
      values.push(from);
      conditions.push(`t.transaction_date >= $${values.length}`);
    }

    if (to) {
      values.push(to);
      conditions.push(`t.transaction_date <= $${values.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const result = await pool.query(
      `SELECT
         t.id,
         t.description,
         t.amount,
         t.type,
         t.category_id AS "categoryId",
         c.name AS "categoryName",
         to_char(t.transaction_date, 'YYYY-MM-DD') AS "transactionDate",
         t.created_at AS "createdAt"
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       ${whereClause}
       ORDER BY t.transaction_date DESC, t.id DESC`,
      values
    );

    res.json({
      total: result.rowCount ?? 0,
      transactions: result.rows,
    });
  } catch (error) {
    console.error("Error al consultar movimientos:", error);
    res.status(500).json({
      message: "No se pudieron consultar los movimientos.",
    });
  }
});

// POST /api/transactions
// Registrar un gasto o ingreso
router.post("/", async (req: Request, res: Response) => {
  const { description, amount, type, categoryId, transactionDate } = req.body;

  if (
    typeof description !== "string" ||
    description.trim().length === 0 ||
    description.trim().length > 255
  ) {
    res.status(400).json({
      message: "La descripción es obligatoria y debe tener hasta 255 caracteres.",
    });
    return;
  }

  const parsedAmount = Number(amount);

  if (
    amount === undefined ||
    amount === null ||
    (typeof amount === "string" && amount.trim() === "") ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    !/^\d+(\.\d{1,2})?$/.test(String(amount))
  ) {
    res.status(400).json({
      message: "El importe debe ser positivo y tener como máximo dos decimales.",
    });
    return;
  }

  if (!validTypes.includes(type)) {
    res.status(400).json({
      message: "El tipo debe ser 'income' o 'expense'.",
    });
    return;
  }

  let parsedCategoryId: number | null = null;

  if (categoryId !== undefined && categoryId !== null) {
    parsedCategoryId = Number(categoryId);

    if (
      !Number.isSafeInteger(parsedCategoryId) ||
      parsedCategoryId <= 0
    ) {
      res.status(400).json({
        message: "El ID de categoría debe ser un entero positivo.",
      });
      return;
    }
  }

  const date =
    transactionDate === undefined
      ? new Date().toISOString().slice(0, 10)
      : transactionDate;

  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  ) {
    res.status(400).json({
      message: "La fecha debe ser válida y tener formato YYYY-MM-DD.",
    });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO transactions
        (description, amount, type, category_id, transaction_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         id,
         description,
         amount,
         type,
         category_id AS "categoryId",
         to_char(transaction_date, 'YYYY-MM-DD') AS "transactionDate",
         created_at AS "createdAt"`,
      [
        description.trim(),
        parsedAmount,
        type,
        parsedCategoryId,
        date,
      ]
    );

    res.status(201).json({
      message: "Movimiento registrado correctamente.",
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error("Error al registrar movimiento:", error);

    res.status(500).json({
      message: "No se pudo registrar el movimiento.",
    });
  }
});


const updateTransaction = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ message: "ID inválido." });
    return;
  }

  const { description, amount, type, categoryId, transactionDate } =
    req.body;

  if (
    typeof description !== "string" ||
    description.trim().length === 0 ||
    description.trim().length > 255
  ) {
    res.status(400).json({ message: "Descripción inválida." });
    return;
  }

  if (
    amount === undefined ||
    amount === null ||
    (typeof amount === "string" && amount.trim() === "") ||
    !/^\d+(\.\d{1,2})?$/.test(String(amount)) ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0
  ) {
    res.status(400).json({ message: "Importe inválido." });
    return;
  }

  if (!validTypes.includes(type)) {
    res.status(400).json({ message: "Tipo inválido." });
    return;
  }

  let parsedCategoryId: number | null = null;

  if (categoryId !== undefined && categoryId !== null) {
    parsedCategoryId = Number(categoryId);

    if (
      !Number.isSafeInteger(parsedCategoryId) ||
      parsedCategoryId <= 0
    ) {
      res.status(400).json({ message: "Categoría inválida." });
      return;
    }
  }

  if (
    typeof transactionDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate) ||
    !Number.isFinite(Date.parse(`${transactionDate}T00:00:00Z`)) ||
    new Date(`${transactionDate}T00:00:00Z`)
      .toISOString()
      .slice(0, 10) !== transactionDate
  ) {
    res.status(400).json({
      message: "Fecha inválida. Usá el formato YYYY-MM-DD.",
    });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE transactions
       SET description = $1,
           amount = $2,
           type = $3,
           category_id = $4,
           transaction_date = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING
         id,
         description,
         amount,
         type,
         category_id AS "categoryId",
         to_char(transaction_date, 'YYYY-MM-DD') AS "transactionDate",
         updated_at AS "updatedAt"`,
      [
        description.trim(),
        amount,
        type,
        parsedCategoryId,
        transactionDate,
        id,
      ]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ message: "Movimiento no encontrado." });
      return;
    }

    res.json({
      message: "Movimiento actualizado correctamente.",
      transaction: result.rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar movimiento:", error);
    res.status(500).json({
      message: "No se pudo actualizar el movimiento.",
    });
  }
};

router.put("/:id", updateTransaction);

// DELETE /api/transactions/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ message: "ID inválido." });
    return;
  }

  try {
    const result = await pool.query(
      "DELETE FROM transactions WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ message: "Movimiento no encontrado." });
      return;
    }

    res.status(200).json({
      message: "Movimiento eliminado correctamente.",
      id: result.rows[0].id,
    });
  } catch (error) {
    console.error("Error al eliminar movimiento:", error);
    res.status(500).json({
      message: "No se pudo eliminar el movimiento.",
    });
  }
});


router.get("/summary", async (req: Request, res: Response) => {
  const { from, to } = req.query;

  const isValidDate = (value: unknown): value is string =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

  if (from !== undefined && !isValidDate(from)) {
    res.status(400).json({
      message: "El parámetro from debe tener formato YYYY-MM-DD.",
    });
    return;
  }

  if (to !== undefined && !isValidDate(to)) {
    res.status(400).json({
      message: "El parámetro to debe tener formato YYYY-MM-DD.",
    });
    return;
  }

  if (from && to && String(from) > String(to)) {
    res.status(400).json({
      message: "La fecha inicial no puede ser posterior a la final.",
    });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income,
         COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expenses,
         COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)
         - COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS balance,
         COUNT(*) AS "transactionCount"
       FROM transactions
       WHERE ($1::date IS NULL OR transaction_date >= $1::date)
         AND ($2::date IS NULL OR transaction_date <= $2::date)`,
      [from ?? null, to ?? null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al calcular resumen:", error);
    res.status(500).json({
      message: "No se pudo calcular el resumen financiero.",
    });
  }
});


export default router;