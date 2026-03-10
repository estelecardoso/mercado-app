import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:3001";

function formatDatePtBr(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function isValidName(name) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(name);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function App() {
  const [form, setForm] = useState({
    id: null,
    name: "",
    email: "",
    phone: "",
  });

  const [clients, setClients] = useState([]);
  const [msg, setMsg] = useState({
    type: "info",
    text: "",
  });

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  async function apiJson(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(
          data?.details ||
            data?.error ||
            data?.message ||
            `Erro HTTP ${res.status}`
        );
      }

      return data;
    } catch (e) {
      if (e?.name === "AbortError") {
        throw new Error("Tempo limite da requisição excedido. Tente novamente.");
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadClients() {
    try {
      const data = await apiJson(`${API}/clients`);
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg({
        type: "error",
        text: e.message || "Erro ao carregar clientes.",
      });
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function clearForm() {
    setForm({
      id: null,
      name: "",
      email: "",
      phone: "",
    });
    setMsg({
      type: "info",
      text: "",
    });
  }

  function startEdit(client) {
    setForm({
      id: client.id,
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
    });

    setMsg({
      type: "info",
      text: "Editando cliente. Altere os campos e clique em Salvar alterações.",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function onDelete(id) {
    if (loading) return;

    const ok = confirm("Tem certeza que deseja excluir este cliente?");
    if (!ok) return;

    setLoading(true);
    setMsg({
      type: "info",
      text: "",
    });

    try {
      await apiJson(`${API}/clients/${id}`, {
        method: "DELETE",
      });

      setMsg({
        type: "success",
        text: "Cliente excluído com sucesso!",
      });

      if (form.id === id) {
        clearForm();
      }

      await loadClients();
    } catch (e) {
      setMsg({
        type: "error",
        text: e.message || "Erro ao excluir.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone ? form.phone.replace(/\D/g, "") : "";

    if (!name) {
      setMsg({ type: "error", text: "Digite o nome." });
      return;
    }

    if (!isValidName(name)) {
      setMsg({
        type: "error",
        text: "O nome deve conter apenas letras.",
      });
      return;
    }

    if (!email) {
      setMsg({ type: "error", text: "Digite o e-mail." });
      return;
    }

    if (!isValidEmail(email)) {
      setMsg({
        type: "error",
        text: "Digite um e-mail válido, exemplo exemplo@dominio.com",
      });
      return;
    }

    if (phone && !(phone.length === 10 || phone.length === 11)) {
      setMsg({
        type: "error",
        text: "Telefone deve ter 10 ou 11 dígitos.",
      });
      return;
    }

    setLoading(true);
    setMsg({
      type: "info",
      text: "",
    });

    try {
      if (form.id) {
        await apiJson(`${API}/clients/${form.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            phone: phone || null,
          }),
        });

        setMsg({
          type: "success",
          text: "Alterações salvas com sucesso!",
        });
      } else {
        await apiJson(`${API}/clients`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            phone: phone || null,
          }),
        });

        setMsg({
          type: "success",
          text: "Cliente cadastrado com sucesso!",
        });
      }

      clearForm();
      await loadClients();
    } catch (e) {
      setMsg({
        type: "error",
        text: e.message || "Erro ao salvar.",
      });
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = normalizeText(query);

    if (!q) return clients;

    const terms = q.split(/\s+/).filter(Boolean);

    return clients.filter((c) => {
      const searchable = normalizeText(
        `${c.name || ""} ${c.email || ""} ${c.phone || ""}`
      );

      return terms.every((term) => searchable.includes(term));
    });
  }, [clients, query]);

  const isEditing = Boolean(form.id);

  const page = {
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box",
    padding: "24px 28px",
    background:
      "linear-gradient(120deg, rgba(255,210,233,.35), rgba(209,236,255,.45), rgba(221,255,232,.35))",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    color: "#0f172a",
  };

  const container = {
    width: "100%",
    maxWidth: "100%",
    margin: "0 auto",
  };

  const headerRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 18,
    flexWrap: "wrap",
  };

  const title = {
    margin: 0,
    fontSize: 56,
    letterSpacing: -1,
  };

  const subtitle = {
    margin: "6px 0 0",
    color: "#475569",
    fontSize: 16,
  };

  const pillRow = {
    display: "flex",
    gap: 10,
    alignItems: "center",
    background: "rgba(255,255,255,.65)",
    border: "1px solid rgba(15, 23, 42, .08)",
    padding: "10px 12px",
    borderRadius: 999,
    boxShadow: "0 18px 40px rgba(15, 23, 42, .08)",
    height: "fit-content",
  };

  const pill = {
    background: "#ffffff",
    border: "1px solid rgba(15, 23, 42, .10)",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 13,
    color: "#334155",
    whiteSpace: "nowrap",
  };

  const grid = {
    display: "grid",
    gridTemplateColumns: window.innerWidth < 980 ? "1fr" : "420px 1fr",
    gap: 20,
    alignItems: "stretch",
    width: "100%",
  };

  const card = {
    background: "rgba(255,255,255,.72)",
    border: "1px solid rgba(15, 23, 42, .10)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 18px 50px rgba(15, 23, 42, .10)",
    backdropFilter: "blur(8px)",
    boxSizing: "border-box",
  };

  const leftCard = {
    ...card,
    minHeight: 620,
  };

  const rightCard = {
    ...card,
    minHeight: 620,
    display: "flex",
    flexDirection: "column",
  };

  const cardTitle = {
    margin: "0 0 14px",
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
  };

  const label = {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    color: "#475569",
    margin: "12px 0 6px",
  };

  const input = {
    width: "100%",
    padding: "14px 14px",
    fontSize: 15,
    borderRadius: 14,
    border: "1px solid rgba(15, 23, 42, .14)",
    background: "#ffffff",
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
  };

  const btnBase = {
    width: "100%",
    padding: "14px 14px",
    fontSize: 16,
    borderRadius: 14,
    border: "1px solid rgba(15, 23, 42, .14)",
    fontWeight: 800,
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.8 : 1,
  };

  const btnPrimary = {
    ...btnBase,
    background:
      "linear-gradient(90deg, rgba(167,139,250,.35), rgba(125,211,252,.35))",
    color: "#0f172a",
  };

  const btnSecondary = {
    ...btnBase,
    background: "#ffffff",
    color: "#334155",
  };

  const hint = {
    marginTop: 12,
    fontSize: 13,
    color: "#64748b",
  };

  const msgBox = {
    marginTop: 14,
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(15, 23, 42, .12)",
    background:
      msg.type === "success"
        ? "rgba(34,197,94,.12)"
        : msg.type === "error"
        ? "rgba(239,68,68,.10)"
        : "rgba(255,255,255,.7)",
    color:
      msg.type === "success"
        ? "#166534"
        : msg.type === "error"
        ? "#991b1b"
        : "#334155",
    fontSize: 14,
  };

  const topRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  };

  const search = {
    ...input,
    maxWidth: 560,
  };

  const tableWrap = {
    overflowX: "auto",
    borderRadius: 18,
    border: "1px solid rgba(15, 23, 42, .10)",
    background: "rgba(255,255,255,.65)",
    width: "100%",
    minHeight: 360,
    flex: 1,
    display: "flex",
    flexDirection: "column",
  };

  const table = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: 15,
  };

  const th = {
    textAlign: "left",
    padding: 14,
    fontWeight: 800,
    color: "#0f172a",
    background: "rgba(226, 232, 240, .55)",
    borderBottom: "1px solid rgba(15, 23, 42, .10)",
    fontSize: 15,
  };

  const td = {
    padding: 14,
    color: "#0f172a",
    borderBottom: "1px solid rgba(15, 23, 42, .08)",
    background: "transparent",
    fontSize: 15,
  };

  const emptyTd = {
    ...td,
    height: 220,
    verticalAlign: "top",
  };

  const actions = {
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
  };

  const actionBtn = (variant) => {
    const base = {
      borderRadius: 999,
      padding: "8px 12px",
      border: "1px solid rgba(15, 23, 42, .14)",
      fontSize: 13,
      fontWeight: 800,
      cursor: loading ? "not-allowed" : "pointer",
      opacity: loading ? 0.7 : 1,
      background: "#fff",
      color: "#0f172a",
      whiteSpace: "nowrap",
    };

    if (variant === "edit") {
      return {
        ...base,
        background: "rgba(59,130,246,.10)",
        borderColor: "rgba(59,130,246,.25)",
      };
    }

    if (variant === "delete") {
      return {
        ...base,
        background: "rgba(239,68,68,.10)",
        borderColor: "rgba(239,68,68,.22)",
      };
    }

    return base;
  };

  return (
    <div style={page}>
      <div style={container}>
        <div style={headerRow}>
          <div>
            <h1 style={title}>Clientes</h1>
            <p style={subtitle}>
              Cadastre, edite e exclua clientes. Use a busca para encontrar rapidamente.
            </p>
          </div>

          <div style={pillRow}>
            <span style={pill}>Total: {clients.length}</span>
          </div>
        </div>

        <div style={grid}>
          <div style={leftCard}>
            <div style={cardTitle}>Clientes</div>

            <form onSubmit={onSubmit}>
              <label style={label}>Nome *</label>
              <input
                style={input}
                placeholder="Digite o nome"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                disabled={loading}
              />

              <label style={label}>E-mail *</label>
              <input
                style={input}
                placeholder="exemplo@dominio.com"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                disabled={loading}
              />

              <label style={label}>Telefone (10 ou 11)</label>
              <input
                style={input}
                placeholder="Somente números"
                value={form.phone}
                onChange={(e) =>
                  setField("phone", e.target.value.replace(/\D/g, ""))
                }
                disabled={loading}
              />

              <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                <button type="submit" style={btnPrimary} disabled={loading}>
                  {isEditing ? "Salvar alterações" : "Salvar"}
                </button>

                <button
                  type="button"
                  style={btnSecondary}
                  onClick={clearForm}
                  disabled={loading}
                >
                  Limpar
                </button>
              </div>

              <div style={hint}>
                Dica: clique em <b>Editar</b> na tabela para preencher o formulário.
              </div>

              {msg.text && <div style={msgBox}>{msg.text}</div>}
            </form>
          </div>

          <div style={rightCard}>
            <div style={topRow}>
              <div style={cardTitle}>Cadastro de Clientes</div>

              <input
                style={search}
                placeholder="Buscar por nome, e-mail ou telefone…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={loading}
              />
            </div>

            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Quantidade</th>
                    <th style={th}>Nome</th>
                    <th style={th}>E-mail</th>
                    <th style={th}>Telefone</th>
                    <th style={th}>Cadastrado em</th>
                    <th style={{ ...th, textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((c, idx) => (
                    <tr key={c.id}>
                      <td style={td}>{idx + 1}</td>
                      <td style={td}>{c.name}</td>
                      <td style={td}>{c.email}</td>
                      <td style={td}>{c.phone || "-"}</td>
                      <td style={td}>{formatDatePtBr(c.created_at)}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <div style={actions}>
                          <button
                            type="button"
                            style={actionBtn("edit")}
                            onClick={() => startEdit(c)}
                            disabled={loading}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            style={actionBtn("delete")}
                            onClick={() => onDelete(c.id)}
                            disabled={loading}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td style={emptyTd} colSpan={6}>
                        Nenhum cliente cadastrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}