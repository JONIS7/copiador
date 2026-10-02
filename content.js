let config = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'copiador:paste-frame') {
    sendResponse({ pastedCount: pasteDataIntoDocument(message.data) });
  }
});

function pasteDataIntoDocument(data) {
  if (!config || !config.fields) return 0;

  const targetValues = {};
  config.fields.forEach(field => {
    const val = data[field.source];
    if (val !== undefined && val !== '') {
      if (!targetValues[field.target]) targetValues[field.target] = [];
      targetValues[field.target].push(val);
    }
  });

  let pastedCount = 0;
  Object.keys(targetValues).forEach(target => {
    const el = document.querySelector(target);
    if (!el) return;

    let combinedValue = el.tagName === 'INPUT'
      ? targetValues[target].join(' - ')
      : targetValues[target].join('\n');

    if (el.id === 'os' && typeof combinedValue === 'string') {
      const osNumber = combinedValue.match(/^\s*S?(\d+)\s*\(/i);
      if (osNumber) combinedValue = osNumber[1];
    }

    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = combinedValue === 'true' || combinedValue === true;
      } else {
        el.value = combinedValue;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (el.isContentEditable || el.closest('[contenteditable="true"]')) {
      const editableEl = el.isContentEditable ? el : el.closest('[contenteditable="true"]');
      editableEl.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, combinedValue);
    } else {
      el.innerText = combinedValue;
    }
    pastedCount++;
  });

  return pastedCount;
}

function makeDraggable(el, storageKey) {
  let isDragging = false;
  let hasDragged = false;
  let isResizing = false;
  let startX, startY, initialLeft, initialTop;
  const sizeStorageKey = `${storageKey}_size`;

  chrome.storage.local.get([storageKey, sizeStorageKey], (result) => {
    if (result[storageKey]) {
      el.style.left = result[storageKey].left;
      el.style.top = result[storageKey].top;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    }
    if (result[sizeStorageKey]) {
      const savedWidth = Number.parseFloat(result[sizeStorageKey].width);
      const savedHeight = Number.parseFloat(result[sizeStorageKey].height);
      const maxWidth = el.id === 'copiador-copy-btn' ? 120 : Infinity;
      const maxHeight = el.id === 'copiador-copy-btn' ? 32 : Infinity;
      el.style.width = `${Math.max(64, Math.min(savedWidth || 120, maxWidth))}px`;
      el.style.height = `${Math.max(22, Math.min(savedHeight || 32, maxHeight))}px`;
    }
  });

  el.addEventListener('mousedown', (e) => {
    const bounds = el.getBoundingClientRect();
    if (e.clientX >= bounds.right - 18 && e.clientY >= bounds.bottom - 18) {
      isResizing = true;
      return;
    }

    isDragging = true;
    hasDragged = false;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = el.offsetLeft;
    initialTop = el.offsetTop;
    el.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // Só considera como arrastar se mover mais de 3px
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
       hasDragged = true;
    }

    if (hasDragged) {
      el.style.left = (initialLeft + dx) + 'px';
      el.style.top = (initialTop + dy) + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (isResizing) {
      isResizing = false;
      chrome.storage.local.set({
        [sizeStorageKey]: {
          width: `${el.offsetWidth}px`,
          height: `${el.offsetHeight}px`
        }
      });
      return;
    }

    if (isDragging) {
      isDragging = false;
      el.style.cursor = 'grab';
      if (hasDragged) {
         // Salva a nova posição
         const pos = { left: el.style.left, top: el.style.top };
         chrome.storage.local.set({ [storageKey]: pos });
      }
    }
  });

}
function checkUrlAndInject() {
  const currentUrl = window.location.href;

  chrome.storage.local.get(['config'], (result) => {
    if (result.config) {
      config = result.config;
      
      const isSite1 = config.site1 && currentUrl.includes(config.site1);
      const isSite2 = config.site2 && currentUrl.includes(config.site2);

      // We remove existing buttons in case URL changed in SPA but no longer matches
      const copyBtn = document.getElementById('copiador-copy-btn');
      if (copyBtn && !isSite1) copyBtn.remove();
      
      const pasteBtn = document.getElementById('copiador-paste-btn');
      if (pasteBtn && !isSite2) pasteBtn.remove();

      if (isSite1) {
        injectCopyButton();
      }
      if (isSite2) {
        injectPasteButton();
      }
    }
  });
}

function injectCopyButton() {
  if (document.getElementById('copiador-copy-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'copiador-copy-btn';
  btn.className = 'copiador-btn';
  btn.setAttribute('role', 'status');
  btn.setAttribute('aria-live', 'polite');
  btn.innerText = 'Aguardando dados';

  const copySourceData = () => {
    if (!config || !config.fields) return;

    const dataToCopy = {};
    config.fields.forEach(field => {
      const el = document.querySelector(field.source);
      if (el) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
          if (el.type === 'checkbox' || el.type === 'radio') {
            dataToCopy[field.source] = el.checked;
          } else {
            dataToCopy[field.source] = el.value;
          }
        } else {
          dataToCopy[field.source] = el.innerText || el.textContent;
        }
      }
    });

    const copiedCount = Object.keys(dataToCopy).length;
    if (copiedCount === 0) return;

    chrome.storage.local.set({ copiedData: dataToCopy }, () => {
        const status = `${copiedCount} ${copiedCount === 1 ? 'dado copiado' : 'dados copiados'}`;
        if (btn.innerText !== status) btn.innerText = status;
    });
  };

  document.body.appendChild(btn);
  makeDraggable(btn, 'copiador_pos_copy');

  let copyTimer;
  const scheduleCopy = () => {
    clearTimeout(copyTimer);
    copyTimer = setTimeout(copySourceData, 150);
  };

  document.addEventListener('input', scheduleCopy, true);
  document.addEventListener('change', scheduleCopy, true);
  new MutationObserver(records => {
    if (records.some(record => !btn.contains(record.target) && record.target !== btn)) {
      scheduleCopy();
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  scheduleCopy();
}

function injectPasteButton() {
  if (document.getElementById('copiador-paste-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'copiador-paste-btn';
  btn.className = 'copiador-btn paste';
  btn.innerText = 'Colar Dados';
  
  btn.addEventListener('click', () => {
    chrome.storage.local.get(['copiedData'], (result) => {
      if (!result.copiedData) {
        alert('Nenhum dado copiado ainda!');
        return;
      }
      
      chrome.runtime.sendMessage({
        type: 'copiador:paste',
        data: result.copiedData
      }, (response) => {
        if (chrome.runtime.lastError || !response || response.pastedCount === 0) {
          alert('Nenhum campo foi preenchido. Verifique os seletores de destino.');
          return;
        }
        alert(`Foram preenchidos ${response.pastedCount} campos!`);
      });
    });
  });

  document.body.appendChild(btn);

  // Torna o botão arrastável pelo usuário
  makeDraggable(btn, 'copiador_pos_paste');
}

// Run on load
checkUrlAndInject();

// Run when the page changes (for SPAs)
let lastUrl = location.href; 
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    checkUrlAndInject();
  }
}).observe(document, {subtree: true, childList: true});
