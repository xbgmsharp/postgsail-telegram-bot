from aiogram import Bot
from aiogram import Dispatcher

# from aiogram.contrib.fsm_storage.redis import RedisStorage2
from aiogram.contrib.fsm_storage.memory import MemoryStorage

# from bot.database import Database
from bot.api import API
from dotenv import load_dotenv

import asyncio
import os
import uvloop  # running only linux


load_dotenv()
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
token = os.getenv("BOT_TOKEN")
bot = Bot(token=token, parse_mode="html")
loop = asyncio.get_event_loop()
# storage = RedisStorage2(os.getenv("REDIS_HOST"), os.getenv("REDIS_PORT"), db=5)
storage = MemoryStorage()
dp = Dispatcher(bot, loop=loop, storage=storage)
# dp = Dispatcher(bot, loop=loop)
# db = Database(
#    name=os.getenv("PG_NAME"),
#    user=os.getenv("PG_USER"),
#    password=os.getenv("PG_PASSWORD"),
#    host=os.getenv("PG_HOST"),
#    port=os.getenv("PG_PORT"),
#    loop=loop,
#    pool=None,
# )
api = API(url=os.getenv("PGSAIL_URL"))
