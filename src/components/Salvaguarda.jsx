import { Component } from 'react';
import { AlertTriangle, RotateCcw, Copy } from 'lucide-react';
import { Wordmark } from './ui';

/**
 * Rede de proteção contra tela branca.
 *
 * Sem isto, qualquer erro de render derruba a página inteira e a pessoa fica
 * olhando para o nada — sem saber se travou, se perdeu o trabalho, ou o que
 * dizer para quem vai arrumar. Num sistema que emite documento oficial isso
 * não pode acontecer.
 *
 * Precisa ser classe: só componente de classe captura erro de render em React.
 */
export default class Salvaguarda extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null, copiado: false };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    // Enquanto não houver serviço de telemetria, o console é o que temos —
    // e com o texto copiável abaixo a pessoa consegue mandar o detalhe.
    console.error('Erro na tela:', erro, info?.componentStack);
    this.props.aoFalhar?.(erro, info);
  }

  detalhe() {
    const { erro } = this.state;
    return [
      `Tela: ${window.location.pathname}`,
      `Quando: ${new Date().toLocaleString('pt-BR')}`,
      `Erro: ${erro?.message || erro}`,
      erro?.stack ? `\n${erro.stack}` : '',
    ].join('\n');
  }

  copiar = async () => {
    try {
      await navigator.clipboard.writeText(this.detalhe());
      this.setState({ copiado: true });
      setTimeout(() => this.setState({ copiado: false }), 2000);
    } catch {
      // Sem permissão de área de transferência: o texto segue visível na tela.
    }
  };

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-4 py-10">
        <div className="w-full max-w-md">
          <Wordmark className="mb-8 block text-center text-lg tracking-[0.28em] text-brand-900" />

          <div className="panel p-6 shadow-lg sm:p-8">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal-50 text-signal-700">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-ink">Essa tela travou.</h1>
                <p className="mt-1 text-sm text-slate-600">
                  O problema é nosso, não seu. Nada do que já foi salvo se perdeu.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-800 text-sm font-medium text-white hover:bg-brand-900"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Tentar de novo
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="flex h-10 w-full items-center justify-center rounded-lg border border-line text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-ink"
              >
                Voltar para o início
              </button>
            </div>

            <details className="mt-5">
              <summary className="cursor-pointer text-sm text-slate-500 hover:text-ink">
                Detalhes para quem for arrumar
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                {this.detalhe()}
              </pre>
              <button
                onClick={this.copiar}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {this.state.copiado ? 'Copiado' : 'Copiar detalhes'}
              </button>
            </details>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Se continuar travando, mande os detalhes para o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }
}
