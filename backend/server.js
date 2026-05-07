const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const useSsl = String(process.env.DB_SSL || "false").toLowerCase() === "true";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD || ""),
  database: process.env.DB_NAME,
  ssl: useSsl
    ? {
        rejectUnauthorized: false,
      }
    : false,
});

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function isValidName(name) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(name);
}

function isValidPassword(password) {
  return String(password || "").length >= 6;
}

function cleanPhone(phone) {
  if (phone === undefined || phone === null) return null;

  const digits = String(phone).replace(/\D/g, "");
  return digits.length ? digits : null;
}

function validatePhone(digitsOrNull) {
  if (!digitsOrNull) return true;
  return digitsOrNull.length === 10 || digitsOrNull.length === 11;
}

function isValidProductName(name) {
  return String(name || "").trim().length >= 2;
}

function parsePrice(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseQuantity(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanEan13(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function isValidEan13(value) {
  const ean = cleanEan13(value);

  if (!/^\d{13}$/.test(ean)) {
    return false;
  }

  const digits = ean.split("").map(Number);
  const checkDigit = digits[12];

  const sum = digits.slice(0, 12).reduce((acc, digit, index) => {
    return acc + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);

  const calculatedCheckDigit = (10 - (sum % 10)) % 10;

  return checkDigit === calculatedCheckDigit;
}

function normalizeUnitMeasure(value) {
  const unit = String(value || "").trim().toUpperCase();
  return unit === "KG" ? "KG" : "UN";
}

function validateQuantityByUnit(quantity, unitMeasure) {
  if (quantity === null || quantity < 0) {
    return false;
  }

  if (unitMeasure === "UN") {
    return Number.isInteger(quantity);
  }

  if (unitMeasure === "KG") {
    return Number.isFinite(quantity);
  }

  return false;
}

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      ok: true,
      message: "Backend rodando e DB conectado!",
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: "DB não conectou",
      details: String(e),
    });
  }
});

/* =========================
 AUTH
========================= */

app.post("/auth/register", async (req, res) => {
  let { name, email, password } = req.body;

  const cleanName = String(name ?? "").trim();
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const cleanPassword = String(password ?? "").trim();

  if (!cleanName || !cleanEmail || !cleanPassword) {
    return res.status(400).json({
      error: "Preencha nome, e-mail e senha.",
    });
  }

  if (!isValidName(cleanName)) {
    return res.status(400).json({
      error: "O nome deve conter apenas letras.",
    });
  }

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({
      error: "Digite um e-mail válido, exemplo exemplo@dominio.com",
    });
  }

  if (!isValidPassword(cleanPassword)) {
    return res.status(400).json({
      error: "A senha deve ter pelo menos 6 caracteres.",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [cleanName, cleanEmail, cleanPassword]
    );

    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error("ERRO NO POST /auth/register:", e);

    if (String(e).includes("duplicate key")) {
      return res.status(409).json({
        error: "Dados já cadastrados",
      });
    }

    res.status(500).json({
      error: "Erro ao cadastrar usuário.",
      details: String(e),
    });
  }
});

