import { useRef, useState } from 'react';
import { readSheet } from 'read-excel-file/browser';
import { X, Upload, FileSpreadsheet, Camera, Loader2, Building2, Tag, Hash, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { invalidar } from '../lib/dados';
import {
  lerCsv, planilhaParaCadastros, montarCadastro, marcarSituacao, aplicarAssociacao,
} from '../lib/importarFuncionarios';

const SITUACAO = {
  novo: { rotulo: 'Novo', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  existente: { rotulo: 'Já cadastrado', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  repetido: { rotulo: 'Repetido no arquivo', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
};

/** Reduz a foto antes de enviar (fotos de celular passam fácil de 5 MB). */
async function fotoParaBase64(arquivo) {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error('Não consegui abrir a imagem.'));
      i.src = url;
    });
    const max = 2200;
    const escala = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
  } finally {
    URL.revokeObjectURL(url);
  }
}

const arquivoParaBase64 = (arquivo) =>
  new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1]);
    r.onerror = () => falha(new Error('Não consegui ler o arquivo.'));
    r.readAsDataURL(arquivo);
  });

async function erroDaFuncao(error) {
  try {
    const corpo = await error?.context?.json?.();
    if (corpo?.erro) return corpo.erro;
  } catch { /* sem corpo */ }
  return 'Não consegui ler a imagem agora. Tente de novo.';
}

