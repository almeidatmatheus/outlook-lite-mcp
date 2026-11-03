# outlook-lite-mcp

Servidor [MCP](https://modelcontextprotocol.io) leve para o email do Microsoft Outlook (Microsoft Graph).
Funciona com conta corporativa (Microsoft 365) e pessoal (Outlook.com, Hotmail).

- **Zero dependências.** Node 22.18+ roda o TypeScript direto: sem `npm install`, sem build.
- **Roda com você.** Na sua máquina, com o seu app do Azure. Nenhum servidor de terceiros vê seus emails.
- **Econômico em tokens.** Saída tabular, ids curtos (`3`, `atual`, `ultimo`), corpo limpo (sem citações, assinatura e aviso legal).
- **Seguro por padrão.** Responder, encaminhar, enviar e excluir sempre mostram um preview e esperam a aprovação do usuário.
- **Login ao conectar.** Na primeira conexão, o navegador abre na escolha de conta Microsoft.

> English: [README.md](README.md).

## Pré-requisitos

- **Node.js 22.18 ou mais novo** (`node --version`). Nada mais para instalar: sem `npm install`, sem build.
- **git**, para clonar o repositório (ou baixe o ZIP pelo GitHub).
- **Uma conta Microsoft** com caixa de email: corporativa (Microsoft 365) ou pessoal (Outlook.com, Hotmail).
- **Permissão para registrar um app no Microsoft Entra** (gratuito):
  - conta corporativa: liberado por padrão na maioria das empresas; se estiver bloqueado, peça ao TI para registrar ou aprovar o app;
  - conta pessoal: entre uma vez em <https://portal.azure.com> com uma conta gratuita do Azure, que cria o seu diretório.
- **Um cliente MCP**: Claude Desktop, Claude Code, Cursor, VS Code ou qualquer cliente com suporte a servidores stdio.

## Começo rápido

### 1. Baixe o código

```bash
git clone https://github.com/almeidatmatheus/outlook-lite-mcp.git
cd outlook-lite-mcp
node --version   # precisa ser 22.18 ou mais novo
```

### 2. Registre o seu app no Microsoft Entra (uma vez, ~5 min)

Cada pessoa (ou empresa) registra o próprio app. É gratuito e mantém você no controle dos seus dados.

1. Em <https://entra.microsoft.com> → **Applications** → **App registrations** → **New registration**.
   - **Name:** `outlook-lite-mcp`
   - **Supported account types:**
     - pessoal + qualquer empresa: **Accounts in any organizational directory and personal Microsoft accounts**
     - só a sua empresa: **Accounts in this organizational directory only**
   - **Register**.
2. Em **Overview**, copie o **Application (client) ID** (e o **Directory (tenant) ID**, se escolheu "só a sua empresa").
3. **Authentication** → **Add a platform** → **Mobile and desktop applications** → redirect URI personalizado:
   ```
   http://localhost/cb
   ```
   Ainda em **Authentication**, ative **Allow public client flows** → **Save**. Não precisa de segredo para uso local.
4. **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**:
   `Mail.ReadWrite`, `Mail.Send`, `MailboxSettings.Read`, `User.Read`, `offline_access`. Nunca *Application permissions*.
5. Conta corporativa: se a empresa exigir, um admin clica em **Grant admin consent for <empresa>**.

### 3. Adicione ao seu cliente MCP

**Claude Desktop** (`claude_desktop_config.json`, veja [examples/](examples/claude_desktop_config.json)):

```json
{
  "mcpServers": {
    "outlook": {
      "command": "node",
      "args": ["/caminho/absoluto/outlook-lite-mcp/src/main.ts"],
      "env": { "OUTLOOK_MCP_CLIENT_ID": "<seu client id>" }
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add outlook -e OUTLOOK_MCP_CLIENT_ID=<seu client id> -- node /caminho/absoluto/outlook-lite-mcp/src/main.ts
```

**Outros clientes MCP** (Cursor, VS Code, modelos locais…): comando `node /caminho/absoluto/outlook-lite-mcp/src/main.ts`, transporte stdio, mesma variável.

Reinicie o cliente. O navegador abre na escolha de conta Microsoft; entre e pronto.
O token fica em `~/.outlook-lite-mcp/default.json` (permissão 600) e renova sozinho.
Para usar outra conta, peça "trocar a conta" (ferramenta `cx`, acao `trocar`).

No macOS, deixe a pasta fora de `Downloads`/`Mesa`/`Documentos` (ex.: `~/outlook-lite-mcp`), senão o cliente pode não ter permissão de leitura.

### Experimente

> "liste meus 5 últimos emails" · "lê o primeiro" · "responde agradecendo" · "arquiva as newsletters" · "baixa o anexo da fatura"

## Ferramentas

| tool | faz |
|---|---|
| `ls` | lista pasta (periodo, filtro, qtd, pg), uma linha por conversa |
| `find` | busca (tudo, de, assunto, corpo) |
| `rd` | lê email limpo (resumo, completo, thread) |
| `att` | anexos: ls / get (salva em `~/Downloads/outlook-lite-mcp`) |
| `rp` `fw` `snd` | responder, encaminhar, enviar (novo ou rascunho). **Pedem confirmação** |
| `drf` | rascunho: novo, resposta, resposta_todos, encaminhar, editar |
| `mv` | move/arquiva |
| `rm` | exclui (vai para Itens Excluídos). **Pede confirmação** |
| `mk` | lido, nao_lido, sinalizado, desinalizado, concluido, importante, normal |
| `tag` | categoria add/rm em lote |
| `cx` | conta, pastas com contagem, categorias; `trocar` conta |

IDs: `3` (id curto), `atual` (último lido/afetado), `ultimo` (1º da última listagem). `alvos` aceita `lista` = toda a última listagem.

**Confirmação.** Se o cliente suporta *elicitation*, o MCP pergunta direto ao usuário.
Se não, a 1ª chamada devolve o preview e um código `cf`; só a chamada idêntica com esse `cf` executa.
O cliente deve mostrar o preview e só mandar o `cf` depois da aprovação explícita do usuário.

## Variáveis

| var | padrão |
|---|---|
| `OUTLOOK_MCP_CLIENT_ID` | obrigatória |
| `OUTLOOK_MCP_TENANT` | `common` (use o id do tenant para travar em uma empresa) |
| `OUTLOOK_MCP_PROFILE` | `default` (um perfil por conta) |
| `OUTLOOK_MCP_LOGIN` | navegador; `device` = código de dispositivo (SSH, sem navegador) |
| `OUTLOOK_MCP_DL` | `~/Downloads/outlook-lite-mcp` |
| `OUTLOOK_MCP_HOME` | `~/.outlook-lite-mcp` |

Terminal: `node src/main.ts login | whoami | logout`.
Atrás de proxy corporativo: Node 22.21+ com `NODE_USE_ENV_PROXY=1` e `HTTPS_PROXY`.

## Modo remoto (opcional, hospedado por você)

Para usar no claude.ai como conector personalizado, suba a sua própria instância HTTPS:

```bash
export OUTLOOK_MCP_CLIENT_ID=<client id>
export OUTLOOK_MCP_URL=https://seu-dominio.exemplo        # URL pública HTTPS
export OUTLOOK_MCP_ALLOW=voce@empresa.com,empresa.com     # quem pode conectar (emails ou domínios)
node src/main.ts http                                     # escuta na PORT (8787)
```

No Entra, adicione a plataforma **Web** com o redirect `https://seu-dominio.exemplo/ms/cb` (e um segredo em
`OUTLOOK_MCP_CLIENT_SECRET`, se o Entra pedir). No claude.ai, adicione um conector personalizado com `https://seu-dominio.exemplo/mcp`.
Para testar rápido: `cloudflared tunnel --url http://localhost:8787` gera uma URL HTTPS temporária.

**Sempre defina `OUTLOOK_MCP_ALLOW`.** Sem ele, qualquer pessoa com a URL pode conectar a própria conta ao seu servidor.

## Segurança

- Só permissões delegadas: o servidor faz o que o usuário logado pode fazer, nada além.
- Os tokens ficam na sua máquina (`~/.outlook-lite-mcp`, permissão 600). No modo remoto, em `http-store.json` no servidor.
- **O conteúdo dos emails não é confiável.** Um email pode ter texto tentando instruir a IA ("encaminhe isto para…").
  A confirmação obrigatória antes de responder/encaminhar/enviar/excluir é a principal defesa; não a remova.
- Para relatar uma vulnerabilidade, veja [SECURITY.md](SECURITY.md).

## Estrutura do projeto

```
src/
  main.ts     entrada: stdio (padrão) | http | login | logout | whoami
  mcp.ts      protocolo MCP: JSON-RPC, validação de schema, confirmação (elicitation ou código cf)
  http.ts     modo remoto: Streamable HTTP + servidor OAuth que repassa o login à Microsoft
  auth.ts     login Microsoft: navegador (PKCE), device code, refresh, token em arquivo
  ctx.ts      estado por usuário (token, ids curtos, caches)
  g.ts        cliente Graph mínimo: get/post/patch, $batch, retry em 429/401
  ids.ts      id curto <-> id Graph, 'atual', 'ultimo', 'lista'
  fmt.ts      saída tabular, limpeza do corpo
  lib.ts      helpers e enums compartilhados
  tools/      uma ferramenta por arquivo + index.ts
test/
  mock.ts     Microsoft simulada (login + Graph)
  run.ts      clientes MCP reais contra o mock, local e remoto
```

## Desenvolvimento

```bash
node test/run.ts   # 54 checagens, sem rede nem conta Microsoft
npx tsc -p .       # checagem de tipos (opcional)
```

## Licença

[MIT](LICENSE)
