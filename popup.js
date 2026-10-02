document.addEventListener('DOMContentLoaded', () => {
  const site1Input = document.getElementById('site1');
  const site2Input = document.getElementById('site2');
  const fieldsContainer = document.getElementById('fieldsContainer');
  const addFieldBtn = document.getElementById('addFieldBtn');
  const saveBtn = document.getElementById('saveBtn');

  // Load saved config
  chrome.storage.local.get(['config'], (result) => {
    if (result.config) {
      site1Input.value = result.config.site1 || '';
      site2Input.value = result.config.site2 || '';
      if (result.config.fields && result.config.fields.length > 0) {
        result.config.fields.forEach(f => addFieldRow(f.source, f.target));
      } else {
        addFieldRow('', '');
      }
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
});
