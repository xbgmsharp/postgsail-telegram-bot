FROM python:3.11-slim

EXPOSE 8081/tcp

WORKDIR /usr/src/app
COPY . .

RUN apt update && \
    apt -qy upgrade && \
    python -m pip install --upgrade pip && \
    python -m pip install aiogram simplejson asyncio uvloop python-dotenv loguru requests emoji && \
    python -m pip install requests simplejson loguru aiohttp asyncio aiogram uvloop typing python-dotenv && \
    apt-get -y remove build-essential curl && apt-get -y autoremove --purge && apt-get -y clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /var/cache/apt

#RUN apt -qy update && \
#    apt -qy install --no-install-recommends -y build-essential curl && \
#    /usr/local/bin/python -m pip install --upgrade pip && \
#    curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/install-poetry.py | python - && \
#    export PATH="/root/.local/bin:$PATH" && \
#    poetry config virtualenvs.create false && \
#    poetry install --only main && \
#    poetry cache clear --no-interaction --all pypi && \
#    curl -sSL https://raw.githubusercontent.com/sdispater/poetry/master/get-poetry.py | python - --uninstall && \
#    apt-get -y remove build-essential curl && apt-get -y autoremove --purge && apt-get -y clean && \
#    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /var/cache/apt

ENTRYPOINT ["python", "-m", "bot"]
