import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import {
  filtrarPromotores, opcoesDeFiltro, motivoParaPular, nomesUnicos, montarZip, juntarPdfs,
} from './cartasEmLote';

const funcs = [
  { id: 1, nome: 'Bruno', empresa_id: 'e1', dados_extras: { Empresa: 'Colgate', 'NC FUNCIONARIO': '10' } },
  { id: 2, nome: 'Ana', empresa_id: 'e1', dados_extras: { Empresa: 'COLGATE', 'NC FUNCIONARIO': '2', CPF: '123' } },
  { id: 3, nome: 'Carla', empresa_id: 'e2', dados_extras: { Empresa: 'M Dias Branco' } },
];

describe('filtros', () => {
  it('filtra por conta (sem diferença de maiúscula) e ordena por nome', () => {
    expect(filtrarPromotores(funcs, { conta: 'colgate' }).map((f) => f.id)).toEqual([2, 1]);
  });
  it('filtra por CDC, empresa e busca; sem filtro traz todos', () => {
    expect(filtrarPromotores(funcs, { cdc: '10' }).map((f) => f.id)).toEqual([1]);
    expect(filtrarPromotores(funcs, { empresaId: 'e2' }).map((f) => f.id)).toEqual([3]);
    expect(filtrarPromotores(funcs, { busca: '123' }).map((f) => f.id)).toEqual([2]);
    expect(filtrarPromotores(funcs)).toHaveLength(3);
  });
  it('lista contas e CDCs distintos', () => {
    expect(opcoesDeFiltro(funcs)).toEqual({ contas: ['COLGATE', 'M DIAS BRANCO'], cdcs: ['2', '10'] });
  });
});

describe('motivoParaPular', () => {
  const ok = { temCargo: true, precisaLoja: true, loja: 'X' };
  it('aponta o que falta', () => {
    expect(motivoParaPular({ empresa_id: null }, ok)).toBe('sem empresa vinculada');
    expect(motivoParaPular({ empresa_id: 1 }, { ...ok, temCargo: false })).toBe('sem cargo');
    expect(motivoParaPular({ empresa_id: 1 }, { ...ok, loja: '' })).toBe('sem loja');
  });
  it('loja do cadastro vale', () => {
    expect(motivoParaPular({ empresa_id: 1, dados_extras: { Lojas: 'ASSAI' } }, { ...ok, loja: '' })).toBeNull();
    expect(motivoParaPular({ empresa_id: 1 }, { ...ok, precisaLoja: false, loja: '' })).toBeNull();
  });
});

describe('arquivos', () => {
  it('nomes sem repetir e sem caracteres proibidos', () => {
    expect(nomesUnicos(['CARTA ANA', 'carta ana.pdf', 'A/B'])).toEqual(['CARTA ANA.pdf', 'carta ana (2).pdf', 'A-B.pdf']);
  });

  const pdf = async (paginas) => {
    const d = await PDFDocument.create();
    for (let i = 0; i < paginas; i++) d.addPage();
    return new Blob([await d.save()], { type: 'application/pdf' });
  };

  it('monta o zip com todas as cartas', async () => {
    const zip = await montarZip([{ nome: 'CARTA A', blob: await pdf(1) }, { nome: 'CARTA A', blob: await pdf(1) }]);
    const dentro = unzipSync(new Uint8Array(await zip.arrayBuffer()));
    expect(Object.keys(dentro)).toEqual(['CARTA A.pdf', 'CARTA A (2).pdf']);
  });

  it('junta os PDFs em um só', async () => {
    const unico = await juntarPdfs([{ blob: await pdf(1) }, { blob: await pdf(2) }]);
    const doc = await PDFDocument.load(await unico.arrayBuffer());
    expect(doc.getPageCount()).toBe(3);
  });
});
