import {
  LayoutDashboard, FileText, History, Package, Users, Building2,
  Store, FileSignature, Download, ShieldCheck, Settings,
} from 'lucide-react';

/** Navegação principal, agrupada pelo tipo de trabalho. */
export const NAV_GROUPS = [
  {
    label: 'Operação',
    items: [
      { href: '/dashboard',  name: 'Painel',          icon: LayoutDashboard, keywords: 'inicio resumo dashboard' },
      { href: '/documentos', name: 'Gerar documentos', icon: FileText,        keywords: 'carta pdf emitir gerar' },
      { href: '/historico',  name: 'Histórico de cartas', icon: History,     keywords: 'cartas geradas emitidas' },
      { href: '/estoque',    name: 'Estoque',          icon: Package,         keywords: 'materiais uniforme produtos' },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { href: '/funcionarios', name: 'Funcionários', icon: Users,         keywords: 'promotores pessoas colaboradores cpf' },
      { href: '/empresas',     name: 'Empresas',     icon: Building2,     keywords: 'agencias clientes cnpj' },
      { href: '/lojas',        name: 'Lojas',        icon: Store,         keywords: 'pdv redes supermercados' },
      { href: '/templates',    name: 'Templates',    icon: FileSignature, keywords: 'modelos layout pdf' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/downloads',     name: 'Downloads',     icon: Download,    keywords: 'arquivos baixar' },
      { href: '/auditoria',     name: 'Auditoria',     icon: ShieldCheck, keywords: 'log registro' },
      { href: '/configuracoes', name: 'Configurações', icon: Settings,    keywords: 'empresa carimbo ajustes' },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));

export function findNavItem(pathname) {
  if (pathname === '/' || pathname === '') return NAV_ITEMS.find((i) => i.href === '/dashboard');
  return NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}
