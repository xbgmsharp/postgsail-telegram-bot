from aiogram import Dispatcher
from aiogram import types


async def set_default_commands(dp: Dispatcher) -> None:
    await dp.bot.set_my_commands(
        [
            types.BotCommand("help", "help"),
            types.BotCommand("boat", "your boat details"),
            #types.BotCommand("logs", "logbook, where have you been?"),
            #types.BotCommand("moorages", "moorages, how did you stay?"),
            #types.BotCommand("stays", "stays, where did you stay?"),
            types.BotCommand("monitoring", "real-time, how is my boat?"),
            types.BotCommand("settings", "setting information about you"),
            types.BotCommand("cancel", "Cancel the current operation"),
        ]
    )
