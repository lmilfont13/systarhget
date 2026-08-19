export const formatCpf = (cpf) => {
  if (!cpf) return '';
  const s = String(cpf).trim();
  if (/^\d+$/.test(s) && s.length < 11) return s.padStart(11, '0');
  return s;
};

export const formatExcelDate = (val, key) => {
  if (!val) return val;
  const keyLower = String(key || '').toLowerCase();
  const isDateKey = keyLower.includes('data') || keyLower.includes('nasc') || keyLower.includes('vencimento');
  
  if (isDateKey) {
    const num = Number(val);
    if (!isNaN(num) && num > 20000 && num < 100000) {
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
      
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  }
  return val;
};

export const capitalizeStoreName = (name) => {
  if (!name) return '';
  return String(name)
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      const excecoes = ['de', 'da', 'do', 'dos', 'das', 'e', 'em', 'na', 'no', 'nas', 'nos'];
      if (excecoes.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};
