import { useId, useMemo, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { listaDeCargos, normalizarCargo, CARGO_PADRAO } from '../lib/cargos';
import { cn } from '../lib/cn';

const OUTRA = '__outra__';

/**
 * Cargo da carta: no automático usa o cargo do cadastro de cada promotor;
 * também dá para escolher uma função da lista ou digitar outra.
 *
 * value: '' para automático, ou o cargo escolhido.
 */
export default function CargoSelect({ value, onChange, funcionarios, cargoDoCadastro, variosPromotores = false, className, tone = 'brand', semRotulo = false, id: idExterno }) {
  const idGerado = useId();
  const id = idExterno || idGerado;
  const opcoes = useMemo(() => listaDeCargos(funcionarios), [funcionarios]);
  const naLista = !value || opcoes.some((o) => o.cargo === value);
  const [digitando, setDigitando] = useState(!naLista);

  const rotuloAuto = variosPromotores
    ? 'Automático: o cargo de cada promotor'
    : cargoDoCadastro
      ? `Automático: ${normalizarCargo(cargoDoCadastro)}`
      : `Automático: ${CARGO_PADRAO}`;

  const selectValue = digitando ? OUTRA : value || '';

  return (
    <div className={cn('space-y-1.5', className)}>
      {!semRotulo && <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        Cargo na carta
        {!value && (
          <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium', tone === 'portal' ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700')}>
            <Wand2 className="h-3 w-3" aria-hidden="true" /> automático
          </span>
        )}
      </label>}
      <select
        id={id}
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OUTRA) {
            setDigitando(true);
            return;
          }
          setDigitando(false);
          onChange(v);
        }}
        className="h-10 w-full border bg-white px-3 text-sm text-ink"
      >
        <option value="">{rotuloAuto}</option>
        {opcoes.length > 0 && (
          <optgroup label="Escolher a função">
            {opcoes.map((o) => (
              <option key={o.cargo} value={o.cargo}>{o.cargo}</option>
            ))}
          </optgroup>
        )}
        <option value={OUTRA}>Outra função…</option>
      </select>
      {digitando && (
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="Digite a função, ex.: PROMOTOR(A) DE EVENTOS"
          className="h-10 w-full border bg-white px-3 text-sm text-ink"
          aria-label="Função personalizada"
        />
      )}
      <p className="text-xs text-slate-400">
        {value
          ? 'Esta função vale só para esta emissão; o cadastro do promotor não muda.'
          : `Usa o cargo do cadastro; se não tiver, usa "${CARGO_PADRAO}".`}
      </p>
    </div>
  );
}
