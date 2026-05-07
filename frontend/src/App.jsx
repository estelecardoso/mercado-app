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

function formatMoneyPtBr(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return "R$ 0,00";

  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatStock(value, unitMeasure) {
  const n = Number(value);
  const unit = unitMeasure || "UN";

  if (!Number.isFinite(n)) {
    return `0 ${unit}`;
  }

  if (unit === "KG") {
    return `${n.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    })} KG`;
  }

  return `${Math.trunc(n)} UN`;
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function isValidName(name) {
  return /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(name);
}

function cleanEan13(value) {
  return String(value || "").replace(/\D/g, "");
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

  const [clientForm, setClientForm] = useState({
    id: null,
    name: "",
    email: "",
    phone: "",
  });

  const [productForm, setProductForm] = useState({
    id: null,
    ean13: "",
    name: "",
    description: "",
    price: "",
    quantity: "",
    unit_measure: "UN",
  });

  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);

  const [clientMsg, setClientMsg] = useState({
    type: "info",
    text: "",
  });

  const [userMsg, setUserMsg] = useState({
    type: "info",
    text: "",
  });

  const [productMsg, setProductMsg] = useState({
    type: "info",
    text: "",
  });

  const [loginMsg, setLoginMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
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
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

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
      loadProducts();
    }
  }, [user]);

  async function loadClients() {
    try {
      const data = await apiJson(`${API}/clients`);
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      setClientMsg({
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

  async function loadProducts() {
    try {
      const data = await apiJson(`${API}/products`);
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setProductMsg({
        type: "error",
        text: e.message || "Erro ao carregar produtos.",
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

  function setClientField(name, value) {
    setClientForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function setProductField(name, value) {
    setProductForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function clearClientForm() {
    setClientForm({
      id: null,
      name: "",
      email: "",
      phone: "",
    });

    setClientMsg({
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

  function clearProductForm() {
    setProductForm({
      id: null,
      ean13: "",
      name: "",
      description: "",
      price: "",
      quantity: "",
      unit_measure: "UN",
    });

    setProductMsg({
      type: "info",
      text: "",
    });
  }

  function startEditClient(client) {
    setActiveTab("clients");

    setClientForm({
      id: client.id,
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
    });

    setClientMsg({
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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function startEditProduct(product) {
    setActiveTab("products");

    setProductForm({
      id: product.id,
      ean13: product.ean13 || "",
      name: product.name || "",
      description: product.description || "",
      price: product.price || "",
      quantity: product.quantity ?? "",
      unit_measure: product.unit_measure || "UN",
    });

    setProductMsg({
      type: "info",
      text: "Editando produto. Altere os campos e clique em Salvar alterações.",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
        body: JSON.stringify({
          email,
          password,
        }),
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
      setUserMsg({
        type: "error",
        text: "Preencha nome e e-mail.",
      });
      return;
    }

    if (!isValidName(name)) {
      setUserMsg({
        type: "error",
        text: "O nome deve conter apenas letras.",
      });
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

    setUserMsg({
      type: "info",
      text: "",
    });

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
    setProducts([]);
    setActiveTab("clients");
    setMenuOpen(false);

    setClientForm({
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

    setProductForm({
      id: null,
      ean13: "",
      name: "",
      description: "",
      price: "",
      quantity: "",
      unit_measure: "UN",
    });

    setClientMsg({
      type: "info",
      text: "",
    });

    setUserMsg({
      type: "info",
      text: "",
    });

    setProductMsg({
      type: "info",
      text: "",
    });

    setClientQuery("");
    setProductQuery("");
    setLoginMsg("");
  }

  async function onDeleteClient(id) {
    if (loading) return;

    const ok = confirm("Tem certeza que deseja excluir este cliente?");

    if (!ok) return;

    setLoading(true);

    setClientMsg({
      type: "info",
      text: "",
    });

    try {
      await apiJson(`${API}/clients/${id}`, {
        method: "DELETE",
      });

      setClientMsg({
        type: "success",
        text: "Cliente excluído com sucesso!",
      });

      if (clientForm.id === id) {
        clearClientForm();
      }

      await loadClients();
    } catch (e) {
      setClientMsg({
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

    setUserMsg({
      type: "info",
      text: "",
    });

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

  async function onDeleteProduct(id) {
    if (loading) return;

    const ok = confirm("Tem certeza que deseja excluir este produto?");

    if (!ok) return;

    setLoading(true);

    setProductMsg({
      type: "info",
      text: "",
    });

    try {
      await apiJson(`${API}/products/${id}`, {
        method: "DELETE",
      });

      setProductMsg({
        type: "success",
        text: "Produto excluído com sucesso!",
      });

      if (productForm.id === id) {
        clearProductForm();
      }

      await loadProducts();
    } catch (e) {
      setProductMsg({
        type: "error",
        text: e.message || "Erro ao excluir produto.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitClient(e) {
    e.preventDefault();

    if (loading) return;

    const name = clientForm.name.trim();
    const email = clientForm.email.trim().toLowerCase();
    const phone = clientForm.phone ? clientForm.phone.replace(/\D/g, "") : "";

    if (!name) {
      setClientMsg({
        type: "error",
        text: "Digite o nome.",
      });
      return;
    }

    if (!isValidName(name)) {
      setClientMsg({
        type: "error",
        text: "O nome deve conter apenas letras.",
      });
      return;
    }

    if (!email) {
      setClientMsg({
        type: "error",
        text: "Digite o e-mail.",
      });
      return;
    }

    if (!isValidEmail(email)) {
      setClientMsg({
        type: "error",
        text: "Digite um e-mail válido, exemplo exemplo@dominio.com",
      });
      return;
    }

    if (phone && !(phone.length === 10 || phone.length === 11)) {
      setClientMsg({
        type: "error",
        text: "Telefone deve ter 10 ou 11 dígitos.",
      });
      return;
    }

    setLoading(true);

    setClientMsg({
      type: "info",
      text: "",
    });

    try {
      if (clientForm.id) {
        await apiJson(`${API}/clients/${clientForm.id}`, {
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

        setClientMsg({
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

        setClientMsg({
          type: "success",
          text: "Cliente cadastrado com sucesso!",
        });
      }

      clearClientForm();
      await loadClients();
    } catch (e) {
      setClientMsg({
        type: "error",
        text: e.message || "Erro ao salvar.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitProduct(e) {
    e.preventDefault();

    if (loading) return;

    const ean13 = cleanEan13(productForm.ean13);
    const name = productForm.name.trim();
    const description = productForm.description.trim();
    const price = Number(productForm.price);
    const quantity = Number(productForm.quantity);
    const unit_measure = productForm.unit_measure || "UN";

    if (!ean13) {
      setProductMsg({
        type: "error",
        text: "Digite o código EAN-13 do produto.",
      });
      return;
    }

    if (!isValidEan13(ean13)) {
      setProductMsg({
        type: "error",
        text: "O código EAN-13 deve conter 13 dígitos válidos.",
      });
      return;
    }

    if (!name) {
      setProductMsg({
        type: "error",
        text: "Digite o nome do produto.",
      });
      return;
    }

    if (name.length < 2) {
      setProductMsg({
        type: "error",
        text: "O nome do produto deve ter pelo menos 2 caracteres.",
      });
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setProductMsg({
        type: "error",
        text: "O preço deve ser um número maior ou igual a zero.",
      });
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 0) {
      setProductMsg({
        type: "error",
        text: "A quantidade em estoque deve ser maior ou igual a zero.",
      });
      return;
    }

    if (unit_measure === "UN" && !Number.isInteger(quantity)) {
      setProductMsg({
        type: "error",
        text: "Para UN, a quantidade precisa ser um número inteiro.",
      });
      return;
    }

    setLoading(true);

    setProductMsg({
      type: "info",
      text: "",
    });

    try {
      if (productForm.id) {
        await apiJson(`${API}/products/${productForm.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ean13,
            name,
            description,
            price,
            quantity,
            unit_measure,
          }),
        });

        setProductMsg({
          type: "success",
          text: "Alterações salvas com sucesso!",
        });
      } else {
        await apiJson(`${API}/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ean13,
            name,
            description,
            price,
            quantity,
            unit_measure,
          }),
        });

        setProductMsg({
          type: "success",
          text: "Produto cadastrado com sucesso!",
        });
      }

      clearProductForm();
      await loadProducts();
    } catch (e) {
      setProductMsg({
        type: "error",
        text: e.message || "Erro ao salvar produto.",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = useMemo(() => {
    const q = normalizeText(clientQuery);

    if (!q) return clients;

    const terms = q.split(/\s+/).filter(Boolean);

    return clients.filter((c) => {
      const searchable = normalizeText(
        `${c.name || ""} ${c.email || ""} ${c.phone || ""}`
      );

      return terms.every((term) => searchable.includes(term));
    });
  }, [clients, clientQuery]);

  const filteredProducts = useMemo(() => {
    const q = normalizeText(productQuery);

    if (!q) return products;

    const terms = q.split(/\s+/).filter(Boolean);

    return products.filter((p) => {
      const searchable = normalizeText(
        `${p.ean13 || ""} ${p.name || ""} ${p.description || ""} ${
          p.price || ""
        } ${p.quantity || ""} ${p.unit_measure || ""}`
      );

      return terms.every((term) => searchable.includes(term));
    });
  }, [products, productQuery]);

  const isEditingClient = Boolean(clientForm.id);
  const isEditingProduct = Boolean(productForm.id);

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
      },
      users: {
        activeBg: "rgba(221, 214, 254, .65)",
        activeBorder: "rgba(167, 139, 250, .30)",
      },
      products: {
        activeBg: "rgba(254, 240, 138, .55)",
        activeBorder: "rgba(250, 204, 21, .30)",
      },
      next2: {
        activeBg: "rgba(253, 230, 138, .45)",
        activeBorder: "rgba(245, 158, 11, .22)",
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
      products: "rgba(253, 224, 71, .35)",
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
      variant === "next2"
        ? "rgba(255, 247, 237, .65)"
        : "rgba(255, 251, 235, .65)",
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
    minHeight:
      activeTab === "clients" ? 620 : activeTab === "products" ? 680 : 420,
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
        : activeTab === "products"
        ? "linear-gradient(90deg, rgba(253,224,71,.45), rgba(252,211,77,.35))"
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

  const getMessageBox = (type) => ({
    marginTop: 14,
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(15, 23, 42, .12)",
    background:
      type === "success"
        ? "rgba(34,197,94,.12)"
        : type === "error"
        ? "rgba(239,68,68,.10)"
        : "rgba(255,255,255,.7)",
    color:
      type === "success"
        ? "#166534"
        : type === "error"
        ? "#991b1b"
        : "#334155",
    fontSize: 14,
  });

  const loginMsgBox = {
    marginTop: 14,
    borderRadius: 14,
    padding: "12px 14px",
    border: "1px solid rgba(15, 23, 42, .12)",
    background: "rgba(239,68,68,.10)",
    color: "#991b1b",
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

          <button
            type="button"
            style={sideItem(activeTab === "products", "products")}
            onClick={() => setActiveTab("products")}
            title="Produtos"
          >
            <span style={iconBubble("products")}>📦</span>
            {menuOpen ? "Produtos" : ""}
          </button>

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
                  {activeTab === "clients"
                    ? "Clientes"
                    : activeTab === "users"
                    ? "Usuários"
                    : "Produtos"}
                </h1>

                <p style={subtitle}>
                  Olá, {user.name}! Use o menu lateral para navegar entre as telas.
                </p>
              </div>

              <div style={pillRow}>
                {activeTab === "clients" && (
                  <span style={pill}>Total: {clients.length}</span>
                )}

                {activeTab === "users" && (
                  <span style={pill}>Total: {users.length}</span>
                )}

                {activeTab === "products" && (
                  <span style={pill}>Total: {products.length}</span>
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

                <form onSubmit={onSubmitClient}>
                  <label style={label}>Nome *</label>

                  <input
                    style={input}
                    placeholder="Digite o nome"
                    value={clientForm.name}
                    onChange={(e) => setClientField("name", e.target.value)}
                    disabled={loading}
                  />

                  <label style={label}>E-mail *</label>

                  <input
                    style={input}
                    placeholder="exemplo@dominio.com"
                    value={clientForm.email}
                    onChange={(e) => setClientField("email", e.target.value)}
                    disabled={loading}
                  />

                  <label style={label}>Telefone (10 ou 11)</label>

                  <input
                    style={input}
                    placeholder="Somente números"
                    value={clientForm.phone}
                    onChange={(e) =>
                      setClientField("phone", e.target.value.replace(/\D/g, ""))
                    }
                    disabled={loading}
                  />

                  <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                    <button type="submit" style={btnPrimary} disabled={loading}>
                      {isEditingClient ? "Salvar alterações" : "Salvar"}
                    </button>

                    <button
                      type="button"
                      style={btnSecondary}
                      onClick={clearClientForm}
                      disabled={loading}
                    >
                      Limpar
                    </button>
                  </div>

                  <div style={hint}>
                    Dica: clique em <b>Editar</b> na tabela para preencher o
                    formulário.
                  </div>

                  {clientMsg.text && (
                    <div style={getMessageBox(clientMsg.type)}>
                      {clientMsg.text}
                    </div>
                  )}
                </form>
              </div>

              <div style={listCard}>
                <div style={topRow}>
                  <div style={cardTitle}>Lista de clientes</div>

                  <input
                    style={search}
                    placeholder="Buscar por nome, e-mail ou telefone..."
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
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
                      {filteredClients.map((c, idx) => (
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
                                onClick={() => startEditClient(c)}
                                disabled={loading}
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                style={actionBtn("delete")}
                                onClick={() => onDeleteClient(c.id)}
                                disabled={loading}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredClients.length === 0 && (
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
          ) : activeTab === "users" ? (
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
                    <div style={getMessageBox(userMsg.type)}>
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
          ) : (
            <div style={sectionGrid}>
              <div style={formCard}>
                <div style={cardTitle}>
                  {productForm.id ? "Editar produto" : "Cadastro de produtos"}
                </div>

                <form onSubmit={onSubmitProduct}>
                  <label style={label}>Código EAN-13 *</label>

                  <input
                    style={input}
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    placeholder="Ex: 7891234567895"
                    value={productForm.ean13}
                    onChange={(e) =>
                      setProductField(
                        "ean13",
                        e.target.value.replace(/\D/g, "").slice(0, 13)
                      )
                    }
                    disabled={loading}
                  />

                  <label style={label}>Nome *</label>

                  <input
                    style={input}
                    type="text"
                    placeholder="Digite o nome do produto"
                    value={productForm.name}
                    onChange={(e) => setProductField("name", e.target.value)}
                    disabled={loading}
                  />

                  <label style={label}>Descrição</label>

                  <input
                    style={input}
                    type="text"
                    placeholder="Descrição do produto"
                    value={productForm.description}
                    onChange={(e) =>
                      setProductField("description", e.target.value)
                    }
                    disabled={loading}
                  />

                  <label style={label}>Preço *</label>

                  <input
                    style={input}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 99.90"
                    value={productForm.price}
                    onChange={(e) => setProductField("price", e.target.value)}
                    disabled={loading}
                  />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px",
                      gap: 10,
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <label style={label}>Quantidade em estoque *</label>

                      <input
                        style={input}
                        type="number"
                        min="0"
                        step={productForm.unit_measure === "KG" ? "0.001" : "1"}
                        placeholder={
                          productForm.unit_measure === "KG"
                            ? "Ex: 2.500"
                            : "Ex: 10"
                        }
                        value={productForm.quantity}
                        onChange={(e) =>
                          setProductField("quantity", e.target.value)
                        }
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label style={label}>Unidade</label>

                      <select
                        style={input}
                        value={productForm.unit_measure}
                        onChange={(e) => {
                          const selected = e.target.value;
                          setProductField("unit_measure", selected);

                          if (selected === "UN" && productForm.quantity) {
                            const n = Number(productForm.quantity);

                            if (Number.isFinite(n)) {
                              setProductField("quantity", String(Math.trunc(n)));
                            }
                          }
                        }}
                        disabled={loading}
                      >
                        <option value="UN">UN</option>
                        <option value="KG">KG</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                    <button type="submit" style={btnPrimary} disabled={loading}>
                      {isEditingProduct ? "Salvar alterações" : "Salvar"}
                    </button>

                    <button
                      type="button"
                      style={btnSecondary}
                      onClick={clearProductForm}
                      disabled={loading}
                    >
                      Limpar
                    </button>
                  </div>

                  <div style={hint}>
                    Dica: clique em <b>Editar</b> na tabela para preencher o
                    formulário.
                  </div>

                  {productMsg.text && (
                    <div style={getMessageBox(productMsg.type)}>
                      {productMsg.text}
                    </div>
                  )}
                </form>
              </div>

              <div style={listCard}>
                <div style={topRow}>
                  <div style={cardTitle}>Lista de produtos</div>

                  <input
                    style={search}
                    placeholder="Buscar por EAN-13, nome, descrição, preço ou estoque..."
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div style={tableWrap}>
                  <table style={table}>
                    <thead>
                      <tr>
                        <th style={th}>EAN-13</th>
                        <th style={th}>Nome</th>
                        <th style={th}>Descrição</th>
                        <th style={th}>Preço</th>
                        <th style={th}>Estoque</th>
                        <th style={th}>Cadastrado em</th>
                        <th style={{ ...th, textAlign: "right" }}>Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr key={p.id}>
                          <td style={td}>{p.ean13 || "-"}</td>
                          <td style={td}>{p.name}</td>
                          <td style={td}>{p.description || "-"}</td>
                          <td style={td}>{formatMoneyPtBr(p.price)}</td>
                          <td style={td}>
                            {formatStock(p.quantity, p.unit_measure)}
                          </td>
                          <td style={td}>{formatDatePtBr(p.created_at)}</td>

                          <td style={{ ...td, textAlign: "right" }}>
                            <div style={actions}>
                              <button
                                type="button"
                                style={actionBtn("edit")}
                                onClick={() => startEditProduct(p)}
                                disabled={loading}
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                style={actionBtn("delete")}
                                onClick={() => onDeleteProduct(p.id)}
                                disabled={loading}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredProducts.length === 0 && (
                        <tr>
                          <td style={emptyTd} colSpan={7}>
                            Nenhum produto cadastrado ainda.
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
