from aiogram import md, types
from bot.loader import bot
#from bot.loader import db
from bot.loader import api
from bot.loader import dp
from loguru import logger

import json

from aiogram.utils.emoji import emojize
from aiogram.utils.markdown import bold, code, italic, text

from aiogram import Bot, Dispatcher, types
from aiogram.contrib.fsm_storage.memory import MemoryStorage
from aiogram.dispatcher import FSMContext
from aiogram.dispatcher.filters.state import State, StatesGroup

import aiogram.utils.markdown as md
from aiogram import Bot, Dispatcher, types
from aiogram.contrib.fsm_storage.memory import MemoryStorage
from aiogram.dispatcher import FSMContext
from aiogram.dispatcher.filters import Text
from aiogram.dispatcher.filters.state import State, StatesGroup
from aiogram.types import ParseMode
from aiogram.utils import executor

# States
class Form(StatesGroup):
    email = State()
    otp = State()
    give_boat_details = State()
    give_monitoring_details = State()

@dp.message_handler(commands=["start"])
async def start_message(message: types.Message, state: FSMContext) -> None:
    """welcome message."""
    #logger.info(message.from_user.id)
    #logger.info(message.chat.id)
    logger.info(message)
    # fetching data will take some time, so notify user that everything is OK
    await types.ChatActions.typing()
    if await db.verification(message.from_user.id):
        await bot.send_message(message.chat.id, "👋 Hello, I remember you.")
        async with state.proxy() as data:
            data['vessel_id'] = 'vessels.urn:mrn:imo:mmsi:123456789'
    else:
        await bot.send_message(message.chat.id, "👋 Hello")
        await Form.email.set()
        await bot.send_message(
                message.chat.id,
                md.text(
                    md.text("Let's connect to your PostgSail account."),
                    md.text('Type /cancel to cancelled at any time'),
                    md.text("What is your email adress?"),
                    sep='\n',
                ),
                parse_mode=ParseMode.MARKDOWN
            )

@dp.message_handler(commands=("help", "info", "about"))
async def give_info(message: types.Message) -> None:
    logger.info(message)
    """the target of this bot."""
    await bot.send_message(message.chat.id, "ℹ️ <b>[About]\n</b> postgsail_bot is a telegram bot to manage your hosted or cloud instance of PostgSail.")
    """link to project code."""
    btn_link = types.InlineKeyboardButton(
        text="Go to GitHub.", url="https://github.com/xbgmsharp/postgsail-telegram-bot"
    )
    keyboard_link = types.InlineKeyboardMarkup().add(btn_link)
    await bot.send_message(
        message.chat.id,
        "👨‍💻 the project code is available on Github.",
        reply_markup=keyboard_link,
    )

@dp.message_handler(commands="settings")
async def give_settings(message: types.Message) -> None:
    """settings help."""
    #name = await db.get_name(message.from_user.id)
    #lang = await db.get_lang(message.from_user.id)
    name = 'username'
    lang = 'en'
    btn_name = types.InlineKeyboardButton(text=f"name: {name}", callback_data="name")
    btn_lang = types.InlineKeyboardButton(text=f"language: {lang}", callback_data="lang")
    keyboard_settings = types.InlineKeyboardMarkup().add(btn_name, btn_lang)
    await bot.send_message(message.chat.id, "⚙️ eSettings", reply_markup=keyboard_settings)


@dp.callback_query_handler(lambda c: c.data == "name")
async def alter_name(callback_query: types.CallbackQuery) -> None:
    await bot.send_message(callback_query.from_user.id, "How should I address you?")
    await bot.answer_callback_query(callback_query.id)


@dp.callback_query_handler(lambda c: c.data == "lang")
async def alter_lang(callback_query: types.CallbackQuery) -> None:
    await bot.answer_callback_query(callback_query.id)
    await bot.send_message(callback_query.from_user.id, "Choose language:")


# You can use state '*' if you need to handle all states
@dp.message_handler(state='*', commands='cancel')
@dp.message_handler(Text(equals='cancel', ignore_case=True), state='*')
async def cancel_handler(message: types.Message, state: FSMContext):
    """
    Allow user to cancel any action
    """
    current_state = await state.get_state()
    if current_state is None:
        return

    #logging.info('Cancelling state %r', current_state)
    # Cancel state and inform user about it
    await state.finish()
    # And remove keyboard (just in case)
    await message.reply('Cancelled.', reply_markup=types.ReplyKeyboardRemove())

# TODO: check email is valid format?
@dp.message_handler(state=Form.email)
async def process_email(message: types.Message, state: FSMContext):
    """Process user email"""
    async with state.proxy() as data:
        data['email'] = message.text

        markup = types.ReplyKeyboardRemove()
        await types.ChatActions.typing()
        # Get OTP Code
        data['otp'] = await db.get_otp(data['email'])

        if data['otp']:
            print(data['otp'])
        else:
            print('bad')

        # And send message
        await bot.send_message(
            message.chat.id,
            md.text(
                md.text('We sent you a validation request by email.'),
                md.text('Please input the verification code when ready.'),
                sep='\n',
            ),
            reply_markup=markup,
            parse_mode=ParseMode.MARKDOWN,
        )
        await Form.next()

