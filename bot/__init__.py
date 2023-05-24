# from bot.handlers import give_contacts
from bot.handlers_api import give_boat_details
from bot.handlers_api import give_info
from bot.handlers_api import give_monitoring_details
from bot.handlers_api import give_settings
from bot.handlers_api import start_message
from bot.handlers_api import text_handler
from bot.handlers_api import unknown_message


# list of imported functions from module handlers
__all__ = [
    #    "give_contacts",
    "give_info",
    "give_settings",
    "start_message",
    "text_handler",
    "unknown_message",
    "give_boat_details",
    "give_monitoring_details",
]
