-- ============================================================================
-- SETUP COMPLETO DO SUPABASE PARA DOCFLOW-HUB
-- Cria tabelas, índices, RLS policies e triggers
-- ============================================================================

-- ============================================================================
-- 1. TABELA: cartas_apresentacao
-- Armazena cartas de apresentação com informações de negócio
-- ============================================================================

CREATE TABLE IF NOT EXISTS cartas_apresentacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conteúdo
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  conteudo TEXT NOT NULL,

  -- Relacionamentos
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,

  -- Status e Assinatura
  status VARCHAR(50) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado', 'arquivado')),
  assinado_por VARCHAR(255),
  data_assinatura TIMESTAMPTZ,

  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID,
  atualizado_por UUID,

  -- Metadados
  dados_extras JSONB DEFAULT '{}',
  versao INT DEFAULT 1,
  ativo BOOLEAN DEFAULT TRUE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cartas_funcionario_id ON cartas_apresentacao(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_cartas_empresa_id ON cartas_apresentacao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cartas_template_id ON cartas_apresentacao(template_id);
CREATE INDEX IF NOT EXISTS idx_cartas_status ON cartas_apresentacao(status);
CREATE INDEX IF NOT EXISTS idx_cartas_criado_em ON cartas_apresentacao(criado_em);
CREATE INDEX IF NOT EXISTS idx_cartas_ativo ON cartas_apresentacao(ativo);

-- ============================================================================
-- 2. TABELA: cartas_historico
-- Mantém histórico de alterações das cartas
-- ============================================================================

CREATE TABLE IF NOT EXISTS cartas_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  carta_id UUID NOT NULL REFERENCES cartas_apresentacao(id) ON DELETE CASCADE,
  versao INT NOT NULL,

  -- Dados antigos e novos
  dados_anterior JSONB,
  dados_novo JSONB,
  tipo_alteracao VARCHAR(50), -- 'criacao', 'edicao', 'assinatura', 'arquivamento'

  -- Auditoria
  alterado_em TIMESTAMPTZ DEFAULT NOW(),
  alterado_por UUID,
  descricao TEXT,

  CONSTRAINT unique_carta_versao UNIQUE(carta_id, versao)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cartas_historico_carta ON cartas_historico(carta_id);
CREATE INDEX IF NOT EXISTS idx_cartas_historico_alterado_em ON cartas_historico(alterado_em);

-- ============================================================================
-- 3. TABELA: cartas_compartilhamento
-- Controla compartilhamento de cartas
-- ============================================================================

CREATE TABLE IF NOT EXISTS cartas_compartilhamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  carta_id UUID NOT NULL REFERENCES cartas_apresentacao(id) ON DELETE CASCADE,
  compartilhado_com VARCHAR(255) NOT NULL, -- Email do destinatário
  permissoes VARCHAR(50) DEFAULT 'visualizar' CHECK (permissoes IN ('visualizar', 'editar', 'assinar')),

  -- Rastreamento
  compartilhado_em TIMESTAMPTZ DEFAULT NOW(),
  compartilhado_por UUID,
  visualizado_em TIMESTAMPTZ,

  -- Expiração
  data_expiracao TIMESTAMPTZ,
  ativo BOOLEAN DEFAULT TRUE,

  CONSTRAINT unique_share UNIQUE(carta_id, compartilhado_com)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_compartilhamento_carta ON cartas_compartilhamento(carta_id);
CREATE INDEX IF NOT EXISTS idx_compartilhamento_email ON cartas_compartilhamento(compartilhado_com);
CREATE INDEX IF NOT EXISTS idx_compartilhamento_ativo ON cartas_compartilhamento(ativo);

-- ============================================================================
-- 4. TRIGGERS PARA AUDITORIA AUTOMÁTICA
-- ============================================================================

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para cartas_apresentacao
CREATE TRIGGER trigger_cartas_timestamp
BEFORE UPDATE ON cartas_apresentacao
FOR EACH ROW
EXECUTE FUNCTION atualizar_timestamp();

-- Função para registrar histórico
CREATE OR REPLACE FUNCTION registrar_historico_carta()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO cartas_historico (
      carta_id, versao, dados_novo, tipo_alteracao, alterado_por
    ) VALUES (
      NEW.id, 1, row_to_json(NEW), 'criacao', NEW.criado_por
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO cartas_historico (
      carta_id, versao, dados_anterior, dados_novo, tipo_alteracao, alterado_por
    ) VALUES (
      NEW.id,
      NEW.versao,
      row_to_json(OLD),
      row_to_json(NEW),
      CASE
        WHEN NEW.data_assinatura IS NOT NULL AND OLD.data_assinatura IS NULL THEN 'assinatura'
        WHEN NEW.status = 'arquivado' AND OLD.status != 'arquivado' THEN 'arquivamento'
        ELSE 'edicao'
      END,
      NEW.atualizado_por
    );
    -- Incrementa versão
    NEW.versao = NEW.versao + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para histórico
CREATE TRIGGER trigger_cartas_historico
BEFORE INSERT OR UPDATE ON cartas_apresentacao
FOR EACH ROW
EXECUTE FUNCTION registrar_historico_carta();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Habilitar RLS
ALTER TABLE cartas_apresentacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartas_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartas_compartilhamento ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver suas próprias cartas
CREATE POLICY "Usuários veem próprias cartas" ON cartas_apresentacao
FOR SELECT USING (auth.uid() = criado_por OR auth.uid() = atualizado_por);

-- Policy: Usuários podem criar cartas
CREATE POLICY "Usuários criam cartas" ON cartas_apresentacao
FOR INSERT WITH CHECK (auth.uid() = criado_por);

-- Policy: Usuários podem editar suas próprias cartas
CREATE POLICY "Usuários editam próprias cartas" ON cartas_apresentacao
FOR UPDATE USING (auth.uid() = atualizado_por OR auth.uid() = criado_por);

-- Policy: Usuários podem deletar suas próprias cartas
CREATE POLICY "Usuários deletam próprias cartas" ON cartas_apresentacao
FOR DELETE USING (auth.uid() = criado_por);

-- Policy para compartilhamento
CREATE POLICY "Ver cartas compartilhadas" ON cartas_apresentacao
FOR SELECT USING (
  id IN (
    SELECT carta_id FROM cartas_compartilhamento
    WHERE compartilhado_com = auth.jwt()->'email'::text AND ativo = TRUE
  )
);

-- Policy para histórico
CREATE POLICY "Ver histórico próprio" ON cartas_historico
FOR SELECT USING (
  carta_id IN (SELECT id FROM cartas_apresentacao WHERE criado_por = auth.uid())
);

-- ============================================================================
-- 6. VIEWS ÚTEIS
-- ============================================================================

-- View: Cartas com informações completas
CREATE OR REPLACE VIEW v_cartas_completas AS
SELECT
  c.id,
  c.titulo,
  c.descricao,
  c.status,
  c.criado_em,
  c.atualizado_em,
  c.assinado_por,
  c.data_assinatura,
  f.nome as funcionario_nome,
  e.nome as empresa_nome,
  t.nome as template_nome,
  COUNT(ch.id) as total_alteracoes
FROM cartas_apresentacao c
LEFT JOIN funcionarios f ON c.funcionario_id = f.id
LEFT JOIN empresas e ON c.empresa_id = e.id
LEFT JOIN templates t ON c.template_id = t.id
LEFT JOIN cartas_historico ch ON c.id = ch.carta_id
GROUP BY c.id, f.nome, e.nome, t.nome;

-- View: Cartas por status
CREATE OR REPLACE VIEW v_cartas_por_status AS
SELECT
  status,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE criado_em >= NOW() - INTERVAL '7 days') as ultimos_7_dias,
  COUNT(*) FILTER (WHERE criado_em >= NOW() - INTERVAL '30 days') as ultimos_30_dias
FROM cartas_apresentacao
WHERE ativo = TRUE
GROUP BY status;

-- ============================================================================
-- 7. FUNÇÕES ÚTEIS
-- ============================================================================

-- Função para obter cartas recentes
CREATE OR REPLACE FUNCTION obter_cartas_recentes(limite INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  titulo VARCHAR(255),
  status VARCHAR(50),
  criado_em TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.titulo, c.status, c.criado_em
  FROM cartas_apresentacao c
  WHERE c.ativo = TRUE AND c.criado_por = auth.uid()
  ORDER BY c.criado_em DESC
  LIMIT limite;
END;
$$ LANGUAGE plpgsql;

-- Função para arquivar carta
CREATE OR REPLACE FUNCTION arquivar_carta(carta_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE cartas_apresentacao
  SET status = 'arquivado', atualizado_em = NOW()
  WHERE id = carta_id AND criado_por = auth.uid();
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. NOTAS FINAIS
-- ============================================================================
/*
  - Todas as tabelas têm criado_em e atualizado_em para auditoria
  - RLS está habilitado e configurado para segurança
  - Índices foram criados para melhorar performance
  - Triggers mantêm histórico automaticamente
  - Views permitem consultas agregadas facilmente

  PRÓXIMOS PASSOS:
  1. Configurar Supabase Auth
  2. Adicionar políticas de RLS customizadas conforme necessário
  3. Configurar backups automáticos
  4. Adicionar logging de acesso
*/
