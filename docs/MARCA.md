# Marca Tarhget — paleta e uso

Cores extraídas do logo (vinho `#580A05` sobre cinza-claro `#F4F4F4`).
Os tokens ficam em `src/index.css`; as classes `brand-*` (e os antigos `indigo-*`, `violet-*`, `purple-*`) usam o vinho.

## Vinho (cor da marca)

| Token | Hex | Uso |
|---|---|---|
| brand-50 | `#FBF3F2` | Fundo de destaque suave, chips |
| brand-100 | `#F6E2E0` | Bordas de destaque, marca no menu escuro |
| brand-200 | `#ECC3BF` | Ícone ativo no menu |
| brand-300 | `#DC9891` | Marcador da página ativa |
| brand-400 | `#C4665D` | — |
| brand-500 | `#A03E35` | Gráficos |
| **brand-600** | **`#7E1F17`** | **Botões principais, links, foco** |
| brand-700 | `#66130C` | Botão ao passar o mouse, texto em chip |
| **brand-800** | **`#580A05`** | **Cor exata do logo** (marca, nome TARHGET) |
| brand-900 | `#3F0603` | Texto sobre fundo vinho claro |
| brand-950 | `#240302` | — |

## Base

| Token | Hex | Uso |
|---|---|---|
| paper | `#F4F4F4` | Fundo das telas (o mesmo cinza do logo) |
| surface | `#FFFFFF` | Cartões e painéis |
| ink | `#1F1110` | Menu lateral, texto mais escuro |
| line | `#E2DFDD` | Bordas |
| slate-500 | `#6B6460` | Texto secundário |
| signal-500 | `#C9781F` | Alertas (ex.: "Sem empresa", "Nunca usado") |

## Contraste (WCAG AA ≥ 4,5:1)

| Combinação | Contraste |
|---|---|
| Branco sobre brand-600 (botão) | 10,0:1 |
| brand-600 sobre o fundo `#F4F4F4` | 9,1:1 |
| Texto principal sobre o fundo | 15,7:1 |
| Texto secundário sobre o fundo | 5,3:1 |
| Texto ativo no menu escuro | 14,7:1 |

## Tipografia

- **Cinzel** (serifada, como no logo): só no nome **TARHGET**.
- **IBM Plex Sans**: todo o resto da interface.

O Portal do Promotor mantém o vermelho da Colgate, que é a marca do cliente.
