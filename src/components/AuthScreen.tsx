import { useState, useMemo } from 'react'
import { Lock, User, Sparkles, Eye, EyeOff, ShieldCheck, Crown, AtSign } from 'lucide-react'
import { register, login, listUsers, type User as AuthUser } from '../auth'
import flimasLogo from '../assets/flimas-logo.svg'

type Mode = 'login' | 'register'

interface AuthScreenProps {
  onSuccess: (user: AuthUser) => void
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const totalUsers = useMemo(() => listUsers().length, [])
  const isFirstUser = totalUsers === 0
  const [mode, setMode] = useState<Mode>(isFirstUser ? 'register' : 'login')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      const result = mode === 'login'
        ? await login(username, password)
        : await register({ username, password, displayName: displayName || undefined, email: email || undefined })
      if (!result.ok) {
        setError(result.error)
        return
      }
      onSuccess(result.user)
    } catch (err) {
      console.error(err)
      setError('Falha inesperada. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 via-slate-50 to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Hero side */}
        <div className="hidden md:flex flex-col gap-6 px-4">
          <div className="flex items-center gap-3">
            <img src={flimasLogo} alt="Flimas" className="h-9 w-auto" />
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
            Seu workspace
            <span className="block bg-gradient-to-r from-violet-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
              tudo em um lugar.
            </span>
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-md">
            Documentos, planilhas, código, imagens, anotações e quadros Kanban.
            Crie sua conta e tenha tudo salvo no seu perfil.
          </p>
          <div className="flex flex-col gap-3 mt-2">
            <Feature icon={<ShieldCheck size={16} />} text="Senha protegida com PBKDF2 (SHA-256, 120k iterações)." />
            <Feature icon={<Sparkles size={16} />} text="Cada usuário tem seu próprio acervo isolado." />
            <Feature icon={<Crown size={16} />} text="Plano Pro libera Flimas Code e Flimas Studio." />
          </div>
        </div>

        {/* Form card */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="md:hidden flex items-center gap-2 mb-3">
                <img src={flimasLogo} alt="Flimas" className="h-7 w-auto" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {mode === 'login' ? 'Entrar no Flimas' : 'Criar sua conta'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {mode === 'login'
                  ? 'Acesse seu workspace e continue de onde parou.'
                  : isFirstUser
                    ? 'Você é o primeiro usuário deste navegador — vai virar admin automaticamente.'
                    : 'Cadastre-se em segundos. Seus arquivos ficam salvos no seu perfil.'}
              </p>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4">
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
                <Tab active={mode === 'login'} onClick={() => { setMode('login'); setError(null) }}>Entrar</Tab>
                <Tab active={mode === 'register'} onClick={() => { setMode('register'); setError(null) }}>Cadastrar</Tab>
              </div>
            </div>

            <form className="px-6 py-6 flex flex-col gap-3" onSubmit={handleSubmit}>
              <Field
                label="Usuário"
                icon={<User size={16} />}
                hint={mode === 'register' ? 'Letras, números, ponto, hífen ou underscore.' : undefined}
              >
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="ex.: filipe"
                  required
                  className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </Field>

              {mode === 'register' && (
                <>
                  <Field label="Nome de exibição (opcional)" icon={<Sparkles size={16} />}>
                    <input
                      type="text"
                      autoComplete="name"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Como você quer ser chamado"
                      className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </Field>
                  <Field label="E-mail (opcional)" icon={<AtSign size={16} />}>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="voce@exemplo.com"
                      className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </Field>
                </>
              )}

              <Field label="Senha" icon={<Lock size={16} />}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Pelo menos 6 caracteres"
                  required
                  minLength={6}
                  className="w-full bg-transparent outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </Field>

              {error && (
                <div role="alert" className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-2 w-full px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 text-white font-extrabold text-sm shadow-lg shadow-violet-500/30 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {mode === 'login' ? 'Entrando…' : 'Criando conta…'}
                  </>
                ) : (
                  mode === 'login' ? 'Entrar' : 'Criar conta'
                )}
              </button>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-1 leading-relaxed">
                Suas credenciais ficam <b>apenas neste navegador</b>. Para sincronizar entre dispositivos,
                conecte um backend (Supabase/Firebase) — veja <code className="font-mono">src/supabase.ts</code>.
              </p>
            </form>
          </div>

          <p className="text-[11px] text-center text-slate-400 mt-4">
            {totalUsers > 0 && (
              <>{totalUsers} {totalUsers === 1 ? 'usuário cadastrado' : 'usuários cadastrados'} neste navegador.</>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 rounded-lg text-sm font-extrabold transition-all ${
        active
          ? 'bg-white dark:bg-slate-900 text-violet-600 shadow-sm'
          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
      }`}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

function Field({
  label, icon, hint, children,
}: {
  label: string
  icon: React.ReactNode
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <span className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
        <span className="text-slate-400 shrink-0">{icon}</span>
        {children}
      </span>
      {hint && <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug">{hint}</span>}
    </label>
  )
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
      <span className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-violet-600 shrink-0">
        {icon}
      </span>
      <span className="leading-snug">{text}</span>
    </div>
  )
}
