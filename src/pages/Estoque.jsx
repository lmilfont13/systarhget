import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Save, 
  Search, 
  Filter, 
  Image as ImageIcon, 
  Smartphone, 
  Shirt, 
  Shield, 
  Cpu, 
  Wrench, 
  Layers, 
  AlertTriangle, 
  CheckCircle,
  Briefcase,
  UserCheck
} from 'lucide-react';

const TIPOS_ITENS = ['Uniforme', 'Celular', 'EPI', 'Chip', 'Ferramenta', 'Outro'];

export default function Estoque() {
  const [activeTab, setActiveTab] = useState('itens'); // 'itens' | 'catalogo'
  const [itensEstoque, setItensEstoque] = useState([]);
  const [produtosCatalogo, setProdutosCatalogo] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modais
  const [itemModal, setItemModal] = useState({ isOpen: false, data: null });
  const [produtoModal, setProdutoModal] = useState({ isOpen: false, data: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resEstoque, resProdutos] = await Promise.all([
        supabase.from('estoque').select('*').order('created_at', { ascending: false }),
        supabase.from('produtos').select('*').order('created_at', { ascending: false })
      ]);

      if (resEstoque.error) {
        console.error('Erro ao buscar estoque:', resEstoque.error);
        toast.error('Erro ao carregar dados de estoque.');
      } else {
        setItensEstoque(resEstoque.data || []);
      }

      if (resProdutos.error) {
        console.error('Erro ao buscar produtos:', resProdutos.error);
        toast.error('Erro ao carregar catálogo de produtos.');
      } else {
        setProdutosCatalogo(resProdutos.data || []);
      }
    } catch (error) {
      console.error('Erro geral ao buscar dados do estoque:', error);
      toast.error('Erro de conexão ao carregar dados.');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload e conversão de imagem para base64
  const handleImageUpload = (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // ==========================================
  // FUNÇÕES DE GERENCIAMENTO DE ITENS (ESTOQUE)
  // ==========================================

  const openNewItem = () => {
    setItemModal({
      isOpen: true,
      data: {
        nomeNovo: '',
        tipo: 'Uniforme',
        foto: '',
        tamanho: '',
        modelo: '',
        empresa: '',
        imei: '',
        detalhes: '',
        tipoAssociacao: '',
        nomeAssociacao: ''
      }
    });
  };

  const handleSaveItem = async () => {
    const { id, nomeNovo, tipo, foto, tamanho, modelo, empresa, imei, detalhes, tipoAssociacao, nomeAssociacao } = itemModal.data;

    if (!nomeNovo.trim()) {
      toast.error('O nome do item é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nomeNovo: nomeNovo.toUpperCase().trim(),
        tipo,
        foto,
        tamanho: tamanho ? tamanho.toUpperCase().trim() : null,
        modelo: modelo ? modelo.trim() : null,
        empresa: empresa ? empresa.trim() : null,
        imei: imei ? imei.trim() : null,
        detalhes: detalhes ? detalhes.trim() : '',
        tipoAssociacao: tipoAssociacao ? tipoAssociacao.toUpperCase().trim() : null,
        nomeAssociacao: nomeAssociacao ? nomeAssociacao.toUpperCase().trim() : null
      };

      if (id) {
        // Atualizar
        const { error } = await supabase.from('estoque').update(payload).eq('id', id);
        if (error) throw error;
        toast.success('Item de estoque atualizado com sucesso!');
      } else {
        // Inserir
        const { error } = await supabase.from('estoque').insert([payload]);
        if (error) throw error;
        toast.success('Item adicionado ao estoque com sucesso!');
      }

      setItemModal({ isOpen: false, data: null });
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar item de estoque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir este item do estoque?')) return;

    try {
      const { error } = await supabase.from('estoque').delete().eq('id', id);
      if (error) throw error;
      toast.success('Item de estoque removido com sucesso.');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir item de estoque.');
    }
  };

  // ==========================================
  // FUNÇÕES DE GERENCIAMENTO DO CATÁLOGO
  // ==========================================

  const openNewProduto = () => {
    setProdutoModal({
      isOpen: true,
      data: {
        nome: '',
        tipo: 'Uniforme',
        foto: '',
        detalhes: '',
        estoque_minimo: 5
      }
    });
  };

  const handleSaveProduto = async () => {
    const { id, nome, tipo, foto, detalhes, estoque_minimo } = produtoModal.data;

    if (!nome.trim()) {
      toast.error('O nome do produto é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nome: nome.toUpperCase().trim(),
        tipo,
        foto,
        detalhes: detalhes ? detalhes.trim() : '',
        estoque_minimo: parseInt(estoque_minimo, 10) || 0
      };

      if (id) {
        // Atualizar
        const { error } = await supabase.from('produtos').update(payload).eq('id', id);
        if (error) throw error;
        toast.success('Produto atualizado com sucesso!');
      } else {
        // Inserir
        const { error } = await supabase.from('produtos').insert([payload]);
        if (error) throw error;
        toast.success('Produto adicionado ao catálogo com sucesso!');
      }

      setProdutoModal({ isOpen: false, data: null });
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduto = async (id) => {
    if (!window.confirm('Tem certeza de que deseja remover este produto do catálogo?')) return;

    try {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Produto removido com sucesso.');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir produto.');
    }
  };

  // ==========================================
  // FILTRAGEM DE DADOS
  // ==========================================

  const filteredItens = itensEstoque.filter(item => {
    const matchesSearch = 
      (item.nomeNovo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.modelo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.imei || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.nomeAssociacao || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = !typeFilter || item.tipo === typeFilter;
    return matchesSearch && matchesType;
  });

  // Agrupa os itens idênticos (mesmo nome, tamanho e modelo)
  const groupedItens = Object.values(filteredItens.reduce((acc, item) => {
    const key = `${item.nomeNovo}-${item.tamanho || ''}-${item.modelo || ''}-${item.empresa || ''}`;
    if (!acc[key]) {
      acc[key] = { ...item, quantidade: 1, itensOriginais: [item] };
    } else {
      acc[key].quantidade += 1;
      acc[key].itensOriginais.push(item);
    }
    return acc;
  }, {}));

  const filteredProdutos = produtosCatalogo.filter(prod => {
    const matchesSearch = 
      (prod.nome || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.detalhes || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || prod.tipo === typeFilter;
    return matchesSearch && matchesType;
  });

  // Retorna a contagem física de um produto no estoque
  const getProductCountInStock = (prodNome) => {
    return itensEstoque.filter(item => 
      (item.nomeNovo || '').toUpperCase() === prodNome.toUpperCase()
    ).length;
  };

  // ==========================================
  // INDICADORES DE ESTATÍSTICA
  // ==========================================

  const totalAtivos = itensEstoque.length;
  const totalCelulares = itensEstoque.filter(item => item.tipo === 'Celular').length;
  const totalUniformes = itensEstoque.filter(item => item.tipo === 'Uniforme').length;
  
  // Produtos abaixo do estoque mínimo
  const produtosAbaixoMinimo = produtosCatalogo.filter(prod => {
    const count = getProductCountInStock(prod.nome);
    return count < (prod.estoque_minimo || 0);
  }).length;

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'Celular': return <Smartphone className="w-4 h-4" />;
      case 'Uniforme': return <Shirt className="w-4 h-4" />;
      case 'EPI': return <Shield className="w-4 h-4" />;
      case 'Chip': return <Cpu className="w-4 h-4" />;
      case 'Ferramenta': return <Wrench className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Estoque</h1>
          <p className="mt-1 text-sm text-gray-500">
            Controle de fardamentos, EPIs, chips e dispositivos móveis alocados aos promotores.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'itens' ? (
            <button
              onClick={openNewItem}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Item no Estoque
            </button>
          ) : (
            <button
              onClick={openNewProduto}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Produto no Catálogo
            </button>
          )}
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total de Ativos</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalAtivos}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dispositivos Móveis</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalCelulares}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Shirt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fardamentos/Kits</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalUniformes}</p>
          </div>
        </div>

        <div className={`p-5 rounded-xl border shadow-sm flex items-center gap-4 transition-colors ${
          produtosAbaixoMinimo > 0 
            ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
            : 'bg-white border-gray-150 text-gray-900'
        }`}>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            produtosAbaixoMinimo > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Abaixo do Estoque Mín.</p>
            <p className="text-2xl font-bold mt-0.5">{produtosAbaixoMinimo}</p>
          </div>
        </div>
      </div>

      {/* Seletor de Abas */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('itens'); setTypeFilter(''); }}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'itens' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Package className="w-4 h-4" />
          Itens no Estoque ({itensEstoque.length})
        </button>
        <button
          onClick={() => { setActiveTab('catalogo'); setTypeFilter(''); }}
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'catalogo' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          Catálogo de Produtos ({produtosCatalogo.length})
        </button>
      </div>

      {/* Controles de Busca e Filtro */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border-0 py-3 pl-10 text-gray-900 ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm bg-white/80 backdrop-blur-sm shadow-sm"
            placeholder={
              activeTab === 'itens' 
                ? "Buscar por nome, modelo, IMEI ou promotor..." 
                : "Buscar produto no catálogo..."
            }
          />
        </div>

        <div className="w-full md:w-64">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Filter className="h-4 h-4 text-gray-400" />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="block w-full rounded-lg border-0 py-3 pl-9 pr-10 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm bg-white/80 backdrop-blur-sm shadow-sm"
            >
              <option value="">Todos os tipos</option>
              {TIPOS_ITENS.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Listagem */}
      {isLoading ? (
        <div className="p-12 bg-white rounded-xl border border-gray-100 flex justify-center items-center gap-3 text-indigo-600 shadow-sm">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Carregando dados do estoque...</span>
        </div>
      ) : activeTab === 'itens' ? (
        // ABA: ITENS NO ESTOQUE
        filteredItens.length === 0 ? (
          <div className="p-16 bg-white rounded-xl border border-gray-100 text-center text-sm text-gray-500 flex flex-col items-center justify-center gap-3 shadow-sm">
            <Package className="w-12 h-12 text-gray-300 stroke-[1.5]" />
            <div>
              <p className="font-semibold text-gray-700 text-base">Nenhum item de estoque encontrado</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery || typeFilter 
                  ? 'Ajuste os filtros de busca para encontrar o item.' 
                  : 'Cadastre seu primeiro item utilizando o botão "Novo Item no Estoque".'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedItens.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
                {/* Imagem do Item */}
                <div className="h-44 bg-gray-50 relative flex items-center justify-center overflow-hidden border-b border-gray-100">
                  {item.foto ? (
                    <img src={item.foto} alt={item.nomeNovo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-300 flex flex-col items-center justify-center gap-2">
                      <ImageIcon className="w-12 h-12 stroke-[1.2]" />
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-450">Sem Imagem</span>
                    </div>
                  )}
                  {/* Badge de Tipo */}
                  <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-gray-750 text-[10px] font-extrabold px-2.5 py-1 rounded-md shadow-sm border border-gray-200/80 flex items-center gap-1.5 uppercase tracking-wider">
                    {getTipoIcon(item.tipo)}
                    {item.tipo}
                  </span>

                  {/* Badge de Quantidade */}
                  <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[11px] font-extrabold px-3 py-1 rounded-md shadow-sm flex items-center gap-1.5 tracking-wider">
                    {item.quantidade} UN
                  </span>

                  {/* Badge de Associação */}
                  {item.nomeAssociacao && (
                    <span className="absolute bottom-3 left-3 bg-indigo-600 text-white text-[9px] font-extrabold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1 uppercase tracking-wider">
                      <UserCheck className="w-3 h-3" />
                      {item.nomeAssociacao}
                    </span>
                  )}
                </div>

                {/* Conteúdo do Card */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-sm font-bold text-gray-900 tracking-tight leading-snug line-clamp-2 uppercase">
                        {item.nomeNovo}
                      </h3>
                      {item.tamanho && (
                        <span className="text-[10px] font-extrabold bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                          TAM: {item.tamanho}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-500">
                      {item.modelo && (
                        <p className="flex justify-between">
                          <span className="text-gray-400">Modelo:</span> 
                          <span className="font-semibold text-gray-800">{item.modelo}</span>
                        </p>
                      )}
                      {item.imei && (
                        <p className="flex justify-between">
                          <span className="text-gray-400">IMEI:</span> 
                          <span className="font-semibold font-mono text-indigo-650 bg-indigo-50/50 px-1.5 py-0.5 rounded text-[10px]">{item.imei}</span>
                        </p>
                      )}
                      {item.empresa && (
                        <p className="flex justify-between">
                          <span className="text-gray-400">Empresa:</span> 
                          <span className="font-medium text-gray-700">{item.empresa}</span>
                        </p>
                      )}
                      {item.tipoAssociacao && (
                        <p className="flex justify-between">
                          <span className="text-gray-400">Associação:</span> 
                          <span className="font-semibold text-gray-800">{item.tipoAssociacao}</span>
                        </p>
                      )}
                      {item.detalhes && (
                        <div className="pt-1.5 border-t border-gray-100">
                          <p className="text-[11px] text-gray-400 leading-relaxed italic line-clamp-2">
                            "{item.detalhes}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setItemModal({ isOpen: true, data: item })}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="inline-flex items-center justify-center p-2 text-red-600 bg-white border border-red-100 rounded-lg hover:bg-red-50 transition-all shadow-sm"
                      title="Excluir item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // ABA: CATÁLOGO DE PRODUTOS
        filteredProdutos.length === 0 ? (
          <div className="p-16 bg-white rounded-xl border border-gray-100 text-center text-sm text-gray-500 flex flex-col items-center justify-center gap-3 shadow-sm">
            <Layers className="w-12 h-12 text-gray-300 stroke-[1.5]" />
            <div>
              <p className="font-semibold text-gray-700 text-base">Nenhum produto cadastrado no catálogo</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery || typeFilter 
                  ? 'Ajuste os filtros de busca para encontrar o produto.' 
                  : 'Cadastre seu primeiro produto utilizando o botão "Novo Produto no Catálogo".'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProdutos.map((prod) => {
              const currentStock = getProductCountInStock(prod.nome);
              const isBelowMin = currentStock < (prod.estoque_minimo || 0);

              return (
                <div key={prod.id} className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
                  {/* Imagem do Produto */}
                  <div className="h-44 bg-gray-50 relative flex items-center justify-center overflow-hidden border-b border-gray-100">
                    {prod.foto ? (
                      <img src={prod.foto} alt={prod.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-gray-300 flex flex-col items-center justify-center gap-2">
                        <ImageIcon className="w-12 h-12 stroke-[1.2]" />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-450">Sem Imagem</span>
                      </div>
                    )}
                    
                    {/* Badge de Tipo */}
                    <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-gray-750 text-[10px] font-extrabold px-2.5 py-1 rounded-md shadow-sm border border-gray-200/80 flex items-center gap-1.5 uppercase tracking-wider">
                      {getTipoIcon(prod.tipo)}
                      {prod.tipo}
                    </span>

                    {/* Badge de Alerta Mínimo */}
                    {isBelowMin && (
                      <span className="absolute top-3 right-3 bg-amber-500 text-white text-[9px] font-extrabold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1 uppercase tracking-wider border border-amber-600/10">
                        <AlertTriangle className="w-3 h-3" />
                        Crítico
                      </span>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-gray-900 tracking-tight leading-snug line-clamp-2 uppercase">
                        {prod.nome}
                      </h3>
                      
                      {prod.detalhes && (
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {prod.detalhes}
                        </p>
                      )}

                      {/* Quantidades */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                        <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-150">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Em Estoque</p>
                          <p className={`text-lg font-extrabold mt-0.5 ${
                            isBelowMin ? 'text-amber-600' : 'text-gray-800'
                          }`}>
                            {currentStock} un
                          </p>
                        </div>
                        <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-150">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mín. Exigido</p>
                          <p className="text-lg font-extrabold text-gray-800 mt-0.5">
                            {prod.estoque_minimo || 0} un
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => setProdutoModal({ isOpen: true, data: prod })}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteProduto(prod.id)}
                        className="inline-flex items-center justify-center p-2 text-red-600 bg-white border border-red-100 rounded-lg hover:bg-red-50 transition-all shadow-sm"
                        title="Excluir produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ==========================================
          MODAL: ADICIONAR / EDITAR ITEM DE ESTOQUE
          ========================================== */}
      {itemModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Cabeçalho */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                {itemModal.data.id ? 'Editar Item de Estoque' : 'Novo Item no Estoque'}
              </h3>
              <button
                onClick={() => setItemModal({ isOpen: false, data: null })}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo Formulário */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Preview e Upload de Imagem */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-150">
                <div className="w-24 h-24 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {itemModal.data.foto ? (
                    <img src={itemModal.data.foto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div className="space-y-1.5 text-center sm:text-left flex-1">
                  <p className="text-xs font-semibold text-gray-700">Foto do Item</p>
                  <p className="text-[10px] text-gray-450">Formatos JPG, PNG até 2MB</p>
                  <label className="inline-flex items-center justify-center px-3 py-1.5 bg-white border border-gray-250 hover:bg-gray-50 text-xs font-bold text-gray-750 rounded-lg cursor-pointer transition-all shadow-sm">
                    Selecionar Imagem
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleImageUpload(e, (base64) => setItemModal(p => ({ ...p, data: { ...p.data, foto: base64 } })))}
                      className="hidden"
                    />
                  </label>
                  {itemModal.data.foto && (
                    <button
                      type="button"
                      onClick={() => setItemModal(p => ({ ...p, data: { ...p.data, foto: '' } }))}
                      className="ml-2 text-[10px] text-red-650 hover:underline font-bold"
                    >
                      Remover foto
                    </button>
                  )}
                </div>
              </div>

              {/* Informações Básicas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Nome do Item <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={itemModal.data.nomeNovo}
                    onChange={e => setItemModal(p => ({ ...p, data: { ...p.data, nomeNovo: e.target.value } }))}
                    className="mt-1.5 block w-full rounded-lg border-gray-200 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm bg-white"
                    placeholder="Ex: CAMISA POLO FEMININA BLACK&DECKER"
                  />
                  {/* Sugestão de Produtos do Catálogo */}
                  {produtosCatalogo.length > 0 && !itemModal.data.id && (
                    <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Usar do Catálogo:</span>
                      {produtosCatalogo.slice(0, 3).map(prod => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => setItemModal(p => ({ 
                            ...p, 
                            data: { 
                              ...p.data, 
                              nomeNovo: prod.nome, 
                              tipo: prod.tipo,
                              foto: prod.foto || p.data.foto
                            } 
                          }))}
                          className="text-[9px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-1.5 py-0.5 rounded font-semibold transition-all border border-indigo-150"
                        >
                          {prod.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Tipo do Item
                  </label>
                  <select
                    value={itemModal.data.tipo}
                    onChange={e => setItemModal(p => ({ ...p, data: { ...p.data, tipo: e.target.value } }))}
                    className="mt-1.5 block w-full rounded-lg border-gray-200 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm bg-white"
                  >
                    {TIPOS_ITENS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Tamanho (se aplicável)
                  </label>
                  <input
                    type="text"
                    value={itemModal.data.tamanho || ''}
                    onChange={e => setItemModal(p => ({ ...p, data: { ...p.data, tamanho: e.target.value } }))}
                    className="mt-1.5 block w-full rounded-lg border-gray-200 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm bg-white"
                    placeholder="Ex: M, GG, 40"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={itemModal.data.modelo || ''}
                    onChange={e => setItemModal(p => ({ ...p, data: { ...p.data, modelo: e.target.value } }))}
                    className="mt-1.5 block w-full rounded-lg border-gray-200 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm bg-white"
                    placeholder="Ex: G54 5G, Baby Look"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Empresa / Marca
                  </label>
                  <input
                    type="text"
                    value={itemModal.data.empresa || ''}
                    onChange={e => setItemModal(p => ({ ...p, data: { ...p.data, empresa: e.target.value } }))}
                    className="mt-1.5 block w-full rounded-lg border-gray-200 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm bg-white"
                    placeholder="Ex: Motorola, Colgate"
                  />
                </div>

                {(itemModal.data.tipo === 'Celular' || itemModal.data.tipo === 'Chip') && (
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      IMEI / Nº de Série / Linha
                    </label>
                    <input
                      type="text"
                      value={itemModal.data.imei || ''}
                      onChange={e => setItemModal(p => ({ ...p, data: { ...p.data, imei: e.target.value } }))}
                      className="mt-1.5 block w-full rounded-lg border-gray-200 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm bg-white font-mono"
                      placeholder="Ex: 358921102938123 ou (11) 99999-9999"
                    />
                  </div>
                )}
              </div>

              {/* Seção de Alocação / Associação */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-650" />
                  Alocação / Associação
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-indigo-50/20 p-4 rounded-xl border border-indigo-100/50">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-750 uppercase tracking-wider">
                      Tipo de Associação
                    </label>
                    <input
                      type="text"
                      value={itemModal.data.tipoAssociacao || ''}
                      onChange={e => setItemModal(p => ({ ...p, data: { ...p.data, tipoAssociacao: e.target.value } }))}
                      className="mt-1.5 block w-full rounded-lg border-indigo-200/60 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm bg-white"
                      placeholder="Ex: PROMOTOR, FILIAL, PARCEIRO"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-750 uppercase tracking-wider">
                      Nome do Associado / Destino
                    </label>
                    <input
                      type="text"
                      value={itemModal.data.nomeAssociacao || ''}
                      onChange={e => setItemModal(p => ({ ...p, data: { ...p.data, nomeAssociacao: e.target.value } }))}
                      className="mt-1.5 block w-full rounded-lg border-indigo-200/60 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm bg-white"
                      placeholder="Ex: GUSTAVO HENRIQUE, TARHGET SP"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Detalhes / Observações adicionais
                </label>
                <textarea
                  rows={2}
                  value={itemModal.data.detalhes || ''}
                  onChange={e => setItemModal(p => ({ ...p, data: { ...p.data, detalhes: e.target.value } }))}
                  className="mt-1.5 block w-full rounded-lg border-gray-200 py-2 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm bg-white"
                  placeholder="Ex: Entregue com carregador original e película aplicada."
                />
              </div>
            </div>

            {/* Ações do Rodapé */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setItemModal({ isOpen: false, data: null })}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveItem}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-sm"
              >
                <Save className="w-4 h-4" />
                Salvar no Estoque
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: ADICIONAR / EDITAR PRODUTO NO CATÁLOGO
          ========================================== */}
      {produtoModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Cabeçalho */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                {produtoModal.data.id ? 'Editar Produto do Catálogo' : 'Novo Produto no Catálogo'}
              </h3>
              <button
                onClick={() => setProdutoModal({ isOpen: false, data: null })}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Upload da foto */}
              <div className="flex items-center gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-150">
                <div className="w-20 h-20 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {produtoModal.data.foto ? (
                    <img src={produtoModal.data.foto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <p className="text-xs font-semibold text-gray-700 font-medium">Foto do Catálogo</p>
                  <label className="inline-flex items-center justify-center px-3 py-1.5 bg-white border border-gray-250 hover:bg-gray-50 text-xs font-bold text-gray-750 rounded-lg cursor-pointer transition-all shadow-sm">
                    Selecionar Imagem
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleImageUpload(e, (base64) => setProdutoModal(p => ({ ...p, data: { ...p.data, foto: base64 } })))}
                      className="hidden"
                    />
                  </label>
                  {produtoModal.data.foto && (
                    <button
                      type="button"
                      onClick={() => setProdutoModal(p => ({ ...p, data: { ...p.data, foto: '' } }))}
                      className="ml-2 text-[10px] text-red-650 hover:underline font-bold"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Nome do Produto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={produtoModal.data.nome}
                  onChange={e => setProdutoModal(p => ({ ...p, data: { ...p.data, nome: e.target.value } }))}
                  className="mt-1.5 block w-full rounded-lg border-gray-200 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm bg-white"
                  placeholder="Ex: CAMISA POLO FEMININA BLACK&DECKER"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Tipo do Produto
                  </label>
                  <select
                    value={produtoModal.data.tipo}
                    onChange={e => setProdutoModal(p => ({ ...p, data: { ...p.data, tipo: e.target.value } }))}
                    className="mt-1.5 block w-full rounded-lg border-gray-200 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm bg-white"
                  >
                    {TIPOS_ITENS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Alerta de Estoque Mín.
                  </label>
                  <input
                    type="number"
                    value={produtoModal.data.estoque_minimo}
                    onChange={e => setProdutoModal(p => ({ ...p, data: { ...p.data, estoque_minimo: e.target.value } }))}
                    className="mt-1.5 block w-full rounded-lg border-gray-200 py-2.5 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm bg-white"
                    placeholder="Ex: 5"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Especificação / Detalhes
                </label>
                <textarea
                  rows={3}
                  value={produtoModal.data.detalhes || ''}
                  onChange={e => setProdutoModal(p => ({ ...p, data: { ...p.data, detalhes: e.target.value } }))}
                  className="mt-1.5 block w-full rounded-lg border-gray-200 py-2 px-3 border focus:border-indigo-500 focus:ring-indigo-500 text-sm shadow-sm bg-white"
                  placeholder="Ex: Modelo oficial de fardamento com mangas curtas e cor preta."
                />
              </div>
            </div>

            {/* Ações */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setProdutoModal({ isOpen: false, data: null })}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProduto}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-sm"
              >
                <Save className="w-4 h-4" />
                Salvar no Catálogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
