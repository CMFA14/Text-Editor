import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  onReset?: () => void
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary capturou erro', error, info)
  }

  private handleReset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6"
      >
        <div className="max-w-lg w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Algo deu errado
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Ocorreu um erro inesperado no editor. Seu conteúdo salvo permanece intacto.
          </p>
          <pre className="text-[11px] text-left bg-slate-100 dark:bg-slate-900 rounded-lg p-3 mb-6 overflow-auto max-h-32 text-red-600 dark:text-red-400">
            {this.state.error.message}
          </pre>
          <button
            onClick={this.handleReset}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    )
  }
}
