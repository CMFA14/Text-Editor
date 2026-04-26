# Flimas Workspace

> Workspace pessoal de produtividade — documentos, planilhas, código, imagens, notas e quadros Kanban — **rodando 100% no navegador**, sem backend obrigatório.

Tudo que você cria fica salvo no próprio navegador (`localStorage`), com contas locais protegidas por senha (PBKDF2 + salt), painel administrativo completo e um caminho pronto pra ligar Supabase quando quiser sincronizar entre dispositivos.

---

## Sumário

- [O que tem dentro](#o-que-tem-dentro)
- [Demo rápida](#demo-rápida)
- [Stack](#stack)
- [Rodando localmente](#rodando-localmente)
- [Como o login funciona](#como-o-login-funciona)
- [Painel administrativo](#painel-administrativo)
- [Plano Pro (modo dev)](#plano-pro-modo-dev)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Modelo de dados local](#modelo-de-dados-local)
- [Backup e restauração](#backup-e-restauração)
- [Indo multi-device com Supabase](#indo-multi-device-com-supabase)
- [Build e deploy](#build-e-deploy)
- [Roadmap](#roadmap)

---

## O que tem dentro

O Flimas Workspace concentra seis ferramentas em um app só:

| Produto | Tipo | O que faz |
|---|---|---|
| **Flimas Docs** | `doc` | Editor rico (Tiptap) com tabelas, imagens, listas, headings, blockquote, code block, alinhamento, fontes e cores. |
| **Flimas Sheets** | `sheet` | Planilhas (Univer) com células, fórmulas, importação de `.xlsx`/`.csv` e exportação. |
| **Flimas Code** *(Pro)* | `code` | Editor de código (CodeMirror) com syntax highlighting para JS/TS, Python, CSS, HTML, JSON, SQL e Markdown. |
| **Flimas Studio** *(Pro)* | `image` | Editor de imagem em camadas (Fabric.js): formas, texto, filtros, importação e exportação PNG/JPEG/PDF. |
| **Flimas Notes** | `notes` | Anotações rápidas em Markdown com preview. |
| **Flimas Tasks** | `tasks` | Quadros Kanban configuráveis (colunas com cor + cards). |

Tudo compartilha o mesmo dashboard, com filtros por tipo, busca por nome, criação a partir de templates, importação de arquivos e auto-save a cada 3 s.

### Recursos transversais

- **Histórico de versões** (snapshot automático a cada 5 min, restauração com 1 clique).
- **Atalhos de teclado**: `Ctrl+S` salvar, `Ctrl+H` localizar, `Ctrl+N` novo, `Ctrl+P` imprimir, `F11` modo foco.
- **Exportação multi-formato**: PDF, HTML, Markdown, TXT, XLSX, CSV, PNG, JPEG.
- **Modo claro/escuro/sistema**, densidade compacta/confortável e *reduced motion*.
- **PWA-ready** (build single-file via `vite-plugin-singlefile`).

---

## Demo rápida

```bash
npm install
npm run dev
# abre em http://localhost:5173
```

1. **Cadastre-se** na primeira tela. O **primeiro usuário vira admin + Pro automaticamente**.
2. Você cai na tela inicial (Home) → clique em **Meus Arquivos** pra abrir o dashboard.
3. **Novo** → escolha o tipo (Doc, Sheet, Code, Studio, Notes, Tasks) e comece a usar.
4. ⚙️ → **Painel Admin** → página inteira para gerenciar usuários, plano Pro, atividade, backup e armazenamento.

---

## Stack

| Camada | Tecnologia |
|---|---|
| UI / Build | React 19, Vite 5, TypeScript 5.9 (strict) |
| Estilo | Tailwind CSS 4 + variáveis CSS custom |
| Editor de texto | Tiptap 3 + ProseMirror |
| Planilhas | Univer (`@univerjs/presets`) |
| Código | CodeMirror 6 + temas e linguagens dedicadas |
| Imagem | Fabric.js 7 |
| Ícones | lucide-react |
| Persistência | `localStorage` (com adaptador Supabase opcional) |
| Auth | Web Crypto API (PBKDF2 SHA-256, 120k iterações, salt 16 B) |
| PDF | html2pdf.js |
| XLSX/CSV | SheetJS (`xlsx`) |
| Markdown | marked + DOMPurify |

Sem backend. Sem servidor. Build final é um único `index.html` self-contained.

---

## Rodando localmente

Pré-requisitos: **Node 20+** e **npm 10+**.

```bash
git clone <repo>
cd Text-Editor

npm install         # instala tudo
npm run dev         # dev server em http://localhost:5173
npm run build       # produção em dist/
npm run preview     # serve o build
```

Os scripts vivem em `package.json`. Vite fica configurado em `vite.config.ts`.

---

## Como o login funciona

O Flimas é **local-first**: cada navegador é uma "base de dados" separada. Por baixo:

1. **Senha** é derivada com PBKDF2 (SHA-256, 120k iterações) + salt aleatório de 16 B. Apenas o hash + salt vão para o `localStorage` — a senha em texto plano nunca é gravada.
2. **Sessão** é uma chave separada (`flimas_session_v1`) com `userId` + `loggedInAt`.
3. **Comparação de hash** usa algoritmo *constant-time* (resistente a timing attacks).
4. **Validações**: usuário 3–32 caracteres alfanuméricos (`[a-zA-Z0-9._-]`), senha mínima de 6 caracteres.
5. **Primeiro usuário** cadastrado vira automaticamente admin **e** Pro — bootstrap simples, sem precisar editar arquivo.

> ⚠️ Como cada navegador tem sua própria base, a conta criada no Chrome **não** aparece no Edge. Isso é por design (local-first). Para um único banco compartilhado, ligue o adaptador Supabase descrito mais abaixo.

---

## Painel administrativo

Acesse via ⚙️ **Configurações → Painel Admin** (só aparece para usuários com `isAdmin: true`).

A página é dividida em **5 abas** numa sidebar fixa:

### 1. Visão Geral
- KPI cards: total de usuários (com sparkline 7d de cadastros), admins (avatares empilhados), Pros (% de conversão) e arquivos (separados por tipo).
- Atalhos rápidos: gerenciar usuários, liberar Pro pra alguém (dropdown), exportar backup.

### 2. Usuários
- **Tabela completa** com checkbox, avatar, e-mail, plano, função, data de cadastro, último login e contagem de arquivos.
- Filtros: busca textual, função (admin/usuário), plano (Pro/Free), ordenação (nome, cadastro, último login, arquivos).
- **Bulk actions**: liberar/remover Pro em massa, excluir múltiplos usuários (proteções: nunca o último admin nem você mesmo).
- Menu por linha: editar nome, resetar senha, alternar Pro, alternar admin, excluir.
- Em mobile vira uma lista de cards.

### 3. Plano Pro
- Tabela de assinantes com data de upgrade, origem (`admin` ou `self`), tempo como Pro.
- Estatísticas: liberados pelo admin vs. auto-ativados (modo dev).
- Botão **Liberar Pro em massa** (modal com checkboxes de quem ainda não é Pro).
- Card informativo com preço atual e benefícios (lê de `src/pro.ts`).

### 4. Atividade
- Tabela ordenada por último login.
- Highlight rosa em "Nunca logou".
- Mini-barras coloridas mostrando arquivos por tipo, por usuário.
- Card de inativos há +30 dias (sugestão para contatar).

### 5. Sistema
- **Storage**: total ocupado em `localStorage` + breakdown por usuário (com barra de % do total).
- **Backup**: exporta JSON completo (`flimas-backup-AAAA-MM-DD.json`) com contas (hash + salt) + arquivos + histórico.
- **Restaurar**: importa um JSON gerado pelo backup.
- **Status do backend**: badge "Local-first" / "Supabase" + atalho com instruções resumidas.
- **Zona de perigo** (vermelho): apagar arquivos de todos (mantém contas) e factory reset (apaga TUDO, exige digitar `RESETAR`).

> O painel é uma **página inteira** (não um modal), com sidebar lateral e header próprio — pra dar espaço de respirar e crescer.

---

## Plano Pro (modo dev)

Como o app é local, **não há cobrança real** ainda. O plano Pro é controlado por uma flag boolean `user.isPro` na conta:

- **Quem é Pro**: pode criar/editar Flimas Code e Flimas Studio.
- **Quem não é Pro**: vê esses produtos com badge "PRO". Tentar criar dispara o modal de upgrade. Arquivos Pro existentes abrem em modo somente-leitura.
- **Como liberar**: o admin libera pelo Painel Admin. Em desenvolvimento, qualquer usuário pode ativar Pro pra si mesmo via Configurações → Toggle Pro (`proGrantedBy: 'self'`).
- Preço e benefícios ficam centralizados em `src/pro.ts`.

Trocar isso por uma cobrança real (Stripe / Pix / etc.) é um trabalho posterior — a estrutura já tá pronta pra receber.

---

## Estrutura de pastas

```
src/
├─ App.tsx                       Roteador interno (home/dashboard/editor/admin) + auto-save
├─ auth.ts                       Auth local (PBKDF2), namespacing por usuário, backup, factory reset
├─ storage.ts                    CRUD de arquivos (lê/escreve por userId)
├─ history.ts                    Snapshots de versão por arquivo
├─ pro.ts                        Constantes do plano Pro + canCreate
├─ supabase.ts                   Adaptador opcional (instruções + skeleton comentado)
├─ types.ts                      FileEntry, FileKind, TasksDoc, etc.
│
├─ components/
│  ├─ AdminPage.tsx              Shell da página admin (sidebar + header + tab switch)
│  ├─ admin/
│  │  ├─ AdminOverview.tsx       Aba 1 — KPIs e atalhos
│  │  ├─ AdminUsers.tsx          Aba 2 — tabela, filtros, bulk
│  │  ├─ AdminPro.tsx            Aba 3 — assinantes Pro + liberação em massa
│  │  ├─ AdminActivity.tsx       Aba 4 — logins + arquivos por tipo
│  │  └─ AdminSystem.tsx         Aba 5 — storage, backup, danger zone
│  ├─ AuthScreen.tsx             Login + cadastro
│  ├─ Dashboard.tsx              Grade de arquivos + sidebar de filtros
│  ├─ HomeLanding.tsx            Tela inicial
│  ├─ SettingsModal.tsx          Modal de configurações + perfil + logout
│  ├─ UpgradeModal.tsx           Paywall do Pro
│  ├─ VersionHistory.tsx         Snapshots por arquivo
│  ├─ flimas/                    Flimas Studio (canvas Fabric.js)
│  ├─ SheetEditor.tsx            Wrapper Univer
│  ├─ CodeEditor.tsx             Wrapper CodeMirror
│  ├─ NotesEditor.tsx            Markdown editor
│  ├─ TasksEditor.tsx            Kanban editor
│  ├─ MenuBar.tsx, FindReplace.tsx, ProBadge.tsx, Toast.tsx, ...
│
├─ extensions/                   Extensões Tiptap próprias (FontSize, etc.)
├─ utils/                        markdown, sanitize, sheetIo, imageExport, download
└─ assets/                       Logos SVG/PNG
```

---

## Modelo de dados local

Tudo fica em `localStorage` com prefixo `flimas_*`:

| Chave | Conteúdo |
|---|---|
| `flimas_auth_v1` | `{ version: 1, users: User[] }` — todas as contas com hash + salt. |
| `flimas_session_v1` | `{ userId, loggedInAt }` — sessão atual. |
| `flimas_settings_v1` | Tema, densidade, reduced motion. |
| `flimas_u_<userId>_files` | Arquivos do usuário (`StorageSchema`). |
| `flimas_u_<userId>_editor_history_<fileId>` | Snapshots de versão por arquivo. |

**Namespace por usuário** garante que o Filipe não veja os arquivos da Maria nem por engano. O admin pode contar/listar/deletar arquivos de qualquer usuário, mas isso passa pelas funções públicas em `auth.ts` (não há leitura cross-user dentro dos editores).

### `User`
```ts
interface User {
  id: string                    // uuid
  username: string              // único, lowercase
  displayName: string
  email?: string
  passwordHash: string          // base64 (PBKDF2)
  passwordSalt: string          // base64
  isAdmin: boolean
  isPro: boolean
  proSince?: string             // ISO 8601
  proGrantedBy?: 'admin' | 'self'
  createdAt: number             // ms
  lastLoginAt?: number          // ms
}
```

---

## Backup e restauração

Pelo Painel Admin → Sistema → **Exportar tudo** baixa um JSON com:

```ts
interface FlimasBackup {
  version: 1
  exportedAt: string
  users: User[]                 // ⚠️ inclui hash + salt das senhas
  data: {
    [userId]: {
      files: string | null      // raw JSON do StorageSchema
      history: { [fileId]: string }   // raw JSON dos snapshots
    }
  }
}
```

A restauração sobrescreve as contas e arquivos atuais. Tratar o arquivo como senha — qualquer um com ele pode autenticar.

---

## Indo multi-device com Supabase

O arquivo `src/supabase.ts` traz **instruções passo-a-passo + SQL pronto + skeleton TypeScript** para virar a chave e ter um único banco compartilhado entre dispositivos:

1. Criar projeto no Supabase (free tier basta).
2. Rodar o SQL fornecido (cria `profiles`, `files`, `file_history` + RLS por `auth.uid()` + trigger pra criar profile no signup).
3. `.env.local` com `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_USE_SUPABASE=true`.
4. `npm install @supabase/supabase-js` e descomentar o bloco TODO.
5. Substituir reads/writes em `auth.ts` e `storage.ts` pelos chamados Supabase (a interface pública não muda).

A ideia é que o resto do app continue funcionando sem alteração — só esses 2 arquivos têm implementação dupla (local + remoto).

---

## Build e deploy

```bash
npm run build       # gera dist/
```

Por padrão o `vite-plugin-singlefile` empacota tudo em `dist/index.html` (CSS, JS e assets inline). Resultado: **um único arquivo HTML** que você pode servir de qualquer hospedagem estática (GitHub Pages, Netlify, Cloudflare Pages, S3, ou até abrir direto do disco).

Limitações do single-file:
- Imagens muito grandes incham o bundle (use Studio com moderação).
- Código com muitas linguagens carrega só sob demanda (lazy chunks).

---

## Roadmap

- [ ] Adaptador Supabase real (substituir TODOs em `src/supabase.ts`).
- [ ] Cobrança real do Pro (Stripe / Pix).
- [ ] Compartilhamento de arquivos por link (ler-only).
- [ ] Comentários colaborativos (precisa do Supabase ligado).
- [ ] PWA install banner + offline-first via Service Worker.
- [ ] App mobile via Capacitor (a base local-first ajuda muito).

---

Feito com paciência, café e Tailwind.