export default function ImportarFuncionarios({ empresas, funcionarios, onFechar, onConcluir }) {
  const inputPlanilha = useRef(null);
  const inputFoto = useRef(null);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [linhas, setLinhas] = useState(null); // [{...cadastro, incluir}]
  const [aviso, setAviso] = useState('');
  const [origem, setOrigem] = useState('');
  const [assoc, setAssoc] = useState({ empresaId: '', conta: '', cdc: '' });

  const preparar = (cadastros, nomeOrigem, avisoExtra = '') => {
    const marcados = marcarSituacao(cadastros, funcionarios).map((c) => ({ ...c, incluir: c.situacao === 'novo' }));
    const semColigada = [...new Set(marcados.map((c) => c.coligadaNaoEncontrada).filter(Boolean))];
    const avisos = [avisoExtra];
    if (semColigada.length) avisos.push(`Coligada não encontrada no cadastro: ${semColigada.join(', ')}. Escolha a empresa abaixo.`);
    setLinhas(marcados);
    setOrigem(nomeOrigem);
    setAviso(avisos.filter(Boolean).join(' '));
  };

  const abrirPlanilha = async (arquivo) => {
    if (!arquivo) return;
    setLendo(true);
    try {
      const nome = arquivo.name.toLowerCase();
      let matriz;
      if (nome.endsWith('.xlsx')) matriz = await readSheet(arquivo);
      else if (nome.endsWith('.csv') || nome.endsWith('.txt')) matriz = lerCsv(await arquivo.text());
      else if (nome.endsWith('.xls')) throw new Error('Arquivo .xls antigo: abra no Excel e salve como .xlsx ou .csv.');
      else throw new Error('Formato não suportado. Use .xlsx ou .csv.');
      const { cadastros, erro } = planilhaParaCadastros(matriz, empresas);
      if (erro) throw new Error(erro);
      preparar(cadastros, arquivo.name);
    } catch (e) {
      toast.error(e.message || 'Não consegui ler a planilha.');
    } finally {
      setLendo(false);
      if (inputPlanilha.current) inputPlanilha.current.value = '';
    }
  };

  const abrirFoto = async (arquivo) => {
    if (!arquivo) return;
    setLendo(true);
    try {
      const pdf = arquivo.type === 'application/pdf';
      if (pdf && arquivo.size > 5 * 1024 * 1024) throw new Error('PDF grande demais (máx. 5 MB).');
      const base64 = pdf ? await arquivoParaBase64(arquivo) : await fotoParaBase64(arquivo);
      const { data, error } = await supabase.functions.invoke('extrair-funcionarios', {
        body: { arquivo: base64, tipo: pdf ? 'application/pdf' : 'image/jpeg' },
      });
      if (error) throw new Error(await erroDaFuncao(error));
      const cadastros = (data?.linhas || []).map((l) => montarCadastro(l, empresas)).filter((c) => c.nome);
      if (!cadastros.length) throw new Error(data?.aviso || 'Não encontrei funcionários na imagem.');
      preparar(cadastros, arquivo.name || 'foto', [data?.aviso, 'Leitura feita por IA: confira nomes e CPFs antes de cadastrar.'].filter(Boolean).join(' '));
    } catch (e) {
      toast.error(e.message || 'Não consegui ler a imagem.');
    } finally {
      setLendo(false);
      if (inputFoto.current) inputFoto.current.value = '';
    }
  };

  const mudar = (i, campo, valor) =>
    setLinhas((ls) => ls.map((l, j) => {
      if (j !== i) return l;
      if (campo === 'nome' || campo === 'cargo' || campo === 'empresa_id' || campo === 'incluir') return { ...l, [campo]: valor };
      return { ...l, dados_extras: { ...l.dados_extras, [campo]: valor } };
    }));

  const remover = (i) => setLinhas((ls) => ls.filter((_, j) => j !== i));

  const aplicarATodos = () => {
    if (!assoc.empresaId && !assoc.conta.trim() && !assoc.cdc.trim()) {
      toast.error('Escolha a empresa, a conta ou o CDC para aplicar.');
      return;
    }
    setLinhas((ls) => ls.map((l) => (l.incluir ? aplicarAssociacao(l, assoc) : l)));
    toast.success('Associação aplicada às linhas marcadas.');
  };

  const marcados = (linhas || []).filter((l) => l.incluir);
  const novos = marcados.filter((l) => l.situacao !== 'existente');
  const atualizar = marcados.filter((l) => l.situacao === 'existente' && l.existenteId);

  const gravar = async () => {
    if (!marcados.length) return;
    if (marcados.some((l) => !String(l.nome || '').trim())) {
      toast.error('Tem linha marcada sem nome.');
      return;
    }
    setSalvando(true);
    const ids = [];
    try {
      const limpar = (l) => ({
        nome: String(l.nome).toUpperCase().trim(),
        cargo: l.cargo || '',
        empresa_id: l.empresa_id || null,
        dados_extras: Object.fromEntries(Object.entries(l.dados_extras || {}).filter(([, v]) => String(v ?? '').trim())),
      });
      for (let i = 0; i < novos.length; i += 200) {
        const { data, error } = await supabase.from('funcionarios').insert(novos.slice(i, i + 200).map(limpar)).select('id');
        if (error) throw error;
        ids.push(...data.map((d) => d.id));
      }
      for (const l of atualizar) {
        const atual = funcionarios.find((f) => f.id === l.existenteId);
        const novo = limpar(l);
        const { error } = await supabase.from('funcionarios').update({
          nome: novo.nome,
          cargo: novo.cargo || atual?.cargo || '',
          empresa_id: novo.empresa_id || atual?.empresa_id || null,
          dados_extras: { ...(atual?.dados_extras || {}), ...novo.dados_extras },
        }).eq('id', l.existenteId);
        if (error) throw error;
        ids.push(l.existenteId);
      }
      invalidar('funcionarios');
      toast.success(`${novos.length} cadastrado(s)${atualizar.length ? `, ${atualizar.length} atualizado(s)` : ''}.`);
      onConcluir(ids);
    } catch (e) {
      console.error(e);
      toast.error(`Erro ao gravar${ids.length ? ` (${ids.length} já gravados)` : ''}. Tente de novo.`);
      if (ids.length) onConcluir(ids);
    } finally {
      setSalvando(false);
    }
  };

  const campo = 'w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" />
            Importar funcionários em massa
            {origem && <span className="text-xs font-normal text-slate-400">· {origem}</span>}
          </h3>
          <button onClick={onFechar} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <input ref={inputPlanilha} type="file" accept=".xlsx,.csv,.txt,.xls" className="hidden" onChange={(e) => abrirPlanilha(e.target.files?.[0])} />
        <input ref={inputFoto} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => abrirFoto(e.target.files?.[0])} />

        {!linhas ? (
          <div className="p-6 sm:p-8 overflow-y-auto">
            {lendo ? (
              <div className="py-16 flex flex-col items-center gap-3 text-sm text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                Lendo o arquivo... (foto pode levar até 1 minuto)
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <button onClick={() => inputPlanilha.current?.click()}
                    className="flex flex-col items-center gap-3 p-8 rounded-lg border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all">
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-800">Planilha</span>
                    <span className="text-xs text-slate-500 text-center">Excel (.xlsx) ou CSV. A primeira linha com &quot;Nome&quot; vira o cabeçalho.</span>
                  </button>
                  <button onClick={() => inputFoto.current?.click()}
                    className="flex flex-col items-center gap-3 p-8 rounded-lg border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all">
                    <Camera className="w-10 h-10 text-indigo-600" />
                    <span className="text-sm font-semibold text-slate-800">Foto ou PDF</span>
                    <span className="text-xs text-slate-500 text-center">Foto da lista, print ou PDF. A IA lê os dados e você confere antes de salvar.</span>
                  </button>
                </div>
                <div className="mt-6 rounded-lg bg-slate-50 border border-slate-100 p-4 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-700">Colunas reconhecidas na planilha</p>
                  <p><b>Nome</b> (obrigatório), CPF, RG, Cargo/Função, CTPS, Série, Matrícula, <b>CDC</b>, <b>Conta/Cliente/Projeto</b> e Coligada (nome da empresa vinculada).</p>
                  <p>Qualquer outra coluna (telefone, cidade, loja...) é guardada como campo personalizado.</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50/30 shrink-0 space-y-3">
              {aviso && (
                <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {aviso}
                </p>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Associar as linhas marcadas a um projeto (campos em branco não mudam nada)</p>
                <div className="flex flex-col md:flex-row gap-2">
                  <label className="flex-1 flex items-center gap-2 bg-white rounded-md border border-slate-200 px-2">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <select value={assoc.empresaId} onChange={(e) => setAssoc((a) => ({ ...a, empresaId: e.target.value }))}
                      className="w-full py-1.5 text-xs border-0 focus:ring-0 bg-transparent">
                      <option value="">Empresa vinculada...</option>
                      {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  </label>
                  <label className="flex-1 flex items-center gap-2 bg-white rounded-md border border-slate-200 px-2">
                    <Tag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <input value={assoc.conta} onChange={(e) => setAssoc((a) => ({ ...a, conta: e.target.value }))}
                      placeholder="Conta / Cliente (ex: COLGATE)" className="w-full py-1.5 text-xs border-0 focus:ring-0 uppercase" />
                  </label>
                  <label className="flex-1 flex items-center gap-2 bg-white rounded-md border border-slate-200 px-2">
                    <Hash className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <input value={assoc.cdc} onChange={(e) => setAssoc((a) => ({ ...a, cdc: e.target.value }))}
                      placeholder="CDC (ex: 10045)" className="w-full py-1.5 text-xs border-0 focus:ring-0 uppercase" />
                  </label>
                  <button onClick={aplicarATodos}
                    className="px-4 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-md shrink-0">
                    Aplicar às marcadas
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-500 z-10">
                  <tr className="text-left">
                    <th className="p-2 w-8">
                      <input type="checkbox" aria-label="Marcar todas"
                        checked={linhas.length > 0 && linhas.every((l) => l.incluir)}
                        onChange={(e) => setLinhas((ls) => ls.map((l) => ({ ...l, incluir: e.target.checked && l.situacao !== 'repetido' })))} />
                    </th>
                    <th className="p-2 min-w-[180px]">Nome</th>
                    <th className="p-2 min-w-[120px]">CPF</th>
                    <th className="p-2 min-w-[110px]">Cargo</th>
                    <th className="p-2 min-w-[140px]">Empresa</th>
                    <th className="p-2 min-w-[110px]">Conta</th>
                    <th className="p-2 min-w-[80px]">CDC</th>
                    <th className="p-2">Situação</th>
                    <th className="p-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {linhas.map((l, i) => (
                    <tr key={i} className={l.incluir ? '' : 'opacity-50'}>
                      <td className="p-2"><input type="checkbox" checked={l.incluir} onChange={(e) => mudar(i, 'incluir', e.target.checked)} aria-label={`Incluir ${l.nome}`} /></td>
                      <td className="p-1"><input className={campo} value={l.nome} onChange={(e) => mudar(i, 'nome', e.target.value)} /></td>
                      <td className="p-1"><input className={campo} value={l.dados_extras.CPF || ''} onChange={(e) => mudar(i, 'CPF', e.target.value)} /></td>
                      <td className="p-1"><input className={campo} value={l.cargo || ''} onChange={(e) => mudar(i, 'cargo', e.target.value)} /></td>
                      <td className="p-1">
                        <select className={`${campo} bg-white`} value={l.empresa_id || ''} onChange={(e) => mudar(i, 'empresa_id', e.target.value)}>
                          <option value="">—</option>
                          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                        </select>
                      </td>
                      <td className="p-1"><input className={`${campo} uppercase`} value={l.dados_extras.Empresa || ''} onChange={(e) => mudar(i, 'Empresa', e.target.value)} /></td>
                      <td className="p-1"><input className={`${campo} uppercase`} value={l.dados_extras['NC FUNCIONARIO'] || ''} onChange={(e) => mudar(i, 'NC FUNCIONARIO', e.target.value)} /></td>
                      <td className="p-2">
                        <span className={`whitespace-nowrap px-2 py-0.5 rounded-md border text-[11px] font-semibold ${SITUACAO[l.situacao].cls}`}>
                          {SITUACAO[l.situacao].rotulo}
                        </span>
                      </td>
                      <td className="p-1">
                        <button onClick={() => remover(i)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md" aria-label="Remover linha">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
              <p className="text-xs text-slate-500 sm:mr-auto">
                {linhas.length} linha(s) · <b>{novos.length}</b> para cadastrar
                {atualizar.length > 0 && <> · <b>{atualizar.length}</b> já cadastrado(s) serão atualizados</>}
              </p>
              <button onClick={() => { setLinhas(null); setAviso(''); setOrigem(''); }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                Trocar arquivo
              </button>
              <button onClick={gravar} disabled={salvando || !marcados.length}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md disabled:opacity-50">
                {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Salvar {marcados.length} funcionário(s)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
