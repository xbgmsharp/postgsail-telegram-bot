# PostgSail Telegram Bot

A Telegram bot for [PostgSail](https://xbgmsharp.github.io/postgsail/) that uses Mistral AI and the Model Context Protocol (MCP) to answer natural language queries about your vessel.

## Quick start

```bash
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

## Environment variables

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from BotFather (**required**) |
| `POSTGSAIL_API_URL` | PostgSail API base URL (e.g. PostgREST instance) (**required**) |
| `POSTGSAIL_WEB_URL` | PostgSail web app URL (**required**) |
| `POSTGSAIL_MCP_URL` | MCP server endpoint — if unset, natural language queries are disabled |
| `MISTRAL_API_KEY` | Mistral AI API key |

## Commands

```bash
npm run dev       # Run with ts-node (no build required)
npm run build     # Compile TypeScript to dist/
npm start         # Run compiled output from dist/
npm run watch     # Watch mode for incremental compilation
```

## Bot commands

| Command | Description |
|---|---|
| `/start` | Start bot / show menu |
| `/boat` | Vessel information |
| `/monitoring` | Live monitoring data |
| `/logs` | Trip logs |
| `/moorages` | Moorages |
| `/stays` | Stays |
| `/settings` | User profile |
| `/help` | Show help |
| `/cancel` | Cancel current operation |

Free-text messages are handled as natural language queries. Examples:

- "Where is my boat?"
- "Show me my last trip"
- "What's my battery voltage?"
- "List recent moorages"

## Architecture

The bot connects three systems: **Telegram** (user interface) → **Mistral AI** (reasoning) → **PostgSail MCP server** (data).

```
src/
  bot/
    index.ts          # Entry point: bot setup, command registration, middleware stack
    commands/         # One file per slash command (boat, monitoring, logs, moorages, stays, settings)
    scenes/
      auth.scene.ts   # Multi-step auth flow (email → OTP → JWT)
  orchestration/
    agent.ts          # OrchestrationAgent: agentic loop using Mistral + MCP tools
  mcp/
    client.ts         # MCPClient: JSON-RPC 2.0 over HTTP to the MCP server
  api/
    client.ts         # ApiClient: REST calls to PostgSail API (verification, etc.)
  types/
    context.ts        # MyContext / SessionData types for Telegraf
  utils/
    errors.ts         # AuthError class, clearSession, getUserFriendlyError
    logger.ts         # Leveled logger utility
    typing.ts         # TypingIndicator: sends periodic typing action during long ops
    format.ts         # Formatting helpers
    retry.ts          # Retry utilities
```

### Key flows

**Authentication:** Every command calls `ensureAuthenticated()` before executing. This checks the in-memory session token (cached for 30 min), then falls back to `apiClient.verification(chatId)`. New users enter the `auth` scene (email → OTP). On `AuthError` mid-request, `withAuthRetry()` silently refreshes the JWT once and retries.

**Natural language queries:** Free-text messages go to `OrchestrationAgent.processQuery()`. This runs a max-5-step agentic loop: Mistral selects which MCP tool to call, the result is appended to history, then Mistral summarizes the collected data into a Markdown Telegram message.

**MCP client:** `MCPClient` uses JSON-RPC 2.0 over stateless HTTP POST. It lazily initializes the MCP session on first use and passes the user's JWT as a Bearer token so the MCP server can enforce per-user data access.

**Session:** In-memory Telegraf session stores `token`, `tokenTimestamp`, `authenticated`, `language`, and `awaitingInput`. There is no persistent session store — sessions reset on bot restart.

## License

Distributed under the GPL-3.0 license. See `LICENSE` for more information.