@dp.message_handler(state=Form.otp)
async def process_otp(message: types.Message, state: FSMContext):
    async with state.proxy() as data:
        print(data)
        if message.text == data['otp']:
            print('valid otp')
        data['otp'] = message.text

        # Remove keyboard
        markup = types.ReplyKeyboardRemove()

        await types.ChatActions.typing()
        # Verify OTP Code
        payload = {
                   "from": 
                        {
                            "id": message.from_user.id,
                            "is_bot":  message.from_user.is_bot,
                            "first_name":  message.from_user.first_name,
                            "language_code": message.from_user.language_code
                        },
                    "chat":
                        {
                            "id": message.chat.id,
                            "title":  message.chat.title,
                            "type":  message.chat.type,
                            "all_members_are_administrators": message.chat.all_members_are_administrators
                        },
                    "date": str(message.date)
                }

        ##print(message)
        ##print(json.dumps(payload))
        await db.set_otp(data['otp'], json.dumps(payload))

        # And send message
        await bot.send_message(
            message.chat.id,
            md.text(
                md.text('Thanks.'),
                md.text('You are now connected to PostgSail!'),
                md.text('type /boat to get your vessel status.'),
                sep='\n',
            ),
            reply_markup=markup,
            parse_mode=ParseMode.MARKDOWN,
        )
        await state.set_state()
    # Finish conversation
    await state.finish()

@dp.message_handler(commands="boat",state="*")
async def give_boat_details(message: types.Message, state: FSMContext) -> None:
    """Boat Details"""

    print(Form)
    d1 = await state.get_data()
    d2 = d1.get('otp')
    print(d1)
    print(d2)

    await types.ChatActions.typing()

    async with state.proxy() as data:
        print(data)
        current_state = await state.get_state(Form.otp)

        print('current_state', current_state)
        #print(json['geojson'])
        #json = json['vessel']
        print(data['vessel_id'])
        await bot.send_location(message.chat.id, 
                latitude=json['geojson']['properties']['latitude'],
                longitude=json['geojson']['properties']['longitude'])
        await bot.send_message(
            message.chat.id,
            md.text(
                md.text("Boat's details"),
                md.text('name:', md.code(json['name'])),
                md.text('mmsi:', md.bold(json['mmsi'])),
                md.text('createdAt:', md.code(json['created_at'])),
                md.text('lastContact:', md.bold(json['last_contact'])),
                sep='\n',
            ),
            #reply_markup=markup,
            parse_mode=ParseMode.MARKDOWN,
        )

@dp.message_handler(commands="monitoring",state="*")
async def give_monitoring_details(message: types.Message, state: FSMContext) -> None:
    """Monitoring"""

    await types.ChatActions.typing()

    async with state.proxy() as data:
        print('state', data)
        if not 'token' in data:
            data['token'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoidXNlcl9yb2xlIiwiZW1haWwiOiJsYWNyb2l4LmZyYW5jb2lzQGdtYWlsLmNvbSIsImV4cCI6MTY2OTE1MDYxOH0.KWNGe8GAtBBCRH8Yd8Wyz0DQmXhz1OR0QXLOfo4po8c'
            print('set default token')
        print(data['token'])
        headers['Authorization'] = 'Bearer ' + data['token']

        # Make request
        async with aiohttp.ClientSession() as session:
            json = await fetch("http://localhost:3002/rpc/vessel_fn", session)
            print(json)
        await session.close()

        #print(json['geojson'])
        json = json['vessel']
        print(json['name'])
        await bot.send_location(message.chat.id, 
                latitude=json['geojson']['properties']['latitude'],
                longitude=json['geojson']['properties']['longitude'])
        await bot.send_message(
            message.chat.id,
            md.text(
                md.text("Boat's details"),
                md.text('name:', md.code(json['name'])),
                md.text('mmsi:', md.bold(json['mmsi'])),
                md.text('createdAt:', md.code(json['created_at'])),
                md.text('lastContact:', md.bold(json['last_contact'])),
                sep='\n',
            ),
            #reply_markup=markup,
            parse_mode=ParseMode.MARKDOWN,
        )

@dp.message_handler(content_types="text")
async def text_handler(message: types.Message) -> None:
    await bot.send_message(message.chat.id, "Text processing can take place here.")


@dp.message_handler()
async def unknown_message(message: types.Message) -> None:
    if not message.is_command():
        await bot.send_message(message.chat.id, "❌ I don't know how to work with this format.")
    else:
        await message.answer("❌ Invalid command.")
