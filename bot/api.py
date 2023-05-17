from asyncio import AbstractEventLoop
from loguru import logger
from typing import Optional

import aiohttp
_headers = {
    "Accept": "application/json",
    "content-type": "application/json"
    }

# # # pip install requests simplejson loguru aiohttp asyncio aiogram uvloop typing python-dotenv
# # apt-get install python3-dateutil python3-simplejson python3-requests python3-openssl python3-python-dotenv
class API:
    def __init__(
        self,
        url: str,
    ) -> None:
        self.url = url
        self.headers = _headers

    async def get(self, path, session):
        print("Get url", self.url + path)
        print(self.headers)
        async with session.get(self.url + path, headers=self.headers) as response:
            print(response.status)
            return await response.json()

    async def post(self, path, session, data):
        print("POST url:", self.url + path)
        print("POST data:", data)
        print(self.headers)
        print(data)
        async with session.post(self.url + path, headers=self.headers, json=data) as response:
            print(response.status)
            return await response.json()

    async def set_auth(self, token: str) -> None:
        self.headers["Authorization"] = "Bearer " + token

    async def close_session(self) -> None:
        await session.close()

    async def verification(self, user_id: int) -> bool:
        """Checks if the chat_id exist."""
        print(user_id)
        async with aiohttp.ClientSession() as session:
            if "Authorization" in self.headers:
                del(self.headers["Authorization"])
            response = await API.post(self, "/rpc/telegram", session, {"user_id": user_id})
            print(response)
            await session.close()
        return True if response["token"] else False
        #return True if response else False

    async def token(self, user_id: int) -> bool:
        """Get a token if the chat_id exist."""
        print(user_id)
        async with aiohttp.ClientSession() as session:
            response = await API.post(self, "/rpc/telegram", session, {"user_id": user_id})
            print(response)
        await session.close()
        print(response)
        return response["token"] if response["token"] else None
        #return True if response else False

    async def otp(self, email: str) -> bool:
        """Generate otp token."""
        async with aiohttp.ClientSession() as session:
            response = await API.post(self, "/rpc/generate_otp_fn", session, {"email": email})
            print(response)
        await session.close()
        print(response)
        return response if response else None

    async def otp_validation(self, payload) -> bool:
        """checks if the user is in the database."""
        async with aiohttp.ClientSession() as session:
            response = await API.post(self, "/rpc/telegram_fn", session, payload)
            print(response)
        await session.close()
        print(response)
        return response if response else None

    async def boat(self) -> bool:
        """Gather vessel details."""
        async with aiohttp.ClientSession() as session:
            response = await API.get(self, "/rpc/vessel_fn", session)
        await session.close()
        print(response)
        return response["vessel"]

    async def monitoring(self) -> None:
        """Gather vessel monitoring details."""
        async with aiohttp.ClientSession() as session:
            response = await API.get(self, "/monitoring_view", session)
        await session.close()
        print(response)
        return response[0]
