from asyncio import AbstractEventLoop
from typing import Optional

import asyncpg
import json


class Database:
    def __init__(
        self,
        name: Optional[str],
        user: Optional[str],
        password: Optional[str],
        host: Optional[str],
        port: Optional[str],
        loop: AbstractEventLoop,
        pool: asyncpg.pool.Pool,
    ) -> None:
        self.name = name
        self.user = user
        self.password = password
        self.host = host
        self.port = port
        self.loop = loop
        self.pool = loop.run_until_complete(
            asyncpg.create_pool(
                database=name,
                user=user,
                password=password,
                host=host,
                port=port,
            )
        )

    async def close_database(self) -> None:
        await self.pool.close()

    async def verification(self, user_id: int) -> bool:
        """checks if the user is in the database."""
        print(user_id)
        response = await self.pool.fetchrow(f"SELECT auth.telegram_session_exists_fn({user_id}) as session")
        print(response)
        return True if response["session"] == True else False
        # return True if response else False

    async def get_otp(self, input_email: str) -> str:
        return await self.pool.fetchval(f"SELECT auth.telegram_otp_fn('{input_email}') as otp_pass")

    async def set_otp(self, input_otp: str, input_json: json) -> str:
        return await self.pool.fetchval(f"SELECT api.telegram_fn('{input_otp}', '{input_json}')")

    async def get_name(self, user_id: int) -> str:
        return await self.pool.fetchval(
            f"SELECT preferences->'telegram'->'from'->'name' as name FROM auth.accounts WHERE cast(preferences->'telegram'->'from'->'id' as BIGINT) = _chat_id::BIGINT"
        )

    async def get_lang(self, user_id: int) -> str:
        return await self.pool.fetchval(f"SELECT lang FROM Users WHERE user_id={user_id}")

    async def boat(self, identity: int) -> str:
        await conn.execute("SELECT set_config('vessel.client_id', $1, false)", identity)
        return await self.pool.fetchval(f"SET vessel.client_id = {identity};SELECT * from vessel_view;")
