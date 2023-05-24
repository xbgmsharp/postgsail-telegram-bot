from aiogram import md
from aiogram import types
from aiogram.dispatcher import FSMContext
from aiogram.dispatcher.filters import Text
from aiogram.dispatcher.filters.state import State
from aiogram.dispatcher.filters.state import StatesGroup
from aiogram.types import ParseMode
from bot.loader import api
from bot.loader import bot
from bot.loader import dp
from loguru import logger


# import aiogram.utils.markdown as md


# States
class Form(StatesGroup):
    email = State()
    otp = State()
    token = State()


@dp.message_handler(commands=["start"])
async def start_message(message: types.Message, state: FSMContext) -> None:
    """welcome message."""
    logger.info(message)
    # fetching data will take some time, so notify user that everything is OK
    await types.ChatActions.typing()
    # Check if chat session exist
    if await api.verification(message.from_user.id):
        await bot.send_message(message.chat.id, "👋 Hello, I remember you.")
        # await bot.send_message(message.chat.id, "Service is up and running.")
        async with state.proxy() as data:
            data["token"] = await api.token(message.from_user.id)
            await state.set_state(Form.token)
            # return data['token']
    else:
        await bot.send_message(message.chat.id, "👋 Hello")
        await bot.send_message(
            message.chat.id,
            md.text(
                md.text("Let's connect to your PostgSail account."),
                md.text("Type /cancel to cancelled at any time"),
                md.text("What is your email adress?"),
                sep="\n",
            ),
            parse_mode=ParseMode.MARKDOWN,
        )
        await Form.email.set()


@dp.message_handler(commands=("help", "info", "about"))
async def give_info(message: types.Message) -> None:
    """the target of this bot."""
    await bot.send_message(
        message.chat.id,
        "ℹ️ <b>[About]\n</b> postgsail_bot is a telegram bot to manage your hosted or cloud instance of PostgSail.",
    )
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
    # name = await db.get_name(message.from_user.id)
    # lang = await db.get_lang(message.from_user.id)
    name = "username"
    lang = "en"
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
@dp.message_handler(state="*", commands="cancel")
@dp.message_handler(Text(equals="cancel", ignore_case=True), state="*")
async def cancel_handler(message: types.Message, state: FSMContext):
    """
    Allow user to cancel any action
    """
    current_state = await state.get_state()
    if current_state is None:
        return

    # logging.info('Cancelling state %r', current_state)
    # Cancel state and inform user about it
    await state.finish()
    # And remove keyboard (just in case)
    await message.reply("Cancelled.", reply_markup=types.ReplyKeyboardRemove())


# TODO: check email is valid format?
@dp.message_handler(state=Form.email)
async def process_email(message: types.Message, state: FSMContext):
    """Process user email"""
    async with state.proxy() as data:
        data["email"] = message.text

        # Remove keyboard
        markup = types.ReplyKeyboardRemove()
        # we are typing
        await types.ChatActions.typing()

        # Get OTP Code - Make request
        json = await api.otp(data["email"])

        # Store OTP Code?
        if json:
            print("Send OK response")
            data["otp"] = json
        else:
            print("Send KO response")

        # Init OTP Code validation
        # Form.otp.set()
        # And send message
        await bot.send_message(
            message.chat.id,
            md.text(
                md.text("We sent you a validation request by email."),
                md.text("Email:", md.bold(data["email"])),
                md.text("Please input the verification code when ready."),
                sep="\n",
            ),
            reply_markup=markup,
            parse_mode=ParseMode.MARKDOWN,
        )
        await Form.next()


# Check OTP. OTP gotta be string
# TODO: check otp minimum length ?
@dp.message_handler(lambda message: not message.text.isdigit(), state=Form.otp)
async def process_otp_invalid(message: types.Message):
    """
    If otp is invalid
    """
    return await message.reply("OTP gotta be a number.\nWhat is your OTP? (digits only)")


