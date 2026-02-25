import { useState, useEffect, useRef, useCallback } from "react";

// ── API ──────────────────────────────────────────────────────────────────────
const BASE = "/api";
let _token = localStorage.getItem("tg_token") || "";

async function api(method, path, body, requireAuth = true) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (requireAuth && _token) headers["Authorization"] = `Bearer ${_token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    _token = "";
    localStorage.removeItem("tg_token");
    window.location.reload();
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}



// ── Icons ────────────────────────────────────────────────────────────────────
function Icon({ d, size = 16, stroke = "currentColor", fill = "none", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function TgIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function Spinner({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none"
      style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

// ── Primitives ───────────────────────────────────────────────────────────────
const inputStyle = {
  background: "#09090b", border: "1px solid #27272a", borderRadius: 8,
  padding: "10px 12px", color: "#f4f4f5", fontSize: 14,
  fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
  transition: "border-color .15s",
};

const selectStyle = {
  background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8,
  padding: "7px 10px", color: "#d4d4d8", fontSize: 13,
  fontFamily: "inherit", outline: "none", cursor: "pointer", maxWidth: 140,
};

function Btn({ children, onClick, disabled, style, variant = "primary", loading }) {
  const variants = {
    primary: { background: "#2563eb", color: "#fff" },
    dark:    { background: "#27272a", color: "#d4d4d8", border: "1px solid #3f3f46" },
    danger:  { background: "rgba(239,68,68,.15)", color: "#f87171", border: "1px solid rgba(239,68,68,.25)" },
  };
  return (
    <button
      onClick={!disabled && !loading ? onClick : undefined}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        width: "100%", padding: "10px 16px", borderRadius: 8, border: "none",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        fontSize: 14, fontWeight: 600, fontFamily: "inherit",
        transition: "opacity .15s, transform .1s",
        opacity: disabled || loading ? .5 : 1,
        ...variants[variant], ...style,
      }}>
      {loading ? <><Spinner /> Загрузка...</> : children}
    </button>
  );
}

function Toggle({ value, onChange, disabled }) {
  return (
    <div onClick={disabled ? undefined : () => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, flexShrink: 0,
      cursor: disabled ? "not-allowed" : "pointer",
      background: value ? "#2563eb" : "#3f3f46",
      transition: "background .2s", position: "relative",
      opacity: disabled ? .5 : 1,
    }}>
      <div style={{
        position: "absolute", top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.4)",
      }} />
    </div>
  );
}

function Badge({ connected }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: connected ? "rgba(34,197,94,.12)" : "rgba(120,120,140,.1)",
      color: connected ? "#4ade80" : "#71717a",
      border: `1px solid ${connected ? "rgba(74,222,128,.2)" : "rgba(120,120,140,.2)"}`,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? "#4ade80" : "#555", display: "inline-block", flexShrink: 0 }} />
      {connected ? "Подключён" : "Не подключён"}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#18181b", border: "1px solid #27272a",
      borderRadius: 12, padding: "18px 20px", ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title, subtitle, right }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ color: "#60a5fa", flexShrink: 0 }}>{icon}</span>
          <span style={{ color: "#f4f4f5", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>{title}</span>
        </div>
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
      <p style={{ color: "#71717a", fontSize: 12, margin: 0, paddingLeft: 26, lineHeight: 1.4 }}>{subtitle}</p>
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, padding: "12px 0", borderBottom: "1px solid #27272a", flexWrap: "wrap",
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, color: "#f4f4f5", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: "#71717a", marginTop: 1 }}>{description}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function ErrorToast({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, left: 20, zIndex: 9999,
      maxWidth: 380, margin: "0 auto",
      background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 10,
      padding: "12px 16px", display: "flex", gap: 10, alignItems: "center",
      boxShadow: "0 4px 24px rgba(0,0,0,.6)",
    }}>
      <span style={{ color: "#fca5a5", fontSize: 13, flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 20, lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  LOGIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit() {
    if (!login.trim() || !password.trim()) { setError("Заполни все поля"); return; }
    setLoading(true);
    setError("");
    try {
      const d = await api("POST", "/admin/login", { login, password }, false);
      _token = d.token;
      localStorage.setItem("tg_token", d.token);
      onLogin();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#09090b",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <TgIcon size={26} />
          </div>
          <div style={{ color: "#f4f4f5", fontWeight: 800, fontSize: 22, letterSpacing: -.5 }}>TG Auto-Sender</div>
          <div style={{ color: "#52525b", fontSize: 13, marginTop: 4 }}>Войдите в панель управления</div>
        </div>

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>
                {error}
              </div>
            )}
            <div>
              <label style={{ display: "block", color: "#a1a1aa", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: .3 }}>ЛОГИН</label>
              <input
                value={login} onChange={e => setLogin(e.target.value)}
                placeholder="admin"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={inputStyle}
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: "block", color: "#a1a1aa", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: .3 }}>ПАРОЛЬ</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  style={{ ...inputStyle, paddingRight: 42 }}
                />
                <button onClick={() => setShowPw(!showPw)} style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "#52525b", cursor: "pointer", padding: 0,
                }}>
                  <Icon d={showPw ? "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" : "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"} size={16} />
                </button>
              </div>
            </div>
            <Btn onClick={handleSubmit} loading={loading} style={{ marginTop: 4 }}>
              <Icon d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13 12H3" size={15} stroke="#fff" />
              Войти
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [authed, setAuthed] = useState(!!_token);

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => { _token = ""; localStorage.removeItem("tg_token"); setAuthed(false); }} />;
}

function Dashboard({ onLogout }) {
  // Telegram auth
  const [tgConnected, setTgConnected] = useState(false);
  const [me, setMe] = useState(null);
  const [authStep, setAuthStep] = useState("idle");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [tgPassword, setTgPassword] = useState("");
  const [need2FA, setNeed2FA] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState("phone"); // "phone" | "qr"
  const [qrImage, setQrImage] = useState("");
  const [qrStatus, setQrStatus] = useState(""); // pending | 2fa | done | error
  const [qrPollRef, setQrPollRef] = useState(null);
  const [tgPw2fa, setTgPw2fa] = useState("");
  const [pw2faLoading, setPw2faLoading] = useState(false);

  // Data
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newChat, setNewChat] = useState("");
  const [newMsg, setNewMsg] = useState("");
  const [showMsgMgr, setShowMsgMgr] = useState(false);

  // API keys
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [apiConfigured, setApiConfigured] = useState(false);
  const [apiSaving, setApiSaving] = useState(false);
  const [showApiEditor, setShowApiEditor] = useState(false);

  // Settings
  const [autoSend, setAutoSend] = useState(false);
  const [interval, setIntervalVal] = useState(3600);
  const [intervalMinutes, setIntervalMinutes] = useState("60");
  const [msgOrder, setMsgOrder] = useState("sequential");

  // UI
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [mobileTab, setMobileTab] = useState("left"); // "left" | "right"
  const logsEndRef = useRef(null);

  const showError = (msg) => { setError(msg); setTimeout(() => setError(""), 5000); };

  // Poll logs
  const fetchLogs = useCallback(async () => {
    try { const d = await api("GET", "/logs"); setLogs(d.logs); } catch {}
  }, []);

  useEffect(() => {
    const id = setInterval(fetchLogs, 2500);
    return () => clearInterval(id);
  }, [fetchLogs]);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Init
  useEffect(() => {
    (async () => {
      try {
        const [authData, chatsData, msgsData, settings, apiKeys] = await Promise.all([
          api("GET", "/auth/me"),
          api("GET", "/chats"),
          api("GET", "/messages"),
          api("GET", "/settings"),
          api("GET", "/apikeys"),
        ]);
        setApiId(apiKeys.api_id || "");
        setApiConfigured(apiKeys.configured);
        if (authData.connected) { setTgConnected(true); setMe(authData.me); setAuthStep("done"); }
        setChats(chatsData.chats);
        setMessages(msgsData.messages);
        setAutoSend(settings.auto_send);
        setIntervalVal(settings.interval);
        setIntervalMinutes(String(Math.round(settings.interval / 60)));
        setMsgOrder(settings.msg_order);
      } catch {}
    })();
  }, []);

  // ── Telegram Auth ──
  async function handleTgConnect() {
    setAuthLoading(true);
    try {
      if (authStep === "idle") { setAuthStep("phone"); }
      else if (authStep === "phone") {
        await api("POST", "/auth/send-code", { phone });
        setAuthStep("code");
      } else if (authStep === "code") {
        try {
          const d = await api("POST", "/auth/verify-code", { phone, code, password: tgPassword || null });
          setTgConnected(true); setMe(d.me); setAuthStep("done");
        } catch (e) {
          if (e.message.includes("2FA") || e.message.includes("двухфакторной")) setNeed2FA(true);
          else throw e;
        }
      }
    } catch (e) { showError(e.message); }
    setAuthLoading(false);
  }

  async function handleTgLogout() {
    await api("POST", "/auth/logout").catch(() => {});
    setTgConnected(false); setMe(null); setAuthStep("idle");
    setPhone(""); setCode(""); setTgPassword(""); setNeed2FA(false);
  }

  // ── Chats ──
  async function addChat() {
    const v = newChat.trim(); if (!v) return;
    try { const d = await api("POST", "/chats", { chat: v }); setChats(d.chats); setNewChat(""); }
    catch (e) { showError(e.message); }
  }

  async function removeChat(c) {
    try { const d = await api("DELETE", `/chats/${encodeURIComponent(c)}`); setChats(d.chats); }
    catch (e) { showError(e.message); }
  }

  // ── Messages ──
  async function addMessage() {
    if (!newMsg.trim()) return;
    try { const d = await api("POST", "/messages", { text: newMsg.trim() }); setMessages(d.messages); setNewMsg(""); }
    catch (e) { showError(e.message); }
  }

  async function deleteMessage(i) {
    try { const d = await api("DELETE", `/messages/${i}`); setMessages(d.messages); }
    catch (e) { showError(e.message); }
  }

  // ── Settings ──
  async function updateSettings(patch) {
    const payload = { auto_send: autoSend, interval, msg_order: msgOrder, ...patch };
    try {
      await api("PUT", "/settings", payload);
      if ("auto_send" in patch) setAutoSend(patch.auto_send);
      if ("interval" in patch) setIntervalVal(patch.interval);
      if ("msg_order" in patch) setMsgOrder(patch.msg_order);
    } catch (e) { showError(e.message); }
  }

  // ── API Keys ──
  async function saveApiKeys() {
    if (!apiId.trim() || !apiHash.trim()) { showError("Заполни оба поля"); return; }
    setApiSaving(true);
    try {
      await api("POST", "/apikeys", { api_id: apiId.trim(), api_hash: apiHash.trim() });
      setApiConfigured(true);
      setShowApiEditor(false);
      setApiHash(""); // очищаем hash из памяти после сохранения
    } catch (e) { showError(e.message); }
    setApiSaving(false);
  }

  // ── QR Login ──
  async function startQr() {
    try {
      const d = await api("POST", "/auth/qr-start");
      setQrImage(d.qr);
      setQrStatus("pending");
      // Poll every 2s
      const id = setInterval(async () => {
        try {
          const p = await api("GET", "/auth/qr-poll");
          if (p.status === "done") {
            clearInterval(id);
            setQrStatus("done");
            setQrImage("");
            setTgConnected(true); setMe(p.me); setAuthStep("done");
          } else if (p.status === "2fa") {
            clearInterval(id);
            setQrStatus("2fa");
          } else if (p.status === "pending" && p.qr) {
            setQrImage(p.qr); // обновляем QR
          } else if (p.status === "error") {
            clearInterval(id);
            setQrStatus("error");
          }
        } catch {}
      }, 2000);
      setQrPollRef(id);
    } catch (e) { showError(e.message); }
  }

  async function cancelQr() {
    if (qrPollRef) clearInterval(qrPollRef);
    setQrImage(""); setQrStatus("");
    await api("POST", "/auth/qr-cancel").catch(() => {});
  }

  async function submit2fa() {
    if (!tgPw2fa) return;
    setPw2faLoading(true);
    try {
      const d = await api("POST", "/auth/qr-2fa", { password: tgPw2fa });
      setTgConnected(true); setMe(d.me); setAuthStep("done");
      setQrImage(""); setQrStatus(""); setTgPw2fa("");
    } catch (e) { showError(e.message); }
    setPw2faLoading(false);
  }

  // ── Send ──
  async function sendNow() {
    if (!tgConnected) { showError("Сначала подключи Telegram"); return; }
    setSending(true);
    try { await api("POST", "/send"); } catch (e) { showError(e.message); }
    setSending(false);
  }

  const logColors = { OK: "#4ade80", FAIL: "#f87171", WARN: "#facc15", INFO: "#60a5fa" };

  // ── Left column content ──
  const leftColumn = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Telegram Auth */}
      <Card>
        <CardHeader
          icon={<Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={16} />}
          title="Telegram"
          subtitle="Подключи аккаунт для отправки сообщений"
          right={<Badge connected={tgConnected} />}
        />
        {/* API Keys block */}
        <div style={{ marginBottom: 14, padding: "10px 12px", background: "#09090b", border: `1px solid ${apiConfigured ? "rgba(74,222,128,.2)" : "rgba(234,179,8,.25)"}`, borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: apiConfigured ? "#4ade80" : "#fbbf24" }}>
                {apiConfigured ? "✓" : "⚠"} API ключи
              </span>
              {!apiConfigured && <span style={{ fontSize: 11, color: "#71717a" }}>— не настроены</span>}
              {apiConfigured && apiId && <span style={{ fontSize: 11, color: "#52525b" }}>ID: {apiId}</span>}
            </div>
            <button onClick={() => setShowApiEditor(!showApiEditor)}
              style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: 11, fontFamily: "inherit", padding: "2px 6px" }}>
              {showApiEditor ? "Скрыть" : "Изменить"}
            </button>
          </div>
          {showApiEditor && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <label style={{ display: "block", color: "#71717a", fontSize: 11, marginBottom: 4 }}>API ID</label>
                <input value={apiId} onChange={e => setApiId(e.target.value)}
                  placeholder="12345678" style={{ ...inputStyle, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: "block", color: "#71717a", fontSize: 11, marginBottom: 4 }}>API Hash</label>
                <input value={apiHash} onChange={e => setApiHash(e.target.value)}
                  placeholder="вставь api_hash из my.telegram.org" style={{ ...inputStyle, fontSize: 13 }} />
              </div>
              <div style={{ fontSize: 11, color: "#52525b" }}>
                Получить на <a href="https://my.telegram.org" target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>my.telegram.org</a> → API development tools
              </div>
              <Btn onClick={saveApiKeys} loading={apiSaving} style={{ marginTop: 2 }}>
                Сохранить ключи
              </Btn>
            </div>
          )}
        </div>

        {authStep === "idle" && (
          <>
            {/* Tabs: Phone / QR */}
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #27272a", marginBottom: 14 }}>
              {[["phone", "📱 Телефон"], ["qr", "📷 QR-код"]].map(([mode, label]) => (
                <button key={mode} onClick={() => { setAuthMode(mode); cancelQr(); }}
                  style={{
                    flex: 1, padding: "9px 0", background: authMode === mode ? "#27272a" : "transparent",
                    border: "none", color: authMode === mode ? "#f4f4f5" : "#71717a",
                    fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>{label}</button>
              ))}
            </div>

            {authMode === "phone" && (
              <Btn onClick={handleTgConnect} disabled={!apiConfigured}>
                <Icon d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13 12H3" size={15} stroke="#fff" />
                Войти по номеру телефона
              </Btn>
            )}

            {authMode === "qr" && qrStatus === "" && (
              <Btn onClick={() => { if (apiConfigured) startQr(); }} disabled={!apiConfigured}>
                <Icon d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" size={15} stroke="#fff" />
                Показать QR-код
              </Btn>
            )}

            {authMode === "qr" && qrStatus === "pending" && qrImage && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ background: "#fff", borderRadius: 12, padding: 12, display: "inline-block" }}>
                  <img src={`data:image/png;base64,${qrImage}`} alt="QR" style={{ width: 180, height: 180, display: "block" }} />
                </div>
                <div style={{ color: "#71717a", fontSize: 12, textAlign: "center", lineHeight: 1.6 }}>
                  Открой Telegram → Настройки →<br/>
                  <strong style={{ color: "#d4d4d8" }}>Устройства → Подключить устройство</strong><br/>
                  и отсканируй этот код
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#52525b", fontSize: 11 }}>
                  <Spinner size={11} /> Ожидаю сканирования...
                </div>
                <button onClick={cancelQr}
                  style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                  Отмена
                </button>
              </div>
            )}

            {authMode === "qr" && qrStatus === "2fa" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ color: "#fbbf24", fontSize: 13, margin: 0, textAlign: "center" }}>🔐 QR отсканирован! Введи пароль 2FA:</p>
                <input type="password" value={tgPw2fa} onChange={e => setTgPw2fa(e.target.value)}
                  placeholder="Пароль двухфакторной аутентификации"
                  style={inputStyle} onKeyDown={e => e.key === "Enter" && submit2fa()} autoFocus />
                <Btn onClick={submit2fa} loading={pw2faLoading}>Подтвердить</Btn>
              </div>
            )}

            {authMode === "qr" && qrStatus === "error" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>Ошибка QR, попробуй ещё раз</p>
                <Btn onClick={startQr} variant="dark">Обновить QR</Btn>
              </div>
            )}

            {!apiConfigured && (
              <p style={{ color: "#71717a", fontSize: 12, textAlign: "center", marginTop: 8 }}>Сначала укажи API ключи выше</p>
            )}
          </>
        )}
        {authStep === "phone" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ color: "#71717a", fontSize: 12, margin: 0 }}>Номер телефона с кодом страны:</p>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 900 000 00 00"
              style={inputStyle} onKeyDown={e => e.key === "Enter" && handleTgConnect()} />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => setAuthStep("idle")} variant="dark" style={{ flex: "0 0 auto", width: "auto", padding: "0 14px" }}>←</Btn>
              <Btn onClick={handleTgConnect} loading={authLoading}>Отправить код</Btn>
            </div>
          </div>
        )}
        {authStep === "code" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ color: "#71717a", fontSize: 12, margin: 0 }}>Код из Telegram:</p>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="12345" maxLength={6}
              style={{ ...inputStyle, letterSpacing: 10, fontSize: 20, textAlign: "center" }}
              onKeyDown={e => e.key === "Enter" && handleTgConnect()} />
            {need2FA && (
              <>
                <p style={{ color: "#fbbf24", fontSize: 12, margin: 0 }}>Пароль 2FA:</p>
                <input type="password" value={tgPassword} onChange={e => setTgPassword(e.target.value)}
                  placeholder="Пароль" style={inputStyle} onKeyDown={e => e.key === "Enter" && handleTgConnect()} />
              </>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => setAuthStep("phone")} variant="dark" style={{ flex: "0 0 auto", width: "auto", padding: "0 14px" }}>←</Btn>
              <Btn onClick={handleTgConnect} loading={authLoading}>Подтвердить</Btn>
            </div>
          </div>
        )}
        {authStep === "done" && me && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#f4f4f5", fontSize: 13, fontWeight: 600 }}>
                {me.first_name}{me.username ? ` (@${me.username})` : ""}
              </div>
              <div style={{ color: "#52525b", fontSize: 12 }}>{me.phone}</div>
            </div>
            <Btn onClick={handleTgLogout} variant="danger" style={{ width: "auto", padding: "7px 14px" }}>Выйти</Btn>
          </div>
        )}
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader
          icon={<Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" size={16} />}
          title="Сообщения"
          subtitle="Список сообщений для рассылки"
          right={
            <button onClick={() => setShowMsgMgr(!showMsgMgr)}
              style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "2px 6px" }}>
              {showMsgMgr ? "Готово" : "Изменить"}
            </button>
          }
        />
        {messages.length === 0 && (
          <div style={{ color: "#52525b", fontSize: 13, textAlign: "center", padding: "14px 0" }}>Нет сообщений</div>
        )}
        <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1, background: "#09090b", border: "1px solid #27272a", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#d4d4d8", lineHeight: 1.5, minWidth: 0 }}>
                <span style={{ color: "#52525b", fontSize: 11, marginRight: 6 }}>#{i + 1}</span>
                <span style={{ wordBreak: "break-word" }}>{m}</span>
              </div>
              {showMsgMgr && (
                <button onClick={() => deleteMessage(i)}
                  style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", padding: "8px 2px", flexShrink: 0 }}>
                  <Icon d="M18 6L6 18M6 6l12 12" size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        {showMsgMgr && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)}
              placeholder="Новое сообщение... (Ctrl+Enter для добавления)"
              rows={2}
              style={{ ...inputStyle, resize: "vertical", flex: 1 }}
              onKeyDown={e => e.key === "Enter" && e.ctrlKey && addMessage()}
            />
            <button onClick={addMessage}
              style={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: 8, color: "#a1a1aa", cursor: "pointer", padding: "0 14px", fontSize: 22, flexShrink: 0 }}>
              +
            </button>
          </div>
        )}
      </Card>
    </div>
  );

  // ── Right column content ──
  const rightColumn = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Chats */}
      <Card>
        <CardHeader
          icon={<Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" size={16} />}
          title="Chats"
          subtitle="Группы и каналы для рассылки"
          right={
            <span style={{ background: "#27272a", color: "#a1a1aa", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
              {chats.length}
            </span>
          }
        />
        <div style={{ marginBottom: 12 }}>
          {chats.length === 0 ? (
            <div style={{ border: "2px dashed #27272a", borderRadius: 10, padding: "20px 0", textAlign: "center", color: "#52525b", fontSize: 13 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>#</div>
              No chats added yet
            </div>
          ) : (
            <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {chats.map(c => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "#09090b", border: "1px solid #27272a" }}>
                  <span style={{ color: "#60a5fa", flexShrink: 0 }}>#</span>
                  <span style={{ flex: 1, fontSize: 13, color: "#d4d4d8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c}</span>
                  <button onClick={() => removeChat(c)} style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", padding: "2px", flexShrink: 0 }}>
                    <Icon d="M18 6L6 18M6 6l12 12" size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newChat} onChange={e => setNewChat(e.target.value)}
            placeholder="@username или t.me/..."
            onKeyDown={e => e.key === "Enter" && addChat()}
            style={{ ...inputStyle, flex: 1 }} />
          <Btn onClick={addChat} style={{ width: "auto", padding: "0 14px", flexShrink: 0 }}>+</Btn>
        </div>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader
          icon={<Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" size={16} />}
          title="Settings"
          subtitle="Настройки авто-рассылки"
        />
        <SettingRow label="Интервал" description="Как часто отправлять (в минутах)">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="number" min="1" max="1440"
              value={intervalMinutes}
              onChange={e => setIntervalMinutes(e.target.value)}
              onBlur={() => {
                const mins = Math.max(1, Math.min(1440, parseInt(intervalMinutes) || 60));
                setIntervalMinutes(String(mins));
                updateSettings({ interval: mins * 60 });
              }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const mins = Math.max(1, Math.min(1440, parseInt(intervalMinutes) || 60));
                  setIntervalMinutes(String(mins));
                  updateSettings({ interval: mins * 60 });
                  e.target.blur();
                }
              }}
              style={{ ...inputStyle, width: 80, textAlign: "center", padding: "7px 8px" }}
            />
            <span style={{ color: "#71717a", fontSize: 12, whiteSpace: "nowrap" }}>мин.</span>
          </div>
        </SettingRow>
        <SettingRow label="Порядок" description="По порядку или случайно">
          <select value={msgOrder} onChange={e => updateSettings({ msg_order: e.target.value })} style={selectStyle}>
            <option value="sequential">По порядку</option>
            <option value="random">Случайно</option>
          </select>
        </SettingRow>
      </Card>

      {/* Send Controls */}
      <Card>
        <CardHeader
          icon={<Icon d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" size={16} />}
          title="Рассылка"
          subtitle="Запуск вручную или по расписанию"
        />

        {/* Status bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: autoSend ? "rgba(37,99,235,.1)" : sending ? "rgba(234,179,8,.08)" : "#09090b",
          border: `1px solid ${autoSend ? "rgba(37,99,235,.3)" : sending ? "rgba(234,179,8,.2)" : "#27272a"}`,
          borderRadius: 9, padding: "10px 14px", marginBottom: 14, transition: "all .3s",
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            background: autoSend ? "#3b82f6" : sending ? "#eab308" : "#3f3f46",
            boxShadow: autoSend ? "0 0 0 3px rgba(59,130,246,.25)" : sending ? "0 0 0 3px rgba(234,179,8,.2)" : "none",
            animation: (autoSend || sending) ? "pulse 2s infinite" : "none",
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: autoSend ? "#93c5fd" : sending ? "#fde047" : "#52525b" }}>
              {autoSend ? "Авто-рассылка активна" : sending ? "Отправляю сообщения..." : "Рассылка остановлена"}
            </div>
            {autoSend && (
              <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 1 }}>
                Каждые {Math.round(interval / 60)} мин.
              </div>
            )}
          </div>
          {(autoSend || sending) && <Spinner size={14} />}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Manual send */}
          <Btn
            onClick={sendNow}
            loading={sending}
            disabled={!tgConnected || chats.length === 0 || messages.length === 0 || autoSend}
            variant="dark"
          >
            <Icon d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" size={15} />
            Отправить сейчас
          </Btn>

          {/* Start / Stop auto */}
          {autoSend ? (
            <Btn
              onClick={() => updateSettings({ auto_send: false })}
              variant="danger"
              disabled={!tgConnected}
            >
              <Icon d="M6 6h12v12H6z" size={15} fill="currentColor" stroke="none" />
              Остановить рассылку
            </Btn>
          ) : (
            <Btn
              onClick={() => updateSettings({ auto_send: true })}
              disabled={!tgConnected || chats.length === 0 || messages.length === 0}
            >
              <Icon d="M5 3l14 9-14 9V3z" size={15} fill="#fff" stroke="none" />
              Запустить авто-рассылку
            </Btn>
          )}
        </div>

        {(!tgConnected || chats.length === 0 || messages.length === 0) && (
          <p style={{ color: "#52525b", fontSize: 12, textAlign: "center", margin: "10px 0 0" }}>
            {!tgConnected ? "Подключи Telegram" : chats.length === 0 ? "Добавь хотя бы один чат" : "Добавь хотя бы одно сообщение"}
          </p>
        )}
      </Card>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .4 } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        input:focus, textarea:focus { border-color: #3b82f6 !important; }
        @media (max-width: 640px) {
          .desktop-grid { display: none !important; }
          .mobile-tabs { display: flex !important; }
          .mobile-content { display: flex !important; }
          body, html { height: 100%; overflow: hidden; }
          #root { height: 100%; overflow: hidden; display: flex; flex-direction: column; }
        }
        @media (min-width: 641px) {
          .desktop-grid { display: grid !important; }
          .mobile-tabs { display: none !important; }
          .mobile-content { display: none !important; }
        }
      `}</style>

      <ErrorToast msg={error} onClose={() => setError("")} />

      {/* Header */}
      <div style={{ borderBottom: "1px solid #18181b", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TgIcon size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -.3, lineHeight: 1.2 }}>TG Auto-Sender</div>
            <div style={{ fontSize: 11, color: "#52525b", display: "none" }} className="subtitle">Scheduled broadcasting</div>
          </div>
        </div>
        <button onClick={async () => { await api("POST", "/admin/logout").catch(() => {}); onLogout(); }}
          style={{ background: "none", border: "1px solid #27272a", color: "#71717a", cursor: "pointer", fontSize: 12, fontFamily: "inherit", borderRadius: 7, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={13} />
          Выйти
        </button>
      </div>

      {/* Mobile Tabs */}
      <div className="mobile-tabs" style={{ display: "none", borderBottom: "1px solid #27272a", padding: "0 20px" }}>
        {[["left", "Аккаунт"], ["right", "Рассылка"]].map(([tab, label]) => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            style={{
              flex: 1, padding: "12px 0", background: "none", border: "none",
              borderBottom: mobileTab === tab ? "2px solid #2563eb" : "2px solid transparent",
              color: mobileTab === tab ? "#f4f4f5" : "#71717a",
              fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer",
              transition: "color .15s",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", minHeight: 0 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>

          {/* Desktop: 2 columns */}
          <div className="desktop-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {leftColumn}
            {rightColumn}
            {/* Logs */}
            {logs.length > 0 && (
              <div style={{ gridColumn: "1 / -1" }}>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                      📋 Лог событий
                    </span>
                    <button onClick={() => api("DELETE", "/logs").then(() => setLogs([]))}
                      style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                      Очистить
                    </button>
                  </div>
                  <div style={{ maxHeight: 200, overflowY: "auto", background: "#09090b", borderRadius: 8, padding: "10px 12px", border: "1px solid #27272a" }}>
                    {logs.map((l, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, fontSize: 12, fontFamily: "monospace", borderBottom: "1px solid #1c1c1e", padding: "4px 0", lineHeight: 1.5 }}>
                        <span style={{ color: "#52525b", flexShrink: 0 }}>{l.time}</span>
                        <span style={{ color: logColors[l.level] || "#a1a1aa", wordBreak: "break-all" }}>{l.msg}</span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Mobile: tabs */}
          <div className="mobile-content" style={{ flexDirection: "column", gap: 14 }}>
            {mobileTab === "left" ? leftColumn : rightColumn}
            {logs.length > 0 && (
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>📋 Лог</span>
                  <button onClick={() => api("DELETE", "/logs").then(() => setLogs([]))}
                    style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                    Очистить
                  </button>
                </div>
                <div style={{ maxHeight: 180, overflowY: "auto", background: "#09090b", borderRadius: 8, padding: "8px 10px", border: "1px solid #27272a" }}>
                  {logs.map((l, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, fontFamily: "monospace", borderBottom: "1px solid #1c1c1e", padding: "4px 0", lineHeight: 1.5 }}>
                      <span style={{ color: "#52525b", flexShrink: 0 }}>{l.time}</span>
                      <span style={{ color: logColors[l.level] || "#a1a1aa", wordBreak: "break-all" }}>{l.msg}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </Card>
            )}
          </div>

        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #18181b", padding: "10px 20px", textAlign: "center", color: "#3f3f46", fontSize: 11, flexShrink: 0 }}>
        Powered by Telethon + FastAPI · Docker
      </div>
    </div>
  );
}
