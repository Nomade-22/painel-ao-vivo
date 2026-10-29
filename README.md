# Painel ao Vivo — sem Firebase

As páginas ficam no GitHub Pages. Um Cloudflare Worker com banco D1 sincroniza os dados entre dispositivos. A visualização consulta o servidor a cada 1,2 segundo.

## Configuração

1. Crie uma conta no Cloudflare e um banco **D1** chamado `painel-ao-vivo`.
2. No console SQL do D1, execute o conteúdo de `schema.sql`.
3. Crie um **Worker** JavaScript e cole o código de `worker.js`.
4. Nas configurações do Worker, adicione o binding **D1** de nome `DB` conectado ao banco.
5. Em **Variables and Secrets**, adicione um **secret** `ADMIN_TOKEN` com uma senha aleatória longa. Não coloque o token no GitHub.
6. Publique o Worker e copie sua URL HTTPS. No GitHub, edite `api-config.js` para definir essa URL (sem barra final).
7. Em **Settings → Pages** do GitHub, publique a branch `main`, pasta `/ (root)`.

Console: `https://nomade-22.github.io/painel-ao-vivo/console.html` — informe a chave `ADMIN_TOKEN` para editar.

Visualização: `https://nomade-22.github.io/painel-ao-vivo/visualizacao.html` — atualiza automaticamente.

O conteúdo da tela de visualização é público. Não use para dados confidenciais.
