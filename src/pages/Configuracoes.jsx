import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Configuracoes() {
  const [formData, setFormData] = useState({
    razaoSocial: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
  });

  useEffect(() => {
    const savedData = localStorage.getItem('companySettings');
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('companySettings', JSON.stringify(formData));
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações da Empresa</h1>
        <p className="mt-1 text-sm text-gray-500">
          Estes dados serão usados para preencher automaticamente os placeholders globais (ex: {'{{razao_social}}'}) nos seus templates.
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-lg border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="razaoSocial" className="block text-sm font-medium leading-6 text-gray-900">
                Razão Social
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="razaoSocial"
                  id="razaoSocial"
                  value={formData.razaoSocial}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-2.5 px-3.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 transition-all"
                  placeholder="Sua Empresa LTDA"
                />
              </div>
            </div>

            <div>
              <label htmlFor="cnpj" className="block text-sm font-medium leading-6 text-gray-900">
                CNPJ
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="cnpj"
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-2.5 px-3.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 transition-all"
                  placeholder="00.000.000/0001-00"
                />
              </div>
            </div>

            <div>
              <label htmlFor="telefone" className="block text-sm font-medium leading-6 text-gray-900">
                Telefone
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="telefone"
                  id="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-2.5 px-3.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 transition-all"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
                E-mail Corporativo
              </label>
              <div className="mt-2">
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-2.5 px-3.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 transition-all"
                  placeholder="contato@empresa.com.br"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="endereco" className="block text-sm font-medium leading-6 text-gray-900">
                Endereço Completo
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="endereco"
                  id="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-2.5 px-3.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 transition-all"
                  placeholder="Rua Exemplo, 123 - Centro, Cidade - UF"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              Salvar Configurações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
