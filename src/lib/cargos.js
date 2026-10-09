/** Padroniza a escrita do cargo: maiúsculas, sem espaços duplicados. */
export function normalizarCargo(cargo) {
  return String(cargo || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * Cargos já cadastrados, do mais usado ao menos usado.
 * Serve de lista para escolher a função na carta ou no cadastro.
 */
export function listaDeCargos(funcionarios = []) {
  const contagem = new Map();
  for (const f of funcionarios) {
    const cargo = normalizarCargo(f?.cargo);
    if (cargo) contagem.set(cargo, (contagem.get(cargo) || 0) + 1);
  }
  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .map(([cargo, total]) => ({ cargo, total }));
}

/** Cargo que vai para a carta: o escolhido manualmente ou, no automático, o do cadastro. */
export function cargoParaCarta(cargoEscolhido, funcionario) {
  return normalizarCargo(cargoEscolhido) || normalizarCargo(funcionario?.cargo);
}
