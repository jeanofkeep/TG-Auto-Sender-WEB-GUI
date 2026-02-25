"""
TG Auto-Sender — FastAPI backend
"""

import asyncio
import os
import random
import logging
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from telethon import TelegramClient, errors
from telethon.sessions import StringSession
import base64
import io

# ── Логи ────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("tg_sender")

# ── Простая авторизация через env ────────────────────────────────────────────
ADMIN_LOGIN    = os.environ.get("ADMIN_LOGIN", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme")

# Хранилище активных токенов (in-memory, сбрасывается при рестарте)
active_tokens: dict[str, datetime] = {}
TOKEN_TTL_HOURS = 24

security = HTTPBearer()

def create_token() -> str:
    token = secrets.token_hex(32)
    active_tokens[token] = datetime.now() + timedelta(hours=TOKEN_TTL_HOURS)
    return token

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    expires = active_tokens.get(token)
    if not expires or datetime.now() > expires:
        raise HTTPException(401, "Unauthorized")
    return token

# ── Состояние приложения ─────────────────────────────────────────────────────
class AppState:
    client: Optional[TelegramClient] = None
    phone_hash: Optional[str] = None
    me: Optional[dict] = None
    chats: list[str] = []
    messages: list[str] = ["Привет! Это тестовое сообщение."]
    msg_order: str = "sequential"
    msg_index: int = 0
    auto_send: bool = False
    interval: int = 3600
    logs: list[dict] = []
    _auto_task: Optional[asyncio.Task] = None
    _qr_task: Optional[asyncio.Task] = None
    qr_token: Optional[str] = None  # base64 PNG

state = AppState()

# ── Утилиты ──────────────────────────────────────────────────────────────────
def get_client() -> TelegramClient:
    api_id   = int(os.environ["TELEGRAM_API_ID"])
    api_hash = os.environ["TELEGRAM_API_HASH"]
    session  = os.environ.get("TELEGRAM_SESSION", "")
    return TelegramClient(StringSession(session), api_id, api_hash)

def add_log(level: str, msg: str):
    entry = {"time": datetime.now().strftime("%H:%M:%S"), "level": level, "msg": msg}
    state.logs.append(entry)
    state.logs = state.logs[-200:]
    log.info(msg)

def next_message() -> Optional[str]:
    if not state.messages:
        return None
    if state.msg_order == "random":
        return random.choice(state.messages)
    msg = state.messages[state.msg_index % len(state.messages)]
    state.msg_index += 1
    return msg

# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    add_log("INFO", "🚀 Backend запущен")
    yield
    if state.client and state.client.is_connected():
        await state.client.disconnect()
    add_log("INFO", "🛑 Backend остановлен")

# ── FastAPI ──────────────────────────────────────────────────────────────────
app = FastAPI(title="TG Auto-Sender API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN LOGIN (логин/пароль из .env)
# ══════════════════════════════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    login: str
    password: str

@app.post("/admin/login")
async def admin_login(req: LoginRequest):
    if req.login != ADMIN_LOGIN or req.password != ADMIN_PASSWORD:
        raise HTTPException(401, "Неверный логин или пароль")
    token = create_token()
    add_log("INFO", f"🔐 Вход в панель: {req.login}")
    return {"token": token}

@app.post("/admin/logout")
async def admin_logout(token: str = Depends(verify_token)):
    active_tokens.pop(token, None)
    return {"ok": True}

@app.get("/admin/me")
async def admin_me(token: str = Depends(verify_token)):
    return {"login": ADMIN_LOGIN}


# ══════════════════════════════════════════════════════════════════════════════
#  API KEYS (редактирование из интерфейса)
# ══════════════════════════════════════════════════════════════════════════════

class ApiKeysRequest(BaseModel):
    api_id: str
    api_hash: str

@app.get("/apikeys")
async def get_api_keys(_=Depends(verify_token)):
    api_id = os.environ.get("TELEGRAM_API_ID", "")
    api_hash = os.environ.get("TELEGRAM_API_HASH", "")
    # Маскируем hash — показываем только первые 4 символа
    masked_hash = (api_hash[:4] + "•" * (len(api_hash) - 4)) if len(api_hash) > 4 else ""
    configured = bool(api_id and api_hash and api_id != "12345678" and api_hash != "your_api_hash_here")
    return {"api_id": api_id, "api_hash_masked": masked_hash, "configured": configured}

@app.post("/apikeys")
async def set_api_keys(req: ApiKeysRequest, _=Depends(verify_token)):
    if not req.api_id.strip().isdigit():
        raise HTTPException(400, "api_id должен быть числом")
    if len(req.api_hash.strip()) < 10:
        raise HTTPException(400, "api_hash слишком короткий")
    # Сохраняем в переменные окружения текущего процесса
    os.environ["TELEGRAM_API_ID"]   = req.api_id.strip()
    os.environ["TELEGRAM_API_HASH"] = req.api_hash.strip()
    # Если был подключён клиент — отключаем, чтобы при следующем коннекте использовались новые ключи
    if state.client:
        try: await state.client.disconnect()
        except: pass
        state.client = None
        state.me = None
        state.phone_hash = None
    add_log("INFO", f"🔑 API ключи обновлены (api_id: {req.api_id.strip()})")
    return {"ok": True}

# ══════════════════════════════════════════════════════════════════════════════
#  TELEGRAM AUTH
# ══════════════════════════════════════════════════════════════════════════════

class PhoneRequest(BaseModel):
    phone: str

class CodeRequest(BaseModel):
    phone: str
    code: str
    password: Optional[str] = None

@app.post("/auth/send-code")
async def send_code(req: PhoneRequest, _=Depends(verify_token)):
    try:
        state.client = get_client()
        await state.client.connect()
        result = await state.client.send_code_request(req.phone)
        state.phone_hash = result.phone_code_hash
        add_log("INFO", f"📱 Код отправлен на {req.phone}")
        return {"ok": True}
    except Exception as e:
        add_log("FAIL", f"Ошибка отправки кода: {e}")
        raise HTTPException(400, str(e))

@app.post("/auth/verify-code")
async def verify_code(req: CodeRequest, _=Depends(verify_token)):
    if not state.client or not state.phone_hash:
        raise HTTPException(400, "Сначала запроси код")
    try:
        await state.client.sign_in(req.phone, req.code, phone_code_hash=state.phone_hash)
    except errors.SessionPasswordNeededError:
        if not req.password:
            raise HTTPException(400, "Требуется пароль двухфакторной аутентификации")
        await state.client.sign_in(password=req.password)
    except Exception as e:
        add_log("FAIL", f"Ошибка авторизации: {e}")
        raise HTTPException(400, str(e))

    me = await state.client.get_me()
    state.me = {"first_name": me.first_name, "username": me.username, "phone": me.phone}
    add_log("INFO", f"✅ Авторизован в Telegram: {me.first_name} (@{me.username})")
    return {"ok": True, "me": state.me}

@app.post("/auth/logout")
async def tg_logout(_=Depends(verify_token)):
    if state.client:
        await state.client.log_out()
        state.client = None
        state.me = None
        state.phone_hash = None
    add_log("INFO", "👋 Выход из Telegram аккаунта")
    return {"ok": True}

@app.get("/auth/me")
async def get_me(_=Depends(verify_token)):
    return {"connected": state.me is not None, "me": state.me}

# ══════════════════════════════════════════════════════════════════════════════
#  QR LOGIN
# ══════════════════════════════════════════════════════════════════════════════

async def _qr_loop():
    """Фоновая задача: обновляет QR каждые 20 сек пока не войдёт или не отменят."""
    import qrcode
    try:
        qr_login = await state.client.qr_login()
        while True:
            # Генерируем PNG из URL токена
            img = qrcode.make(qr_login.url)
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            state.qr_token = base64.b64encode(buf.getvalue()).decode()

            try:
                # Ждём сканирования (таймаут 20 сек, потом QR обновится)
                await asyncio.wait_for(qr_login.wait(), timeout=20)
                # Успешно вошли
                me = await state.client.get_me()
                state.me = {"first_name": me.first_name, "username": me.username, "phone": me.phone}
                state.qr_token = None
                add_log("INFO", f"✅ QR-вход выполнен: {me.first_name} (@{me.username})")
                return
            except asyncio.TimeoutError:
                # Обновляем QR
                await qr_login.recreate()
            except errors.SessionPasswordNeededError:
                # 2FA — сохраняем флаг, фронтенд спросит пароль
                state.qr_token = "2FA_REQUIRED"
                add_log("INFO", "🔐 QR: требуется пароль 2FA")
                return
    except asyncio.CancelledError:
        state.qr_token = None
    except Exception as e:
        state.qr_token = None
        add_log("FAIL", f"QR ошибка: {e}")

@app.post("/auth/qr-start")
async def qr_start(_=Depends(verify_token)):
    """Запустить QR-авторизацию, вернуть первый QR."""
    try:
        # Отменяем предыдущую задачу если была
        if state._qr_task and not state._qr_task.done():
            state._qr_task.cancel()
            await asyncio.sleep(0.2)

        state.client = get_client()
        await state.client.connect()
        state.qr_token = None

        state._qr_task = asyncio.create_task(_qr_loop())

        # Ждём пока появится первый QR (макс 5 сек)
        for _ in range(50):
            if state.qr_token:
                break
            await asyncio.sleep(0.1)

        if not state.qr_token:
            raise HTTPException(500, "Не удалось сгенерировать QR")

        add_log("INFO", "📷 QR-код сгенерирован")
        return {"qr": state.qr_token}
    except HTTPException:
        raise
    except Exception as e:
        add_log("FAIL", f"Ошибка QR: {e}")
        raise HTTPException(400, str(e))

@app.get("/auth/qr-poll")
async def qr_poll(_=Depends(verify_token)):
    """Фронтенд вызывает каждые 2 сек, чтобы получить свежий QR или статус."""
    if state.me:
        return {"status": "done", "me": state.me}
    if state.qr_token == "2FA_REQUIRED":
        return {"status": "2fa"}
    if state.qr_token:
        return {"status": "pending", "qr": state.qr_token}
    return {"status": "error"}

@app.post("/auth/qr-2fa")
async def qr_2fa_confirm(req: dict, _=Depends(verify_token)):
    """Ввод пароля 2FA после QR-сканирования."""
    password = req.get("password", "")
    if not password:
        raise HTTPException(400, "Пароль не указан")
    try:
        await state.client.sign_in(password=password)
        me = await state.client.get_me()
        state.me = {"first_name": me.first_name, "username": me.username, "phone": me.phone}
        state.qr_token = None
        add_log("INFO", f"✅ QR+2FA вход: {me.first_name} (@{me.username})")
        return {"ok": True, "me": state.me}
    except Exception as e:
        add_log("FAIL", f"QR 2FA ошибка: {e}")
        raise HTTPException(400, str(e))

@app.post("/auth/qr-cancel")
async def qr_cancel(_=Depends(verify_token)):
    """Отменить QR-авторизацию."""
    if state._qr_task and not state._qr_task.done():
        state._qr_task.cancel()
    state.qr_token = None
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
#  CHATS
# ══════════════════════════════════════════════════════════════════════════════

class ChatPayload(BaseModel):
    chat: str

@app.get("/chats")
async def get_chats(_=Depends(verify_token)):
    return {"chats": state.chats}

@app.post("/chats")
async def add_chat(payload: ChatPayload, _=Depends(verify_token)):
    if payload.chat in state.chats:
        raise HTTPException(400, "Чат уже добавлен")
    state.chats.append(payload.chat)
    add_log("INFO", f"➕ Чат добавлен: {payload.chat}")
    return {"chats": state.chats}

@app.delete("/chats/{chat:path}")
async def remove_chat(chat: str, _=Depends(verify_token)):
    if chat not in state.chats:
        raise HTTPException(404, "Чат не найден")
    state.chats.remove(chat)
    add_log("INFO", f"➖ Чат удалён: {chat}")
    return {"chats": state.chats}

# ══════════════════════════════════════════════════════════════════════════════
#  MESSAGES
# ══════════════════════════════════════════════════════════════════════════════

class MessagePayload(BaseModel):
    text: str

class MessagesPayload(BaseModel):
    messages: list[str]

@app.get("/messages")
async def get_messages(_=Depends(verify_token)):
    return {"messages": state.messages}

@app.post("/messages")
async def add_message(payload: MessagePayload, _=Depends(verify_token)):
    state.messages.append(payload.text)
    return {"messages": state.messages}

@app.put("/messages")
async def set_messages(payload: MessagesPayload, _=Depends(verify_token)):
    state.messages = payload.messages
    state.msg_index = 0
    return {"messages": state.messages}

@app.delete("/messages/{index}")
async def delete_message(index: int, _=Depends(verify_token)):
    if index < 0 or index >= len(state.messages):
        raise HTTPException(404, "Сообщение не найдено")
    state.messages.pop(index)
    state.msg_index = 0
    return {"messages": state.messages}

# ══════════════════════════════════════════════════════════════════════════════
#  SEND
# ══════════════════════════════════════════════════════════════════════════════

async def _send_to_group(group: str, text: str) -> bool:
    try:
        await state.client.send_message(group, text)
        add_log("OK", f"OK   ->  {group}")
        return True
    except errors.FloodWaitError as e:
        add_log("WARN", f"FloodWait {e.seconds}с — жду...")
        await asyncio.sleep(e.seconds + 1)
        return await _send_to_group(group, text)
    except errors.ChatWriteForbiddenError:
        add_log("FAIL", f"SKIP ->  {group}  (нет прав)")
        return False
    except errors.UserBannedInChannelError:
        add_log("FAIL", f"SKIP ->  {group}  (забанен)")
        return False
    except Exception as e:
        add_log("FAIL", f"FAIL ->  {group}  ({type(e).__name__}: {e})")
        return False

async def run_cycle():
    if not state.client or not state.me:
        add_log("FAIL", "Telegram не подключён")
        return {"ok": 0, "fail": 0}
    if not state.chats:
        add_log("FAIL", "Нет чатов для рассылки")
        return {"ok": 0, "fail": 0}
    text = next_message()
    if not text:
        add_log("FAIL", "Нет сообщений для рассылки")
        return {"ok": 0, "fail": 0}

    add_log("INFO", f"--- Начинаю рассылку ---")
    add_log("INFO", f"Сообщение: {text[:80]}{'...' if len(text) > 80 else ''}")

    ok = fail = 0
    for group in state.chats:
        success = await _send_to_group(group, text)
        if success: ok += 1
        else: fail += 1
        await asyncio.sleep(random.uniform(5, 15))

    add_log("INFO", f"--- Итог: отправлено {ok}, ошибок {fail} ---")
    return {"ok": ok, "fail": fail}

@app.post("/send")
async def send_now(_=Depends(verify_token)):
    return await run_cycle()

# ══════════════════════════════════════════════════════════════════════════════
#  SETTINGS / AUTO-SEND
# ══════════════════════════════════════════════════════════════════════════════

async def _auto_loop():
    while state.auto_send:
        await run_cycle()
        add_log("INFO", f"⏱ Следующая рассылка через {state.interval // 60} мин.")
        await asyncio.sleep(state.interval)

class SettingsPayload(BaseModel):
    auto_send: bool
    interval: int
    msg_order: str

@app.get("/settings")
async def get_settings(_=Depends(verify_token)):
    return {"auto_send": state.auto_send, "interval": state.interval, "msg_order": state.msg_order}

@app.put("/settings")
async def update_settings(payload: SettingsPayload, _=Depends(verify_token)):
    prev_auto = state.auto_send
    state.auto_send = payload.auto_send
    state.interval  = payload.interval
    state.msg_order = payload.msg_order

    if state.auto_send and not prev_auto:
        if state._auto_task:
            state._auto_task.cancel()
        state._auto_task = asyncio.create_task(_auto_loop())
        add_log("INFO", f"▶️ Авто-рассылка запущена (каждые {state.interval // 60} мин.)")
    elif not state.auto_send and prev_auto:
        if state._auto_task:
            state._auto_task.cancel()
            state._auto_task = None
        add_log("INFO", "⏹ Авто-рассылка остановлена")

    return {"ok": True}

# ══════════════════════════════════════════════════════════════════════════════
#  LOGS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/logs")
async def get_logs(_=Depends(verify_token)):
    return {"logs": state.logs}

@app.delete("/logs")
async def clear_logs(_=Depends(verify_token)):
    state.logs = []
    return {"ok": True}
