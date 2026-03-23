// Staff Theme Color Configuration
export const adminColors = {
  purple: {
    primary: '#7c3aed',
    light: '#ede9fe',
    dark: '#5b21b6',
    hex: '#7c3aed'
  },
  blue: {
    primary: '#3b82f6',
    light: '#dbeafe',
    dark: '#1e40af',
    hex: '#3b82f6'
  },
  green: {
    primary: '#10b981',
    light: '#d1fae5',
    dark: '#047857',
    hex: '#10b981'
  },
  indigo: {
    primary: '#6366f1',
    light: '#e0e7ff',
    dark: '#4338ca',
    hex: '#6366f1'
  }
};

/**
 * Get color theme object for given color name
 * @param {string} colorName - Color name (purple, blue, green, indigo)
 * @returns {object} Color theme object with primary, light, and dark variants
 */
export const getColorTheme = (colorName) => {
  return adminColors[colorName] || adminColors.purple;
};

/**
 * Apply admin color theme to the document
 * Sets CSS variables that can be used throughout the application
 * @param {string} colorName - Color name to apply
 */
export const applyAdminColorTheme = (colorName) => {
  const root = document.documentElement;

  // If colorName matches one of the named adminColors, use that theme
  if (adminColors[colorName]) {
    const theme = adminColors[colorName];
    root.style.setProperty('--admin-color-primary', theme.primary);
    root.style.setProperty('--admin-color-light', theme.light);
    root.style.setProperty('--admin-color-dark', theme.dark);
    localStorage.setItem('staffAdminColor', colorName);
    window.dispatchEvent(new CustomEvent('adminColorChanged', { detail: { colorName, theme } }));
    // Also apply variables directly to the sidebar element for higher specificity
    try {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.style.setProperty('--admin-color-primary', theme.primary);
        sidebar.style.setProperty('--admin-color-light', theme.light);
        sidebar.style.setProperty('--admin-color-dark', theme.dark);
      }
    } catch (e) {
      // ignore
    }
    return;
  }

  // Otherwise assume a raw hex color (e.g. #aabbcc) was provided
  const primary = (colorName || '').toString();
  if (/^#?[0-9A-Fa-f]{6}$/.test(primary)) {
    const hex = primary.startsWith('#') ? primary : `#${primary}`;
    // Simple light/dark derivation: lighten and darken by fixed amounts
    const light = '#f3f4f6';
    const dark = hex;
    root.style.setProperty('--admin-color-primary', hex);
    root.style.setProperty('--admin-color-light', light);
    root.style.setProperty('--admin-color-dark', dark);
    // Apply to sidebar as well
    try {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.style.setProperty('--admin-color-primary', hex);
        sidebar.style.setProperty('--admin-color-light', light);
        sidebar.style.setProperty('--admin-color-dark', dark);
      }
    } catch (e) {}
    localStorage.setItem('staffAdminColor', hex);
    window.dispatchEvent(new CustomEvent('adminColorChanged', { detail: { colorName: hex, theme: { primary: hex, light, dark } } }));
    return;
  }

  // Fallback to purple
  const fallback = adminColors.purple;
  root.style.setProperty('--admin-color-primary', fallback.primary);
  root.style.setProperty('--admin-color-light', fallback.light);
  root.style.setProperty('--admin-color-dark', fallback.dark);
  try {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.style.setProperty('--admin-color-primary', fallback.primary);
      sidebar.style.setProperty('--admin-color-light', fallback.light);
      sidebar.style.setProperty('--admin-color-dark', fallback.dark);
    }
  } catch (e) {}
  localStorage.setItem('staffAdminColor', 'purple');
  window.dispatchEvent(new CustomEvent('adminColorChanged', { detail: { colorName: 'purple', theme: fallback } }));
};

/**
 * Load saved admin color from localStorage and apply theme
 * Defaults to purple if no saved preference
 */
export const loadAndApplyAdminColor = () => {
  const savedColor = localStorage.getItem('staffAdminColor') || 'purple';
  applyAdminColorTheme(savedColor);
  return savedColor;
};
