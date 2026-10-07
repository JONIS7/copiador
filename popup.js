document.addEventListener('DOMContentLoaded', () => {
  const site1Input = document.getElementById('site1');
  const site2Input = document.getElementById('site2');
  const fieldsContainer = document.getElementById('fieldsContainer');
  const addFieldBtn = document.getElementById('addFieldBtn');
  const saveBtn = document.getElementById('saveBtn');
  const liderSettingsBtn = document.getElementById('liderSettingsBtn');
  const exportConfigBtn = document.getElementById('exportConfigBtn');
  const importConfigBtn = document.getElementById('importConfigBtn');
  const importConfigFile = document.getElementById('importConfigFile');

  chrome.storage.local.get(['config'], (result) => {
    if (result.config) {
      loadConfigIntoForm(result.config);
    } else {
      addFieldRow('', '');
    }
  });

  function addFieldRow(sourceVal, targetVal) {
    const div = document.createElement('div');
    div.className = 'field-map';
    div.innerHTML = `
      <div class="field-row">
        <div style="flex: 1;">
          <label style="margin-top:0">Origem (Site 1)</label>
          <input type="text" class="source-sel" placeholder="#campoOrigem">
        </div>
        <div style="flex: 1;">
          <label style="margin-top:0">Destino (Site 2)</label>
          <input type="text" class="target-sel" placeholder="#campoDestino">
        </div>
      </div>
      <button class="remove-btn">Remover Campo</button>
    `;
    
    // Define os valores via JavaScript para evitar problemas com aspas (")
    div.querySelector('.source-sel').value = sourceVal;
    div.querySelector('.target-sel').value = targetVal;

    div.querySelector('.remove-btn').addEventListener('click', () => {
      div.remove();
    });
    fieldsContainer.appendChild(div);
  }

  function loadConfigIntoForm(config) {
    site1Input.value = config.site1 || '';
    site2Input.value = config.site2 || '';
    fieldsContainer.replaceChildren();
    if (config.fields && config.fields.length > 0) {
      config.fields.forEach(field => addFieldRow(field.source, field.target));
    } else {
      addFieldRow('', '');
    }
  }

  addFieldBtn.addEventListener('click', () => {
    addFieldRow('', '');
  });

  liderSettingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('lider.html') });
  });

  saveBtn.addEventListener('click', () => {
    const fields = [];
    document.querySelectorAll('.field-map').forEach(row => {
      const source = row.querySelector('.source-sel').value.trim();
      const target = row.querySelector('.target-sel').value.trim();
      if (source && target) {
        fields.push({ source, target });
      }
    });

    const config = {
      site1: site1Input.value.trim(),
      site2: site2Input.value.trim(),
      fields: fields
    };

    chrome.storage.local.set({ config }, () => {
      alert('Configurações salvas!');
    });
  });

  exportConfigBtn.addEventListener('click', () => {
    chrome.storage.local.get(['config', 'liderProfile'], result => {
      if (!result.config && !result.liderProfile) {
        alert('Não há configurações salvas para exportar.');
        return;
      }

      const backup = {
        version: 2,
        config: result.config || null,
        liderProfile: result.liderProfile || null
      };
      const configFile = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json'
      });
      const downloadUrl = URL.createObjectURL(configFile);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'copiador-config.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    });
  });

  importConfigBtn.addEventListener('click', () => importConfigFile.click());

  importConfigFile.addEventListener('change', async () => {
    const file = importConfigFile.files[0];
    if (!file) return;

    try {
      const importedData = JSON.parse(await file.text());
      const isValidConfig = value => value
        && typeof value.site1 === 'string'
        && typeof value.site2 === 'string'
        && Array.isArray(value.fields)
        && value.fields.every(field =>
          field
          && typeof field.source === 'string'
          && typeof field.target === 'string'
        );
      const isValidProfile = value => value
        && typeof value === 'object'
        && !Array.isArray(value)
        && Object.values(value).every(fieldValue => typeof fieldValue === 'string');
      const isLegacyConfig = isValidConfig(importedData);
      const isBackup = importedData
        && importedData.version === 2
        && (importedData.config === null || isValidConfig(importedData.config))
        && (importedData.liderProfile === null || isValidProfile(importedData.liderProfile));

      if (!isLegacyConfig && !isBackup) {
        throw new Error('Formato de configuração inválido.');
      }

      const importedConfig = isLegacyConfig ? importedData : importedData.config;
      const valuesToSave = {};
      if (importedConfig) valuesToSave.config = importedConfig;
      if (isBackup && importedData.liderProfile) {
        valuesToSave.liderProfile = importedData.liderProfile;
      }

      chrome.storage.local.set(valuesToSave, () => {
        if (importedConfig) loadConfigIntoForm(importedConfig);
        alert('Configurações importadas e salvas!');
      });
    } catch (error) {
      alert(`Não foi possível importar o arquivo: ${error.message}`);
    } finally {
      importConfigFile.value = '';
    }
  });
});
