import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Ловит падение рендера вкладки Cultivo (чаще всего — битые данные в localStorage).
 */
export class CultivoErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[CultivoErrorBoundary]', error.message, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      const e = this.state.error
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-950 shadow-sm">
          <h2 className="text-lg font-semibold">Cultivo — ошибка отрисовки</h2>
          <p className="mt-2 text-sm text-red-900/90">
            Ниже текст ошибки (его можно скопировать). Частая причина — повреждённые данные в браузере.
          </p>
          <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-red-100 bg-white/90 p-3 text-xs text-gray-900">
            {e.message}
            {e.stack ? `\n\n${e.stack}` : ''}
          </pre>
          <p className="mt-4 text-sm">
            Очистка культиво-состояния: откройте консоль (F12) и выполните:
          </p>
          <code className="mt-1 block rounded-lg bg-gray-900 px-3 py-2 text-xs text-green-300">
            localStorage.removeItem(&apos;green-luck-cultivation&apos;); location.reload();
          </code>
        </div>
      )
    }
    return this.props.children
  }
}
