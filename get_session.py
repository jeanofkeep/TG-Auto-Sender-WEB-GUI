"""
Запусти этот скрипт ОДИН РАЗ локально, чтобы получить строку сессии.
Потом вставь её в .env как TELEGRAM_SESSION=...

Установка: pip install telethon
Запуск:    python get_session.py
"""

import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession

API_ID   = int(input("Введи API_ID:   "))
API_HASH = input("Введи API_HASH: ").strip()

async def main():
    async with TelegramClient(StringSession(), API_ID, API_HASH) as client:
        session_str = client.session.save()
        print("\n" + "=" * 60)
        print("TELEGRAM_SESSION=" + session_str)
        print("=" * 60)
        print("\nВставь строку выше в файл .env")

asyncio.run(main())
