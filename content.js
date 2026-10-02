let config = null;

function makeDraggable(el, storageKey) {
  let isDragging = false;
  let hasDragged = false;
  let startX, startY, initialLeft, initialTop;

  // Carrega posição salva anteriormente
  chrome.storage.local.get([storageKey], (result) => {
    if (result[storageKey]) {
      el.style.left = result[storageKey].left;
      el.style.top = result[storageKey].top;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    }
  });

  el.addEventListener('mousedown', (e) => {
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

  // Intercepta o clique para não disparar a ação do botão se o usuário estava apenas arrastando
  el.addEventListener('click', (e) => {
    if (hasDragged) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true); // Captura o evento antes do clique real do botão
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

  const btn = document.createElement('button');
  btn.id = 'copiador-copy-btn';
  btn.className = 'copiador-btn';
  btn.innerText = 'Copiar Dados (Extensão)';
  
  btn.addEventListener('click', () => {
    if (!config || !config.fields) return;

    const dataToCopy = {};
    let copiedCount = 0;
    config.fields.forEach(field => {
      const el = document.querySelector(field.source);
      if (el) {
        // Handle input vs text element
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
          if (el.type === 'checkbox' || el.type === 'radio') {
             dataToCopy[field.source] = el.checked;
          } else {
             dataToCopy[field.source] = el.value;
          }
        } else {
          dataToCopy[field.source] = el.innerText || el.textContent;
        }
        copiedCount++;
      } else {
         console.warn("Copiador: Seletor não encontrado:", field.source);
      }
    });

    chrome.storage.local.set({ copiedData: dataToCopy }, () => {
      alert(`Dados de ${copiedCount} campo(s) copiados com sucesso!`);
    });
  });

  document.body.appendChild(btn);

  // Torna o botão arrastável pelo usuário
  makeDraggable(btn, 'copiador_pos_copy');
}

function injectPasteButton() {
  if (document.getElementById('copiador-paste-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'copiador-paste-btn';
  btn.className = 'copiador-btn paste';
  btn.innerText = 'Colar Dados (Extensão)';
  
  btn.addEventListener('click', () => {
    chrome.storage.local.get(['copiedData'], (result) => {
      if (!result.copiedData) {
        alert('Nenhum dado copiado ainda!');
        return;
      }
      
      const data = result.copiedData;
      let pastedCount = 0;

      // Agrupa os valores pelo seletor de destino
      const targetValues = {};
      config.fields.forEach(field => {
        const val = data[field.source];
        if (val !== undefined && val !== "") {
          if (!targetValues[field.target]) {
            targetValues[field.target] = [];
          }
          targetValues[field.target].push(val);
        }
      });

      // Cola os dados agrupados em cada destino
      Object.keys(targetValues).forEach(target => {
        const el = document.querySelector(target);
        if (el) {
          let combinedValue = '';
          // Se for um input simples (como barra de busca), junta com um traço. Se for área de texto, usa quebra de linha real.
          if (el.tagName === 'INPUT') {
             combinedValue = targetValues[target].join(' - ');
          } else {
             combinedValue = targetValues[target].join('\n');
          }

          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = combinedValue === 'true' || combinedValue === true;
            } else {
                el.value = combinedValue;
            }
            // Dispara eventos para frameworks (React, Vue, etc)
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (el.isContentEditable || el.closest('[contenteditable="true"]')) {
            // Lida com editores de texto complexos (como o do Twitter)
            const editableEl = el.isContentEditable ? el : el.closest('[contenteditable="true"]');
            editableEl.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, combinedValue);
          } else {
            // Fallback para divs comuns
            el.innerText = combinedValue;
          }
          pastedCount++;
        } else {
           console.warn("Copiador: Seletor não encontrado:", target);
        }
      });
      
      if (pastedCount > 0) {
        alert(`Foram preenchidos ${pastedCount} campos!`);
      } else {
        alert('Nenhum campo foi preenchido. Verifique os seletores de destino.');
      }
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