@dp.message_handler(state=Form.otp)
async def process_otp(message: types.Message, state: FSMContext):
    """Process user OTP token"""
    async with state.proxy() as data:
        print(data)
        if message.text == data["otp"]:
            print("valid otp")
        data["otp"] = message.text

        # Remove keyboard
        markup = types.ReplyKeyboardRemove()
        # we are typing
        await types.ChatActions.typing()
        # Verify OTP Code
        payload = {
            "token": data["otp"],
            "telegram_obj": {
                "from": {
                    "id": message.from_user.id,
                    "is_bot": message.from_user.is_bot,
                    "first_name": message.from_user.first_name,
                    "language_code": message.from_user.language_code,
                },
                "chat": {
                    "id": message.chat.id,
                    "title": message.chat.title,
                    "type": message.chat.type,
                    "all_members_are_administrators": message.chat.all_members_are_administrators,
                },
                "date": str(message.date),
            },
        }
        # Validate OTP Code - Make request
        json = await api.otp_validation(payload)

        if json is True:
            print("Send OK response")
            async with state.proxy() as data:
                data["token"] = await api.token(message.from_user.id)
                await state.set_state(data)
            await bot.send_message(message.chat.id, "Successfull")
        else:
            print("Send KO response")

        # And send message
        await bot.send_message(
            message.chat.id,
            md.text(
                md.text("Thanks."),
                md.text("You are now connected to PostgSail!"),
                md.text("type /boat to get your vessel status."),
                sep="\n",
            ),
            reply_markup=markup,
            parse_mode=ParseMode.MARKDOWN,
        )
    # Finish conversation
    # await state.finish()


@dp.message_handler(commands="boat", state="*")
async def give_boat_details(message: types.Message, state: FSMContext) -> None:
    """Boat details"""

    # Remove keyboard
    markup = types.ReplyKeyboardRemove()
    # we are typing
    await types.ChatActions.typing()

    async with state.proxy() as data:
        print("data", data)
        current_state = await state.get_state()
        print("current_state1", current_state)
        if "token" not in data:
            print("unknow session, start_message")
            await start_message(message, state)
            async with state.proxy() as data2:
                print("data2", data2)
                print(data2["token"])
                # headers['Authorization'] = 'Bearer ' + data2['token']
                await api.set_auth(data2["token"])
        else:
            print(data["token"])
            # headers['Authorization'] = 'Bearer ' + data['token']
            await api.set_auth(data["token"])

        # Make request
        json = await api.boat()

        # Format response
        # print(json['geojson'])
        # json = json['vessel']
        print(json["name"])
        await bot.send_location(
            message.chat.id,
            latitude=json["geojson"]["properties"]["latitude"],
            longitude=json["geojson"]["properties"]["longitude"],
        )
        await bot.send_message(
            message.chat.id,
            md.text(
                md.text("Boat's details"),
                md.text("name:", md.code(json["name"])),
                md.text("mmsi:", md.bold(json["mmsi"])),
                md.text("createdAt:", md.code(json["created_at"])),
                md.text("lastContact:", md.bold(json["last_contact"])),
                sep="\n",
            ),
            reply_markup=markup,
            parse_mode=ParseMode.MARKDOWN,
        )


@dp.message_handler(commands="monitoring", state="*")
async def give_monitoring_details(message: types.Message, state: FSMContext) -> None:
    """Monitoring"""

    # Remove keyboard
    markup = types.ReplyKeyboardRemove()
    # we are typing
    await types.ChatActions.typing()

    async with state.proxy() as data:
        print("data", data)
        current_state = await state.get_state()
        print("current_state1", current_state)
        if "token" not in data:
            print("unknow session, start_message")
            await start_message(message, state)
            async with state.proxy() as data2:
                print("data2", data2)
                print(data2["token"])
                await api.set_auth(data2["token"])
        else:
            print(data["token"])
            await api.set_auth(data["token"])

        # Make request
        json = await api.monitoring()

        # Format response
        print(json["name"])
        await bot.send_location(
            message.chat.id,
            latitude=json["geojson"]["properties"]["latitude"],
            longitude=json["geojson"]["properties"]["longitude"],
        )
        output = ""
        for key in json:
            if key != "geojson" and key != "name":
                # print(key)
                output += md.text(key + ":", md.bold(json[key])) + "\n"
        print(output)
        await bot.send_message(
            message.chat.id,
            md.text(
                md.text("Monitoring"),
                md.text("name:", md.code(json["name"])),
                output,
                sep="\n",
            ),
            reply_markup=markup,
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
