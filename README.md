# Expense Tracker API

REST API for managing personal income and expenses, built with Node.js, Express, TypeScript and PostgreSQL.

## Overview

Expense Tracker API is a backend project designed to manage financial transactions through a RESTful interface. It supports registering, listing, updating and deleting transactions, with filtering options and financial summaries.

The project also includes automated tests to verify API endpoints and database connectivity.

## Technologies

* **Node.js** — JavaScript runtime.
* **TypeScript** — Static typing for JavaScript.
* **Express** — REST API framework.
* **PostgreSQL** — Relational database.
* **node-postgres (`pg`)** — PostgreSQL client for Node.js.
* **Vitest** — Automated testing framework.
* **Supertest** — HTTP endpoint testing.
* **Git and GitHub** — Version control and repository hosting.

## Prerequisites

Before running the project, make sure you have installed:

* Node.js and npm.
* PostgreSQL.
* Git.

A PostgreSQL server must be running, and the application database must be created before starting the API.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/fedemartin25/expense-tracker-api.git
   ```

2. Navigate to the project directory:

   ```bash
   cd expense-tracker-api
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file in the project root directory.

5. Configure the environment variables:

   ```dotenv
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=expense_tracker
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   ```

   Replace `your_postgres_password` with your PostgreSQL password. Do not commit your `.env` file to Git.

6. Create the `expense_tracker` database in PostgreSQL and execute the SQL schema required by the application.

## Running the application

Start the development server:

```bash
npm run dev
```

The API will be available at:

`http://localhost:3000`

## API Endpoints

### Health checks

| Method | Endpoint         | Description                                |
| ------ | ---------------- | ------------------------------------------ |
| GET    | `/`              | Returns API information and status.        |
| GET    | `/api/health`    | Checks whether the API is running.         |
| GET    | `/api/health/db` | Checks the PostgreSQL database connection. |

### Transactions

| Method | Endpoint                    | Description                      |
| ------ | --------------------------- | -------------------------------- |
| GET    | `/api/transactions`         | Retrieves transactions.          |
| GET    | `/api/transactions/summary` | Retrieves a financial summary.   |
| POST   | `/api/transactions`         | Creates a transaction.           |
| PUT    | `/api/transactions/:id`     | Updates an existing transaction. |
| DELETE | `/api/transactions/:id`     | Deletes a transaction.           |

### Transaction filters

The transaction listing endpoint supports the following optional query parameters:

* `type`: Filter by `income` or `expense`.
* `categoryId`: Filter by category ID.
* `from`: Filter transactions from a date (`YYYY-MM-DD`).
* `to`: Filter transactions up to a date (`YYYY-MM-DD`).

Example:

```http
GET /api/transactions?type=expense&from=2026-10-01&to=2026-10-31
```

The listing response includes the total number of matching transactions and the transaction array.

## Testing

Run the automated test suite:

```bash
npm test
```

The tests cover:

* API root endpoint.
* API health check.
* PostgreSQL connectivity.
* Transaction creation.
* Transaction listing.

Tests use a separate test database configured through `.env.test` to avoid modifying the development database.

## Build

Compile the TypeScript source code:

```bash
npm run build
```

The compiled JavaScript files are generated in the `dist/` directory.

To run the compiled application:

```bash
npm start
```

## Project Status

The project includes transaction management, PostgreSQL integration, request validation, automated tests and a TypeScript build configuration.

## Database Setup

Create a PostgreSQL database named `expense_tracker`, connect to it, and execute the following SQL script:

```sql
CREATE TABLE categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_date
    ON transactions(transaction_date);

CREATE INDEX idx_transactions_category
    ON transactions(category_id);

INSERT INTO categories (name) VALUES
    ('Alimentación'),
    ('Transporte'),
    ('Vivienda'),
    ('Servicios'),
    ('Salud'),
    ('Entretenimiento'),
    ('Salario'),
    ('Otros');
```

The database includes two tables:

* **`categories`**: stores transaction categories.
* **`transactions`**: stores income and expense records, including their amount, date and optional category.

The schema uses constraints to validate transaction amounts and types, and foreign keys to maintain category relationships.

## Test Database Setup

The automated tests use a separate PostgreSQL database to avoid modifying development data.

1. Create a PostgreSQL database named `expense_tracker_test`.

2. Execute the database schema provided in the Database Setup section against `expense_tracker_test` as well, including the category seed data.

3. Create a `.env.test` file in the project root with the following configuration:

   ```dotenv
   PORT=3001
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=expense_tracker_test
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   ```

4. Replace `your_postgres_password` with your local PostgreSQL password.

5. Run the tests:

   ```bash
   npm test
   ```

Never commit `.env` or `.env.test` files to the repository.
