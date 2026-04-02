/**
 * Import parsing module
 * Parses JSON and CSV into raw transaction objects
 */

/**
 * Parse import content by format into raw transaction objects.
 * @param {string} text
 * @param {string} format
 * @returns {Array<Partial<import('../types.js').Transaction>>}
 */
export function parseImportContent(text, format) {
  const content = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!content) return [];

  switch (format) {
    case 'json':
      return parseJSONImport(content);
    case 'csv-comma':
      return parseCSVImport(content, ',');
    case 'csv-semicolon':
      return parseCSVImport(content, ';');
    default:
      throw new Error('Unsupported import format');
  }
}

function parseJSONImport(content) {
  let data;
  try {
    data = JSON.parse(content);
  } catch (error) {
    throw new Error('Invalid JSON file');
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.transactions)) {
    return data.transactions;
  }

  throw new Error('JSON must be an array or include a transactions array');
}

function parseCSVImport(content, separator) {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  const header = parseCSVLine(lines[0], separator).map((value) => value.trim().toLowerCase());
  const indices = {
    id: header.indexOf('id'),
    description: header.indexOf('description'),
    amount: header.indexOf('amount'),
    category: header.indexOf('category'),
    date: header.indexOf('date'),
    type: header.indexOf('type')
  };

  return lines.slice(1).map((line) => {
    const row = parseCSVLine(line, separator);
    const raw = {
      id: indices.id >= 0 ? row[indices.id] : undefined,
      description: indices.description >= 0 ? unescapeCSVField(row[indices.description]) : '',
      amount: indices.amount >= 0 ? unescapeCSVField(row[indices.amount]) : '',
      category: indices.category >= 0 ? unescapeCSVField(row[indices.category]) : '',
      date: indices.date >= 0 ? row[indices.date] : '',
      type: indices.type >= 0 ? row[indices.type] : ''
    };

    return raw;
  });
}

function unescapeCSVField(field) {
  const str = String(field);
  // Remove leading single quote used for CSV injection protection
  if (str.startsWith("'") && (str[1] === '=' || str[1] === '+' || str[1] === '-' || str[1] === '@')) {
    return str.slice(1);
  }
  return str;
}

function parseCSVLine(line, separator) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === separator && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}
