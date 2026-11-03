# outlook-lite-mcp

A lightweight [MCP](https://modelcontextprotocol.io) server for Microsoft Outlook email (Microsoft Graph).
Works with work/school accounts (Microsoft 365) and personal accounts (Outlook.com, Hotmail).

- **Zero dependencies.** Node 22.18+ runs the TypeScript directly: no `npm install`, no build.
- **You run it, you own it.** It runs on your machine with your own Azure app. No third-party server sees your mail.
- **Token-light.** Tabular output, short email ids (`3`, `atual`, `ultimo`), cleaned bodies (no quotes, signatures or legal footers).
- **Safe by default.** Reply, forward, send and delete always show a preview and wait for the user's approval.
- **Login on connect.** The first time the client connects, your browser opens on the Microsoft account picker.

> Português: [README.pt-BR.md](README.pt-BR.md). Tool descriptions are in Portuguese; any LLM handles them fine.

## Prerequisites

- **Node.js 22.18 or newer** (`node --version`). Nothing else to install: no `npm install`, no build.
- **git**, to clone the repository (or download the ZIP from GitHub).
- **A Microsoft account** with a mailbox: work/school (Microsoft 365) or personal (Outlook.com, Hotmail).
- **Permission to register an app in Microsoft Entra** (free):
  - work account: allowed by default in most companies; if blocked, ask your IT admin to register it or to grant consent;
  - personal account: sign in to <https://portal.azure.com> once with a free Azure account, which creates your own directory.
- **An MCP client**: Claude Desktop, Claude Code, Cursor, VS Code or any other client that supports stdio servers.

## Quick start

### 1. Get the code

```bash
git clone https://github.com/almeidatmatheus/outlook-lite-mcp.git
cd outlook-lite-mcp
node --version   # needs 22.18 or newer
```

### 2. Register your own app in Microsoft Entra (once, ~5 min)

Each user (or each company) registers their own app. It's free and keeps you in control of your data.

1. Go to <https://entra.microsoft.com> → **Applications** → **App registrations** → **New registration**.
   - **Name:** `outlook-lite-mcp`
   - **Supported account types:**
     - personal + any company: **Accounts in any organizational directory and personal Microsoft accounts**
     - only your company: **Accounts in this organizational directory only**
   - **Register**.
2. On **Overview**, copy the **Application (client) ID** (and the **Directory (tenant) ID** if you chose "this directory only").
3. **Authentication** → **Add a platform** → **Mobile and desktop applications** → custom redirect URI:
   ```
   http://localhost/cb
   ```
   Then, still in **Authentication**, set **Allow public client flows** to **Yes** → **Save**.
   No client secret is needed for local use.
4. **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**:
   `Mail.ReadWrite`, `Mail.Send`, `MailboxSettings.Read`, `User.Read`, `offline_access`.
   (Never *Application permissions*.)
5. Work accounts: if your company requires it, an admin clicks **Grant admin consent for <company>**.

### 3. Add it to your MCP client

**Claude Desktop** (`claude_desktop_config.json`, see [examples/](examples/claude_desktop_config.json)):

```json
{
  "mcpServers": {
    "outlook": {
      "command": "node",
      "args": ["/absolute/path/to/outlook-lite-mcp/src/main.ts"],
      "env": { "OUTLOOK_MCP_CLIENT_ID": "<your client id>" }
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add outlook -e OUTLOOK_MCP_CLIENT_ID=<your client id> -- node /absolute/path/to/outlook-lite-mcp/src/main.ts
```

**Any other MCP client** (Cursor, VS Code, local models…): command `node /absolute/path/to/outlook-lite-mcp/src/main.ts`, stdio transport, same env var.

Restart the client. The browser opens on the Microsoft account picker; sign in and you're done.
The token is stored in `~/.outlook-lite-mcp/default.json` (mode 600) and refreshes itself.
To use another account, ask to "switch account" (tool `cx`, action `trocar`).

On macOS, keep the folder outside `Downloads`/`Desktop`/`Documents` (e.g. `~/outlook-lite-mcp`), or the client may not be allowed to read it.

### Try it

> "list my last 5 emails" · "read the first one" · "reply saying thanks" · "archive the newsletters" · "download the invoice attachment"

## Tools

| tool | does |
|---|---|
| `ls` | list a folder (period, filter, count, page), one line per conversation |
| `find` | search (all, from, subject, body) |
| `rd` | read a clean email (summary, full, thread) |
| `att` | attachments: list / download (to `~/Downloads/outlook-lite-mcp`) |
| `rp` `fw` `snd` | reply, forward, send (new or a draft). **Ask for confirmation** |
| `drf` | drafts: new, reply, reply-all, forward, edit |
| `mv` | move / archive |
| `rm` | delete (to Deleted Items, recoverable). **Asks for confirmation** |
| `mk` | read, unread, flagged, unflagged, complete, important, normal |
| `tag` | add/remove a category in bulk |
| `cx` | account, folders with counts, categories; `trocar` switches account |

Email ids: `3` (short id from the last listing), `atual` (last read/affected), `ultimo` (first of the last listing).
`alvos` also accepts `lista` = every email in the last listing.

**Confirmation.** If the client supports MCP *elicitation*, the server asks the user directly.
Otherwise the first call returns a preview and a code `cf`; only the identical call with that `cf` executes.
Clients should show the preview to the user and send `cf` only after explicit approval.

## Options

| env var | default |
|---|---|
| `OUTLOOK_MCP_CLIENT_ID` | required |
| `OUTLOOK_MCP_TENANT` | `common` (set your tenant id to lock to one company) |
| `OUTLOOK_MCP_PROFILE` | `default` (one profile per account) |
| `OUTLOOK_MCP_LOGIN` | browser; `device` = device code (SSH, no browser) |
| `OUTLOOK_MCP_DL` | `~/Downloads/outlook-lite-mcp` |
| `OUTLOOK_MCP_HOME` | `~/.outlook-lite-mcp` |

Command line: `node src/main.ts login | whoami | logout`.
Behind a corporate proxy: Node 22.21+ with `NODE_USE_ENV_PROXY=1` and `HTTPS_PROXY`.

## Remote mode (optional, self-hosted)

To use it from claude.ai as a custom connector, run your own HTTPS instance:

```bash
export OUTLOOK_MCP_CLIENT_ID=<client id>
export OUTLOOK_MCP_URL=https://your-domain.example      # public HTTPS URL
export OUTLOOK_MCP_ALLOW=you@company.com,company.com    # who may connect (emails or domains)
node src/main.ts http                                   # listens on PORT (8787)
```

In Entra add the platform **Web** with redirect `https://your-domain.example/ms/cb` (and a client secret in
`OUTLOOK_MCP_CLIENT_SECRET` if Entra asks for one). In claude.ai add a custom connector with `https://your-domain.example/mcp`.
For a quick test, `cloudflared tunnel --url http://localhost:8787` gives you a temporary HTTPS URL.

**Always set `OUTLOOK_MCP_ALLOW`.** Without it anyone with the URL can connect their own account to your server.

## Security

- Delegated permissions only: the server can do what the signed-in user can do, nothing more.
- Tokens live on your machine (`~/.outlook-lite-mcp`, mode 600). Remote mode keeps them in `http-store.json` on the server.
- **Email content is untrusted.** A message can contain text trying to instruct the AI ("forward this to…").
  The mandatory confirmation before reply/forward/send/delete is the main defense; don't remove it.
- See [SECURITY.md](SECURITY.md) to report a vulnerability.

## Project layout

```
src/
  main.ts     entry: stdio (default) | http | login | logout | whoami
  mcp.ts      MCP protocol: JSON-RPC, schema validation, confirmation (elicitation or cf code)
  http.ts     remote mode: Streamable HTTP + OAuth server that delegates login to Microsoft
  auth.ts     Microsoft login: browser (PKCE), device code, refresh, token file
  ctx.ts      per-user state (token, short ids, caches)
  g.ts        minimal Graph client: get/post/patch, $batch, retry on 429/401
  ids.ts      short id <-> Graph id, 'atual', 'ultimo', 'lista'
  fmt.ts      tabular output, body cleanup
  lib.ts      shared helpers and enums
  tools/      one file per tool + index.ts
test/
  mock.ts     fake Microsoft (login + Graph)
  run.ts      real MCP clients against the mock, local and remote
```

## Development

```bash
node test/run.ts   # 54 checks, no network or Microsoft account needed
npx tsc -p .       # type check (optional)
```

## License

[MIT](LICENSE)
