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
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("clients");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [userForm, setUserForm] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
  });

  const [form, setForm] = useState({
    id: null,
    name: "",
    email: "",
    phone: "",
  });

  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);

  const [msg, setMsg] = useState({
    type: "info",
    text: "",
  });

  const [userMsg, setUserMsg] = useState({
    type: "info",
    text: "",
  });

  const [loginMsg, setLoginMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    function handleResize() {
      setScreenWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadClients();
      loadUsers();
    }
  }, [user]);

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

  async function loadUsers() {
    try {
      const data = await apiJson(`${API}/users`);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setUserMsg({
        type: "error",
        text: e.message || "Erro ao carregar usuários.",
      });
    }
  }

  function setLoginField(name, value) {
    setLoginForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function setUserField(name, value) {
    setUserForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function setField(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  function clearUserForm() {
    setUserForm({
      id: null,
      name: "",
      email: "",
      password: "",
    });
    setUserMsg({
      type: "info",
      text: "",
    });
  }

  function startEdit(client) {
    setActiveTab("clients");
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

  function startEditUser(item) {
    setActiveTab("users");
    setUserForm({
      id: item.id,
      name: item.name || "",
      email: item.email || "",
      password: "",
    });
    setUserMsg({
      type: "info",
      text: "Editando usuário. Preencha a senha só se quiser alterá-la.",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (loading) return;

    const email = loginForm.email.trim().toLowerCase();
    const password = loginForm.password.trim();

    if (!email || !password) {
      setLoginMsg("Preencha e-mail e senha.");
      return;
    }

    if (!isValidEmail(email)) {
      setLoginMsg("Digite um e-mail válido, exemplo exemplo@dominio.com");
      return;
    }

    setLoading(true);
    setLoginMsg("");

    try {
      const data = await apiJson(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      setUser(data);
      localStorage.setItem("user", JSON.stringify(data));

      setLoginForm({
        email: "",
        password: "",
      });
    } catch (e) {
      setLoginMsg(e.message || "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveUser(e) {
    e.preventDefault();
    if (loading) return;

    const name = userForm.name.trim();
    const email = userForm.email.trim().toLowerCase();
    const password = userForm.password.trim();

    if (!name || !email) {
      setUserMsg({ type: "error", text: "Preencha nome e e-mail." });
      return;
    }

    if (!isValidName(name)) {
      setUserMsg({ type: "error", text: "O nome deve conter apenas letras." });
      return;
    }

    if (!isValidEmail(email)) {
      setUserMsg({
        type: "error",
        text: "Digite um e-mail válido, exemplo exemplo@dominio.com",
      });
      return;
    }

    if (!userForm.id && password.length < 6) {
      setUserMsg({
        type: "error",
        text: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    if (userForm.id && password && password.length < 6) {
      setUserMsg({
        type: "error",
        text: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    setLoading(true);
    setUserMsg({ type: "info", text: "" });

    try {
      if (userForm.id) {
        await apiJson(`${API}/users/${userForm.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        });

        setUserMsg({
          type: "success",
          text: "Usuário atualizado com sucesso!",
        });
      } else {
        await apiJson(`${API}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        });

        setUserMsg({
          type: "success",
          text: "Usuário cadastrado com sucesso!",
        });
      }

      clearUserForm();
      await loadUsers();
    } catch (e) {
      setUserMsg({
        type: "error",
        text: e.message || "Erro ao salvar usuário.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("user");
    setUser(null);
    setClients([]);
    setUsers([]);
    setActiveTab("clients");
    setMenuOpen(false);
    setForm({
      id: null,
      name: "",
      email: "",
      phone: "",
    });
    setUserForm({
      id: null,
      name: "",
      email: "",
      password: "",
    });
    setMsg({
      type: "info",
      text: "",
    });
    setUserMsg({
      type: "info",
      text: "",
    });
    setLoginMsg("");
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

  async function onDeleteUser(id) {
    if (loading) return;

    const ok = confirm("Tem certeza que deseja excluir este usuário?");
    if (!ok) return;

    setLoading(true);
    setUserMsg({ type: "info", text: "" });

    try {
      await apiJson(`${API}/users/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": String(user?.id || ""),
        },
      });

      setUserMsg({
        type: "success",
        text: "Usuário excluído com sucesso!",
      });

      if (userForm.id === id) {
        clearUserForm();
      }

      await loadUsers();
    } catch (e) {
      setUserMsg({
        type: "error",
        text: e.message || "Erro ao excluir usuário.",
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

  const loginPage = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    background:
      "linear-gradient(120deg, rgba(255,210,233,.35), rgba(209,236,255,.45), rgba(221,255,232,.35))",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  };

  const loginCard = {
    width: "100%",
    maxWidth: 460,
    background: "rgba(255,255,255,.82)",
    border: "1px solid rgba(15, 23, 42, .10)",
    borderRadius: 22,
    padding: 30,
    boxShadow: "0 18px 50px rgba(15, 23, 42, .10)",
    backdropFilter: "blur(8px)",
  };

  const page = {
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box",
    padding: "20px 24px",
    background:
      "linear-gradient(120deg, rgba(255,210,233,.35), rgba(209,236,255,.45), rgba(221,255,232,.35))",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    color: "#0f172a",
  };

  const shell = {
    display: "grid",
    gridTemplateColumns:
      screenWidth < 1080 ? "1fr" : `${menuOpen ? "240px" : "88px"} 1fr`,
    gap: 18,
    width: "100%",
    transition: "grid-template-columns 0.2s ease",
  };

  const sidebar = {
    background: "rgba(255,255,255,.72)",
    border: "1px solid rgba(15, 23, 42, .10)",
    borderRadius: 20,
    padding: 16,
    boxShadow: "0 18px 50px rgba(15, 23, 42, .10)",
    backdropFilter: "blur(8px)",
    height: "fit-content",
    overflow: "hidden",
    transition: "all 0.2s ease",
  };

  const sidebarTitle = {
    margin: "0 0 18px",
    fontSize: 18,
    fontWeight: 800,
    opacity: menuOpen ? 1 : 0,
    height: menuOpen ? "auto" : 0,
    overflow: "hidden",
    transition: "all 0.2s ease",
  };

  const sideItem = (active, variant) => {
    const variants = {
      clients: {
        activeBg: "rgba(186, 230, 253, .55)",
        activeBorder: "rgba(56, 189, 248, .28)",
        iconBg: "rgba(125, 211, 252, .35)",
      },
      users: {
        activeBg: "rgba(221, 214, 254, .65)",
        activeBorder: "rgba(167, 139, 250, .30)",
        iconBg: "rgba(196, 181, 253, .45)",
      },
      next1: {
        activeBg: "rgba(254, 240, 138, .45)",
        activeBorder: "rgba(250, 204, 21, .25)",
        iconBg: "rgba(253, 224, 71, .35)",
      },
      next2: {
        activeBg: "rgba(253, 230, 138, .45)",
        activeBorder: "rgba(245, 158, 11, .22)",
        iconBg: "rgba(252, 211, 77, .35)",
      },
    };

    const current = variants[variant];

    return {
      width: "100%",
      textAlign: "left",
      padding: "14px 16px",
      borderRadius: 16,
      border: `1px solid ${
        active ? current.activeBorder : "rgba(15, 23, 42, .10)"
      }`,
      background: active ? current.activeBg : "rgba(255,255,255,.88)",
      color: "#0f172a",
      fontSize: 16,
      fontWeight: 700,
      cursor: "pointer",
      marginBottom: 10,
      whiteSpace: "nowrap",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      gap: 12,
      transition: "all 0.2s ease",
    };
  };

  const iconBubble = (variant) => {
    const bgMap = {
      clients: "rgba(125, 211, 252, .35)",
      users: "rgba(196, 181, 253, .45)",
      next1: "rgba(253, 224, 71, .35)",
      next2: "rgba(252, 211, 77, .35)",
    };

    return {
      minWidth: 34,
      width: 34,
      height: 34,
      borderRadius: 999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: bgMap[variant],
      fontSize: 17,
      flexShrink: 0,
    };
  };

  const placeholderItem = (variant) => ({
    width: "100%",
    textAlign: "left",
    padding: "14px 16px",
    borderRadius: 16,
    border: "1px dashed rgba(15, 23, 42, .16)",
    background:
      variant === "next1"
        ? "rgba(255, 251, 235, .65)"
        : "rgba(255, 247, 237, .65)",
    color: "#64748b",
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 10,
    whiteSpace: "nowrap",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    gap: 12,
  });

  const contentWrap = {
    display: "grid",
    gap: 18,
  };

  const headerCard = {
    background: "rgba(255,255,255,.72)",
    border: "1px solid rgba(15, 23, 42, .10)",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 18px 50px rgba(15, 23, 42, .10)",
    backdropFilter: "blur(8px)",
  };

  const headerRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
  };

  const title = {
    margin: 0,
    fontSize: 48,
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
    flexWrap: "wrap",
  };

  const pill = {
    background: "#ffffff",
    border: "1px solid rgba(15, 23, 42, .10)",
    padding: "10px 14px",
    borderRadius: 999,
    fontSize: 13,
    color: "#334155",
    whiteSpace: "nowrap",
    fontWeight: 700,
  };

  const logoutBtn = {
    borderRadius: 999,
    padding: "10px 14px",
    border: "1px solid rgba(15, 23, 42, .14)",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 700,
    cursor: "pointer",
  };

  const sectionGrid = {
    display: "grid",
    gridTemplateColumns: screenWidth >= 1180 ? "420px 1fr" : "1fr",
    gap: 18,
    width: "100%",
    alignItems: "start",
  };

  const card = {
    background: "rgba(255,255,255,.72)",
    border: "1px solid rgba(15, 23, 42, .10)",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 18px 50px rgba(15, 23, 42, .10)",
    backdropFilter: "blur(8px)",
    boxSizing: "border-box",
  };

  const formCard = {
    ...card,
    minHeight: activeTab === "clients" ? 620 : 420,
  };

  const listCard = {
    ...card,
    minHeight: 620,
    display: "flex",
    flexDirection: "column",
  };

  const cardTitle = {
    margin: "0 0 14px",
    fontSize: 22,
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
      activeTab === "users"
        ? "linear-gradient(90deg, rgba(196,181,253,.45), rgba(216,180,254,.35))"
        : "linear-gradient(90deg, rgba(167,139,250,.35), rgba(125,211,252,.35))",
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

  const loginMsgBox = {
    marginTop: 14,
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(15, 23, 42, .12)",
    background: "rgba(239,68,68,.10)",
    color: "#991b1b",
    fontSize: 14,
  };

  const successBox = {
    marginTop: 14,
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(15, 23, 42, .12)",
    background: "rgba(34,197,94,.12)",
    color: "#166534",
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

  const passwordWrapper = {
    position: "relative",
  };

  const passwordInput = {
    ...input,
    paddingRight: 52,
  };

  const eyeButton = {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 18,
    color: "#64748b",
    padding: 6,
  };

  if (!user) {
    return (
      <div style={loginPage}>
        <form style={loginCard} onSubmit={handleLogin}>
          <h1 style={{ marginTop: 0, marginBottom: 8 }}>Login</h1>
          <p style={{ marginTop: 0, color: "#475569" }}>
            Entre com seu e-mail e senha para acessar o sistema.
          </p>

          <label style={label}>E-mail</label>
          <input
            style={input}
            type="email"
            placeholder="exemplo@dominio.com"
            value={loginForm.email}
            onChange={(e) => setLoginField("email", e.target.value)}
            disabled={loading}
          />

          <label style={label}>Senha</label>
          <div style={passwordWrapper}>
            <input
              style={passwordInput}
              type={showLoginPassword ? "text" : "password"}
              placeholder="Digite sua senha"
              value={loginForm.password}
              onChange={(e) => setLoginField("password", e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              style={eyeButton}
              onClick={() => setShowLoginPassword((prev) => !prev)}
              aria-label={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
              title={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showLoginPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            <button type="submit" style={btnPrimary} disabled={loading}>
              Entrar
            </button>
          </div>

          {loginMsg && <div style={loginMsgBox}>{loginMsg}</div>}
        </form>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={shell}>
        <aside
          style={sidebar}
          onMouseEnter={() => setMenuOpen(true)}
          onMouseLeave={() => setMenuOpen(false)}
        >
          <h2 style={sidebarTitle}>Menu</h2>

          <button
            type="button"
            style={sideItem(activeTab === "clients", "clients")}
            onClick={() => setActiveTab("clients")}
            title="Clientes"
          >
            <span style={iconBubble("clients")}>📋</span>
            {menuOpen ? "Clientes" : ""}
          </button>

          <button
            type="button"
            style={sideItem(activeTab === "users", "users")}
            onClick={() => setActiveTab("users")}
            title="Usuários"
          >
            <span style={iconBubble("users")}>👤</span>
            {menuOpen ? "Usuários" : ""}
          </button>

          <div style={placeholderItem("next1")} title="Próxima aba">
            <span style={iconBubble("next1")}>➕</span>
            {menuOpen ? "Próxima aba" : ""}
          </div>

          <div style={placeholderItem("next2")} title="Próxima aba">
            <span style={iconBubble("next2")}>➕</span>
            {menuOpen ? "Próxima aba" : ""}
          </div>
        </aside>

        <div style={contentWrap}>
          <div style={headerCard}>
            <div style={headerRow}>
              <div>
                <h1 style={title}>
                  {activeTab === "clients" ? "Clientes" : "Usuários"}
                </h1>
                <p style={subtitle}>
                  Bem-vinda, {user.name}. Use o menu lateral para navegar entre as telas.
                </p>
              </div>

              <div style={pillRow}>
                {activeTab === "clients" && (
                  <span style={pill}>Total: {clients.length}</span>
                )}
                {activeTab === "users" && (
                  <span style={pill}>Total: {users.length}</span>
                )}
                <button style={logoutBtn} onClick={handleLogout}>
                  Sair
                </button>
              </div>
            </div>
          </div>

          {activeTab === "clients" ? (
            <div style={sectionGrid}>
              <div style={formCard}>
                <div style={cardTitle}>Cadastro de clientes</div>

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

              <div style={listCard}>
                <div style={topRow}>
                  <div style={cardTitle}>Lista de clientes</div>

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
          ) : (
            <div style={sectionGrid}>
              <div style={formCard}>
                <div style={cardTitle}>
                  {userForm.id ? "Editar usuário" : "Cadastro de usuários"}
                </div>

                <form onSubmit={handleSaveUser}>
                  <label style={label}>Nome</label>
                  <input
                    style={input}
                    type="text"
                    placeholder="Digite o nome"
                    value={userForm.name}
                    onChange={(e) => setUserField("name", e.target.value)}
                    disabled={loading}
                  />

                  <label style={label}>E-mail</label>
                  <input
                    style={input}
                    type="email"
                    placeholder="exemplo@dominio.com"
                    value={userForm.email}
                    onChange={(e) => setUserField("email", e.target.value)}
                    disabled={loading}
                  />

                  <label style={label}>
                    {userForm.id ? "Senha (opcional para alterar)" : "Senha"}
                  </label>
                  <input
                    style={input}
                    type="password"
                    placeholder={
                      userForm.id
                        ? "Digite só se quiser alterar"
                        : "Mínimo 6 caracteres"
                    }
                    value={userForm.password}
                    onChange={(e) => setUserField("password", e.target.value)}
                    disabled={loading}
                  />

                  <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                    <button type="submit" style={btnPrimary} disabled={loading}>
                      {userForm.id ? "Salvar alterações" : "Cadastrar usuário"}
                    </button>

                    <button
                      type="button"
                      style={btnSecondary}
                      onClick={clearUserForm}
                      disabled={loading}
                    >
                      Limpar
                    </button>
                  </div>

                  {userMsg.text && (
                    <div
                      style={
                        userMsg.type === "success"
                          ? successBox
                          : userMsg.type === "error"
                          ? loginMsgBox
                          : msgBox
                      }
                    >
                      {userMsg.text}
                    </div>
                  )}
                </form>
              </div>

              <div style={listCard}>
                <div style={cardTitle}>Lista de usuários</div>

                <div style={tableWrap}>
                  <table style={table}>
                    <thead>
                      <tr>
                        <th style={th}>Quantidade</th>
                        <th style={th}>Nome</th>
                        <th style={th}>E-mail</th>
                        <th style={th}>Cadastrado em</th>
                        <th style={{ ...th, textAlign: "right" }}>Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      {users.map((item, idx) => (
                        <tr key={item.id}>
                          <td style={td}>{idx + 1}</td>
                          <td style={td}>{item.name}</td>
                          <td style={td}>{item.email}</td>
                          <td style={td}>{formatDatePtBr(item.created_at)}</td>
                          <td style={{ ...td, textAlign: "right" }}>
                            <div style={actions}>
                              <button
                                type="button"
                                style={actionBtn("edit")}
                                onClick={() => startEditUser(item)}
                                disabled={loading}
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                style={actionBtn("delete")}
                                onClick={() => onDeleteUser(item.id)}
                                disabled={loading}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {users.length === 0 && (
                        <tr>
                          <td style={emptyTd} colSpan={5}>
                            Nenhum usuário cadastrado ainda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}