# Copiador de Formulários

Uma extensão para o Google Chrome que permite copiar dados de um formulário em um site e colar em outro de forma autônoma e configurável.

## Como instalar

1. Abra o Google Chrome.
2. Acesse a página de extensões digitando `chrome://extensions/` na barra de endereços.
3. No canto superior direito, ative o **Modo do desenvolvedor**.
4. Clique no botão **Carregar sem compactação** (ou "Load unpacked").
5. Selecione a pasta onde estes arquivos estão salvos (a pasta `copiador`).

## Como usar

1. **Configurar**: Clique no ícone da extensão no canto superior direito do navegador.
2. Defina qual é o **Site 1 (Origem)** e qual é o **Site 2 (Destino)**. (Pode colocar apenas uma parte da URL, por exemplo `site1.com/cadastro`).
3. Adicione o **Mapeamento de Campos**:
   - Para o Site 1 (Origem), coloque o seletor CSS do campo (ex: `#nome-cliente`, `#email`, `.input-cpf`, ou `[name="telefone"]`).
   - Para o Site 2 (Destino), coloque o seletor CSS onde aquele dado deverá ser preenchido (ex: `#nome_completo`, `.form-email`, etc).
4. Clique em **Salvar Configurações**.
5. **Copiar**: Acesse o Site 1 e clique no botão azul "Copiar Dados (Extensão)" que aparecerá flutuante no canto superior direito.
6. **Colar**: Acesse o Site 2 e clique no botão laranja "Colar Dados (Extensão)" que aparecerá para preencher o formulário automaticamente.
