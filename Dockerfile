FROM python:3.12-slim

EXPOSE 8081/tcp

WORKDIR /usr/src/app
COPY . .

#RUN apt update && \
#    apt -qy upgrade && \
#    python -m pip install --upgrade pip && \
#    python -m pip install poetry && \
#    poetry install && \
#    apt-get -y remove build-essential curl && apt-get -y autoremove --purge && apt-get -y clean && \
#    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /var/cache/apt

#    python -m pip install aiogram asyncio aiohttp typing uvloop python-dotenv loguru emoji && \

RUN apt update && \
    apt -qy upgrade && \
    python -m pip install --upgrade pip && \
    python -m pip install -r requirements.txt && \
    apt-get -y remove build-essential curl && apt-get -y autoremove --purge && apt-get -y clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /var/cache/apt

#RUN apt -qy update && \
#    apt -qy install --no-install-recommends -y build-essential curl && \
#    /usr/local/bin/python -m pip install --upgrade pip && \
#    curl -sSL https://install.python-poetry.org | python3 - && \
#    export PATH="/root/.local/bin:$PATH" && \
#    poetry config virtualenvs.create false && \
#    poetry install --only main && \
#    poetry cache clear --no-interaction --all pypi && \
#    curl -sSL https://raw.githubusercontent.com/sdispater/poetry/master/get-poetry.py | python - --uninstall && \
#    apt-get -y remove build-essential curl && apt-get -y autoremove --purge && apt-get -y clean && \
#    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /var/cache/apt

ENTRYPOINT ["python", "-m", "bot"]
