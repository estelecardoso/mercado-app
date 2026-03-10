const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD || ""),
  database: process.env.DB_NAME,
});

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function isValidName(name) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(name);
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

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, message: "Backend rodando e DB conectado!" });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: "DB não conectou",
      details: String(e),
    });
  }
});

app.get("/clients", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, created_at FROM clients ORDER BY id DESC"
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

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API rodando em http://localhost:${port}`));