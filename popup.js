document.addEventListener('DOMContentLoaded', () => {
  const site1Input = document.getElementById('site1');
  const site2Input = document.getElementById('site2');
  const fieldsContainer = document.getElementById('fieldsContainer');
  const addFieldBtn = document.getElementById('addFieldBtn');
  const saveBtn = document.getElementById('saveBtn');
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
    chrome.storage.local.get(['config'], result => {
      if (!result.config) {
        alert('Não há configurações salvas para exportar.');
        return;
      }

      const configFile = new Blob([JSON.stringify(result.config, null, 2)], {
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
      const importedConfig = JSON.parse(await file.text());
      const isValidConfig = importedConfig
        && typeof importedConfig.site1 === 'string'
        && typeof importedConfig.site2 === 'string'
        && Array.isArray(importedConfig.fields)
        && importedConfig.fields.every(field =>
          field
          && typeof field.source === 'string'
          && typeof field.target === 'string'
        );

      if (!isValidConfig) {
        throw new Error('Formato de configuração inválido.');
      }

      chrome.storage.local.set({ config: importedConfig }, () => {
        loadConfigIntoForm(importedConfig);
        alert('Configurações importadas e salvas!');
      });
    } catch (error) {
      alert(`Não foi possível importar o arquivo: ${error.message}`);
    } finally {
      importConfigFile.value = '';
    }
  });
});