app.post("/auth/login", async (req, res) => {
  let { email, password } = req.body;

  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const cleanPassword = String(password ?? "").trim();

  if (!cleanEmail || !cleanPassword) {
    return res.status(400).json({
      error: "Preencha e-mail e senha.",
    });
  }

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({
      error: "Digite um e-mail válido, exemplo exemplo@dominio.com",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, password, created_at
       FROM users
       WHERE email = $1`,
      [cleanEmail]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        error: "E-mail ou senha inválidos.",
      });
    }

    const user = result.rows[0];

    if (user.password !== cleanPassword) {
      return res.status(401).json({
        error: "E-mail ou senha inválidos.",
      });
    }

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    });
  } catch (e) {
    console.error("ERRO NO POST /auth/login:", e);

    res.status(500).json({
      error: "Erro ao realizar login.",
      details: String(e),
    });
  }
});

/* =========================
 USERS
========================= */

app.get("/users", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at
       FROM users
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (e) {
    console.error("ERRO NO GET /users:", e);

    res.status(500).json({
      error: "Erro ao listar usuários.",
      details: String(e),
    });
  }
});

app.put("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  let { name, email, password } = req.body;

  const cleanName = String(name ?? "").trim();
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const cleanPassword = String(password ?? "").trim();

  if (!id) {
    return res.status(400).json({ error: "ID inválido." });
  }

  if (!cleanName || !cleanEmail) {
    return res.status(400).json({
      error: "Preencha nome e e-mail.",
    });
  }

  if (!isValidName(cleanName)) {
    return res.status(400).json({
      error: "O nome deve conter apenas letras.",
    });
  }

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({
      error: "Digite um e-mail válido, exemplo exemplo@dominio.com",
    });
  }

  try {
    let result;

    if (cleanPassword) {
      if (!isValidPassword(cleanPassword)) {
        return res.status(400).json({
          error: "A senha deve ter pelo menos 6 caracteres.",
        });
      }

      result = await pool.query(
        `UPDATE users
         SET name = $1, email = $2, password = $3
         WHERE id = $4
         RETURNING id, name, email, created_at`,
        [cleanName, cleanEmail, cleanPassword, id]
      );
    } else {
      result = await pool.query(
        `UPDATE users
         SET name = $1, email = $2
         WHERE id = $3
         RETURNING id, name, email, created_at`,
        [cleanName, cleanEmail, id]
      );
    }

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    res.json(result.rows[0]);
  } catch (e) {
    console.error("ERRO NO PUT /users/:id:", e);

    if (String(e).includes("duplicate key")) {
      return res.status(409).json({
        error: "Dados já cadastrados",
      });
    }

    res.status(500).json({
      error: "Erro ao editar usuário.",
      details: String(e),
    });
  }
});

app.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "ID inválido." });
  }

  try {
    const currentUserId = Number(req.headers["x-user-id"] || 0);

    if (currentUserId && currentUserId === id) {
      return res.status(400).json({
        error: "Você não pode excluir o usuário que está logado.",
      });
    }

    const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Usuário não encontrado.",
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("ERRO NO DELETE /users/:id:", e);

    res.status(500).json({
      error: "Erro ao excluir usuário.",
      details: String(e),
    });
  }
});

/* =========================
 CLIENTS
========================= */

app.get("/clients", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, created_at
       FROM clients
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (e) {
    console.error("ERRO NO GET /clients:", e);

    res.status(500).json({
      error: "Erro ao listar clientes.",
      details: String(e),
    });
  }
});

app.post("/clients", async (req, res) => {
  let { name, email, phone } = req.body;

  const cleanName = String(name ?? "").trim();
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const phoneDigits = cleanPhone(phone);

  if (!cleanName || !cleanEmail) {
    return res.status(400).json({
      error: "Preencha nome e e-mail.",
    });
  }

  if (!isValidName(cleanName)) {
    return res.status(400).json({
      error: "O nome deve conter apenas letras.",
    });
  }

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({
      error: "Digite um e-mail válido, exemplo exemplo@dominio.com",
    });
  }

  if (!validatePhone(phoneDigits)) {
    return res.status(400).json({
      error: "Telefone deve ter 10 ou 11 dígitos.",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO clients (name, email, phone)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, phone, created_at`,
      [cleanName, cleanEmail, phoneDigits]
    );

    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error("ERRO NO POST /clients:", e);

    if (String(e).includes("duplicate key")) {
      return res.status(409).json({
        error: "Dados já cadastrados",
      });
    }

    res.status(500).json({
      error: "Erro ao cadastrar cliente.",
      details: String(e),
    });
  }
});

