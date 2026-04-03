(function (global) {
  const EMPLOYEE_NAMES = Object.freeze([
    'ABBASS',
    'AHMED MAGDY',
    'zahraa Shaqir',
    'Zainab',
    'Basant Abdelhamed',
    'Zain-Alabdeen Balloul',
    'Hadil zaiter',
    'Nour karsifi',
    'Ahmed Gamal',
    'Mohamed Abd',
    'MA7AR HAMMOUD',
    'Ahmed - Manager',
    'Shahenda Sherif'
  ]);

  const EMPLOYEE_ALIASES = Object.freeze({
    'Ahmed – Manager': 'Ahmed - Manager'
  });

  const AUTHORIZED_EMPLOYEE_NAMES = Object.freeze([
    'Ahmed Gamal',
    'Ahmed - Manager'
  ]);

  function normalizeEmployeeName(name) {
    if (typeof name !== 'string') return '';
    const collapsed = name.trim().replace(/\s+/g, ' ');
    if (!collapsed) return '';
    return EMPLOYEE_ALIASES[collapsed] || collapsed;
  }

  function getEmployeeNames() {
    return EMPLOYEE_NAMES.slice();
  }

  function getAuthorizedEmployeeNames() {
    return AUTHORIZED_EMPLOYEE_NAMES.slice();
  }

  function isAuthorizedEmployee(name) {
    return AUTHORIZED_EMPLOYEE_NAMES.includes(normalizeEmployeeName(name));
  }

  function mergeConfiguredEmployeeList(existingNames) {
    const merged = [];
    const seen = new Set();

    function addName(rawName) {
      const normalizedName = normalizeEmployeeName(rawName);
      if (!normalizedName || seen.has(normalizedName)) return;
      seen.add(normalizedName);
      merged.push(normalizedName);
    }

    EMPLOYEE_NAMES.forEach(addName);
    if (Array.isArray(existingNames)) {
      existingNames.forEach(addName);
    }

    return merged;
  }

  function ensureEmployeeOption(selectEl, rawName) {
    if (!selectEl) return null;

    const normalizedName = normalizeEmployeeName(rawName);
    if (!normalizedName) return null;

    const existingOption = Array.from(selectEl.options || []).find(
      (option) => normalizeEmployeeName(option.value) === normalizedName
    );

    if (existingOption) {
      existingOption.value = normalizedName;
      existingOption.textContent = normalizedName;
      return existingOption;
    }

    const option = document.createElement('option');
    option.value = normalizedName;
    option.textContent = normalizedName;
    selectEl.appendChild(option);
    return option;
  }

  function populateEmployeeSelect(selectEl, extraNames) {
    if (!selectEl) return [];

    const placeholder = Array.from(selectEl.options || []).find(
      (option) => option.disabled && !option.value
    );
    const currentValue = normalizeEmployeeName(selectEl.value);
    const employeeNames = mergeConfiguredEmployeeList(extraNames);

    selectEl.innerHTML = '';

    if (placeholder) {
      const placeholderClone = placeholder.cloneNode(true);
      placeholderClone.selected = !currentValue;
      selectEl.appendChild(placeholderClone);
    }

    employeeNames.forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      selectEl.appendChild(option);
    });

    if (currentValue) {
      ensureEmployeeOption(selectEl, currentValue);
      selectEl.value = currentValue;
    }

    return employeeNames;
  }

  global.EmployeeDirectory = Object.freeze({
    ensureEmployeeOption,
    getAuthorizedEmployeeNames,
    getEmployeeNames,
    isAuthorizedEmployee,
    mergeConfiguredEmployeeList,
    normalizeEmployeeName,
    populateEmployeeSelect
  });
})(window);
