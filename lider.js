const defaultProfile = {
  requester: 'Tribunal Regional do Trabalho 8 Região',
  phone1: '4008-7029',
  phone2: '4008-7267',
  email: 'coins.microinformatica@trt8.jus.br',
  organization: 'Tribunal Regional do Trabalho 8 Região',
  cnpj: '01.547.343/0001-33',
  invoiceNumber: '6467'
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('liderProfileForm');
  const inputs = [...form.querySelectorAll('input[name]')];

  chrome.storage.local.get(['liderProfile'], result => {
    const profile = { ...defaultProfile, ...(result.liderProfile || {}) };
    inputs.forEach(input => {
      input.value = profile[input.name] || '';
    });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const profile = Object.fromEntries(inputs.map(input => [input.name, input.value.trim()]));
    chrome.storage.local.set({ liderProfile: profile }, () => {
      alert('Dados recorrentes salvos!');
    });
  });
});