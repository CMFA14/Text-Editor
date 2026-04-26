/**
 * ════════════════════════════════════════════════════════════════════════════
 *  Adaptador Supabase — opcional, para virar multi-usuário REAL
 *  (sincroniza entre dispositivos e navegadores).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * O Flimas funciona 100% offline com `src/auth.ts` (local-first). Cada
 * navegador é um "banco" próprio. Pra ter UM único banco compartilhado entre
 * dispositivos (Pro liberado na conta do servidor, e não por máquina), conecte
 * este arquivo ao Supabase seguindo os 4 passos abaixo.
 *
 * ────────────────────────────────────────────────────────────────────────────
 *  PASSO 1 — Crie um projeto Supabase (free tier basta)
 * ────────────────────────────────────────────────────────────────────────────
 *  1. https://supabase.com → New Project
 *  2. Anote a Project URL e a anon/public key (Settings → API)
 *
 * ────────────────────────────────────────────────────────────────────────────
 *  PASSO 2 — Crie as tabelas (cole isto no SQL Editor)
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  -- Perfis (estende auth.users do Supabase com campos do app)
 *  create table public.profiles (
 *    id uuid primary key references auth.users on delete cascade,
 *    username text unique not null,
 *    display_name text not null,
 *    is_admin boolean not null default false,
 *    is_pro boolean not null default false,
 *    pro_since timestamptz,
 *    pro_granted_by text,
 *    created_at timestamptz not null default now()
 *  );
 *
 *  -- Arquivos do usuário
 *  create table public.files (
 *    id uuid primary key,
 *    user_id uuid not null references auth.users on delete cascade,
 *    kind text not null,
 *    title text not null,
 *    content text not null,
 *    last_modified bigint not null,
 *    created_at bigint not null
 *  );
 *  create index files_user_idx on public.files(user_id);
 *
 *  -- Snapshots de histórico
 *  create table public.file_history (
 *    id bigserial primary key,
 *    user_id uuid not null references auth.users on delete cascade,
 *    file_id uuid not null,
 *    timestamp bigint not null,
 *    title text not null,
 *    content text not null,
 *    kind text not null
 *  );
 *  create index file_history_idx on public.file_history(user_id, file_id, timestamp desc);
 *
 *  -- RLS: cada usuário só vê os próprios dados
 *  alter table public.profiles    enable row level security;
 *  alter table public.files       enable row level security;
 *  alter table public.file_history enable row level security;
 *
 *  create policy "self read profile"   on public.profiles for select using (auth.uid() = id);
 *  create policy "self update profile" on public.profiles for update using (auth.uid() = id);
 *  create policy "self read files"     on public.files    for select using (auth.uid() = user_id);
 *  create policy "self write files"    on public.files    for insert with check (auth.uid() = user_id);
 *  create policy "self update files"   on public.files    for update using (auth.uid() = user_id);
 *  create policy "self delete files"   on public.files    for delete using (auth.uid() = user_id);
 *  create policy "self read history"   on public.file_history for select using (auth.uid() = user_id);
 *  create policy "self write history"  on public.file_history for insert with check (auth.uid() = user_id);
 *
 *  -- Admins enxergam todos os profiles (pra liberar Pro pra qualquer um)
 *  create policy "admin read profiles" on public.profiles for select
 *    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
 *  create policy "admin update profiles" on public.profiles for update
 *    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
 *
 *  -- Trigger: cria profile automaticamente quando o usuário se cadastra
 *  create function public.handle_new_user() returns trigger as $$
 *  begin
 *    insert into public.profiles (id, username, display_name, is_admin, is_pro)
 *    values (
 *      new.id,
 *      coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
 *      coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
 *      (select count(*) from public.profiles) = 0,  -- primeiro usuário = admin
 *      (select count(*) from public.profiles) = 0   -- primeiro usuário = pro
 *    );
 *    return new;
 *  end;
 *  $$ language plpgsql security definer;
 *
 *  create trigger on_auth_user_created after insert on auth.users
 *    for each row execute function public.handle_new_user();
 *
 * ────────────────────────────────────────────────────────────────────────────
 *  PASSO 3 — Configure as credenciais
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  Crie um arquivo `.env.local` na raiz do projeto com:
 *
 *      VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
 *      VITE_SUPABASE_ANON_KEY="sua-anon-key-aqui"
 *      VITE_USE_SUPABASE="true"
 *
 *  Depois rode `npm install @supabase/supabase-js` e descomente o bloco
 *  marcado com TODO abaixo.
 *
 * ────────────────────────────────────────────────────────────────────────────
 *  PASSO 4 — Trocar src/auth.ts e src/storage.ts pelos adaptadores
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  Em `src/auth.ts`, ao invés de mexer no localStorage, suas funções
 *  (`register`, `login`, `setUserPro`, etc) chamarão `supabase.auth.signUp`,
 *  `supabase.auth.signInWithPassword`, e atualizarão a tabela `profiles`.
 *
 *  Em `src/storage.ts` e `src/history.ts`, troque os reads/writes por
 *  `supabase.from('files').select(...)` etc.
 *
 *  Como a interface pública (mesmas funções, mesmos tipos) NÃO muda,
 *  o resto da app continua funcionando sem alteração — só esses 2 arquivos
 *  precisam de implementação dupla.
 *
 *  Sugestão: adicione um flag em `src/featureFlags.ts`:
 *
 *      export const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true'
 *
 *  E faça `auth.ts` chamar `supabase.ts` quando o flag estiver ligado, caindo
 *  no localStorage caso contrário (perfeito pra desenvolvimento local).
 */

// ────────────────────────────────────────────────────────────────────────────
// TODO: descomentar quando @supabase/supabase-js estiver instalado.
// ────────────────────────────────────────────────────────────────────────────
//
// import { createClient } from '@supabase/supabase-js'
//
// const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
//
// export const supabase = url && key
//   ? createClient(url, key)
//   : null
//
// export const useSupabase = () => supabase !== null
//
// // Exemplo: registrar usuário no Supabase
// export async function supaRegister(input: { email: string; password: string; username: string; displayName?: string }) {
//   if (!supabase) throw new Error('Supabase não configurado')
//   const { data, error } = await supabase.auth.signUp({
//     email: input.email,
//     password: input.password,
//     options: {
//       data: { username: input.username, display_name: input.displayName ?? input.username },
//     },
//   })
//   if (error) throw error
//   return data.user
// }
//
// // Exemplo: setar Pro como admin
// export async function supaSetUserPro(userId: string, isPro: boolean) {
//   if (!supabase) throw new Error('Supabase não configurado')
//   const { error } = await supabase
//     .from('profiles')
//     .update({
//       is_pro: isPro,
//       pro_since: isPro ? new Date().toISOString() : null,
//       pro_granted_by: isPro ? 'admin' : null,
//     })
//     .eq('id', userId)
//   if (error) throw error
// }

// Placeholder — mantém o módulo válido enquanto o Supabase não foi ativado.
export const SUPABASE_READY = false
