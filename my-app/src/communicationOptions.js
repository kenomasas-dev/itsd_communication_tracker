// Shared communication dropdown options (used by Admin Groups Actions modal and Staff Communication form)

export const STORAGE_KEYS = {
  kind: 'communication_kind_options',
  type: 'communication_type_options',
  internalOffice: 'internal_office_options'
};

export const DEFAULT_KIND = ['Executive Order', 'Memorandum Order', 'Notice', 'Transmittal', 'Letter Request', 'Letter of Intent', 'Response Letter'];
export const DEFAULT_TYPE = ['Printed copy', 'Email', 'Phone call', 'Meeting (In-Person/Online)', 'Video conference', 'Text Message'];
export const DEFAULT_INTERNAL_OFFICE = ['CMO', 'BAC', 'HRMO', 'CNCO', 'CEO', 'CADO', 'CASSO', 'CHO', 'CBO', 'CDRRMO', 'GSO', 'CENTRO', 'CEEO', 'CLO', 'BPLD', 'CPDC', 'CCRO', 'CSWD', 'TOURISM OFFICE', 'CTO', 'CVO', "PROSECUTOR'S OFFICE", 'DILG VALENCIA', 'DBM', 'BFP', 'COA', 'ITSD', 'PNP'];

export function loadOptions(key, defaultList) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return defaultList;
}

export function saveOptions(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {}
}