app.put("/clients/:id", async (req, res) => {
  const id = Number(req.params.id);
  let { name, email, phone } = req.body;

  const cleanName = String(name ?? "").trim();
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const phoneDigits = cleanPhone(phone);

  if (!id) {
    return res.status(400).json({ error: "ID inválido." });
  }

  if (!cleanName || !cleanEmail) {
    return res.status(400).json({
      error: "Preencha nome e e-mail.",
    });
  }

  if (!isValidName(cleanName)) {
    return res.status(400).json({
      error: "O nome deve conter apenas letras.",
    });
  }

  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({
      error: "Digite um e-mail válido, exemplo exemplo@dominio.com",
    });
  }

  if (!validatePhone(phoneDigits)) {
    return res.status(400).json({
      error: "Telefone deve ter 10 ou 11 dígitos.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE clients
       SET name = $1, email = $2, phone = $3
       WHERE id = $4
       RETURNING id, name, email, phone, created_at`,
      [cleanName, cleanEmail, phoneDigits, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Cliente não encontrado.",
      });
    }

    res.json(result.rows[0]);
  } catch (e) {
    console.error("ERRO NO PUT /clients/:id:", e);

    if (String(e).includes("duplicate key")) {
      return res.status(409).json({
        error: "Dados já cadastrados",
      });
    }

    res.status(500).json({
      error: "Erro ao editar cliente.",
      details: String(e),
    });
  }
});

app.delete("/clients/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "ID inválido." });
  }

  try {
    const result = await pool.query("DELETE FROM clients WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Cliente não encontrado.",
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("ERRO NO DELETE /clients/:id:", e);

    res.status(500).json({
      error: "Erro ao excluir cliente.",
      details: String(e),
    });
  }
});

/* =========================
 PRODUCTS
========================= */

app.get("/products", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, ean13, name, description, price, quantity, unit_measure, created_at
       FROM products
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (e) {
    console.error("ERRO NO GET /products:", e);

    res.status(500).json({
      error: "Erro ao listar produtos.",
      details: String(e),
    });
  }
});

app.post("/products", async (req, res) => {
  let { ean13, name, description, price, quantity, unit_measure } = req.body;

  const cleanEan = cleanEan13(ean13);
  const cleanName = String(name ?? "").trim();
  const cleanDescription = String(description ?? "").trim();
  const cleanPrice = parsePrice(price);
  const cleanQuantity = parseQuantity(quantity);
  const selectedUnitMeasure = normalizeUnitMeasure(unit_measure);

  if (!cleanEan) {
    return res.status(400).json({
      error: "Preencha o código EAN-13 do produto.",
    });
  }

  if (!isValidEan13(cleanEan)) {
    return res.status(400).json({
      error: "O código EAN-13 deve conter 13 dígitos válidos.",
    });
  }

  if (!cleanName) {
    return res.status(400).json({
      error: "Preencha o nome do produto.",
    });
  }

  if (!isValidProductName(cleanName)) {
    return res.status(400).json({
      error: "O nome do produto deve ter pelo menos 2 caracteres.",
    });
  }

  if (cleanPrice === null || cleanPrice < 0) {
    return res.status(400).json({
      error: "O preço deve ser um número maior ou igual a zero.",
    });
  }

  if (!validateQuantityByUnit(cleanQuantity, selectedUnitMeasure)) {
    return res.status(400).json({
      error:
        selectedUnitMeasure === "UN"
          ? "Para UN, a quantidade em estoque deve ser um número inteiro maior ou igual a zero."
          : "Para KG, a quantidade em estoque deve ser um número maior ou igual a zero.",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (ean13, name, description, price, quantity, unit_measure)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, ean13, name, description, price, quantity, unit_measure, created_at`,
      [
        cleanEan,
        cleanName,
        cleanDescription || null,
        cleanPrice,
        cleanQuantity,
        selectedUnitMeasure,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error("ERRO NO POST /products:", e);

    if (String(e).includes("duplicate key")) {
      return res.status(409).json({
        error: "Produto ou código EAN-13 já cadastrado.",
      });
    }

    res.status(500).json({
      error: "Erro ao cadastrar produto.",
      details: String(e),
    });
  }
});

app.put("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  let { ean13, name, description, price, quantity, unit_measure } = req.body;

  const cleanEan = cleanEan13(ean13);
  const cleanName = String(name ?? "").trim();
  const cleanDescription = String(description ?? "").trim();
  const cleanPrice = parsePrice(price);
  const cleanQuantity = parseQuantity(quantity);
  const selectedUnitMeasure = normalizeUnitMeasure(unit_measure);

  if (!id) {
    return res.status(400).json({ error: "ID inválido." });
  }

  if (!cleanEan) {
    return res.status(400).json({
      error: "Preencha o código EAN-13 do produto.",
    });
  }

  if (!isValidEan13(cleanEan)) {
    return res.status(400).json({
      error: "O código EAN-13 deve conter 13 dígitos válidos.",
    });
  }

  if (!cleanName) {
    return res.status(400).json({
      error: "Preencha o nome do produto.",
    });
  }

  if (!isValidProductName(cleanName)) {
    return res.status(400).json({
      error: "O nome do produto deve ter pelo menos 2 caracteres.",
    });
  }

  if (cleanPrice === null || cleanPrice < 0) {
    return res.status(400).json({
      error: "O preço deve ser um número maior ou igual a zero.",
    });
  }

  if (!validateQuantityByUnit(cleanQuantity, selectedUnitMeasure)) {
    return res.status(400).json({
      error:
        selectedUnitMeasure === "UN"
          ? "Para UN, a quantidade em estoque deve ser um número inteiro maior ou igual a zero."
          : "Para KG, a quantidade em estoque deve ser um número maior ou igual a zero.",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE products
       SET ean13 = $1,
           name = $2,
           description = $3,
           price = $4,
           quantity = $5,
           unit_measure = $6
       WHERE id = $7
       RETURNING id, ean13, name, description, price, quantity, unit_measure, created_at`,
      [
        cleanEan,
        cleanName,
        cleanDescription || null,
        cleanPrice,
        cleanQuantity,
        selectedUnitMeasure,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Produto não encontrado.",
      });
    }

    res.json(result.rows[0]);
  } catch (e) {
    console.error("ERRO NO PUT /products/:id:", e);

    if (String(e).includes("duplicate key")) {
      return res.status(409).json({
        error: "Produto ou código EAN-13 já cadastrado.",
      });
    }

    res.status(500).json({
      error: "Erro ao editar produto.",
      details: String(e),
    });
  }
});

app.delete("/products/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "ID inválido." });
  }

  try {
    const result = await pool.query("DELETE FROM products WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Produto não encontrado.",
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("ERRO NO DELETE /products/:id:", e);

    res.status(500).json({
      error: "Erro ao excluir produto.",
      details: String(e),
    });
  }
});

const port = process.env.PORT || 3001;

app.listen(port, () =>
  console.log(`API rodando em http://localhost:${port}`)
);