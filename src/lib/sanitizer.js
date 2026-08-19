import DOMPurify from 'dompurify';

/**
 * Configuração segura do DOMPurify
 * Remove scripts e tags perigosas, mas permite HTML básico
 */
const purifyConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'div', 'span', 'a', 'img', 'b', 'i', 'hr', 'blockquote'
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel'],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
};

/**
 * Sanitiza HTML para evitar XSS attacks
 * @param {string} html - HTML a ser sanitizado
 * @param {object} config - Configuração opcional do DOMPurify
 * @returns {string} HTML seguro
 */
export const sanitizeHtml = (html, config = {}) => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const finalConfig = { ...purifyConfig, ...config };
  return DOMPurify.sanitize(html, finalConfig);
};

/**
 * Sanitiza texto para evitar injeção
 * Remove todas as tags HTML
 * @param {string} text - Texto a ser sanitizado
 * @returns {string} Texto seguro
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitiza atributos de URLs
 * Previne javascript: e data: URLs
 * @param {string} url - URL a ser sanitizada
 * @returns {string} URL segura
 */
export const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim().toLowerCase();

  // Bloqueia protocolos perigosos
  if (trimmed.startsWith('javascript:') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('vbscript:')) {
    return '';
  }

  return url;
};

/**
 * Sanitiza JSON string para evitar injeção
 * @param {string} jsonString - String JSON a ser sanitizada
 * @returns {object|null} Objeto parseado seguro
 */
export const sanitizeJson = (jsonString) => {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      return null;
    }

    const parsed = JSON.parse(jsonString);

    // Se for um objeto, sanitiza recursivamente as strings
    if (typeof parsed === 'object' && parsed !== null) {
      return sanitizeObject(parsed);
    }

    return parsed;
  } catch (error) {
    console.warn('Invalid JSON string:', error);
    return null;
  }
};

/**
 * Helper recursivo para sanitizar objetos
 * @param {*} obj - Objeto a ser sanitizado
 * @returns {*} Objeto sanitizado
 */
const sanitizeObject = (obj) => {
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeText(key)] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
};

/**
 * Sanitiza dados de formulário
 * @param {object} formData - Dados do formulário
 * @returns {object} Dados sanitizados
 */
export const sanitizeFormData = (formData) => {
  if (!formData || typeof formData !== 'object') {
    return {};
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(formData)) {
    // Sanitiza a chave
    const cleanKey = sanitizeText(key);

    // Sanitiza o valor conforme seu tipo
    if (typeof value === 'string') {
      sanitized[cleanKey] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[cleanKey] = sanitizeObject(value);
    } else {
      sanitized[cleanKey] = value;
    }
  }

  return sanitized;
};

export default {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeJson,
  sanitizeFormData,
};
