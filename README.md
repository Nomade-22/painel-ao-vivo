# Painel ao Vivo — GitHub + Vercel

Duas páginas independentes e uma API hospedadas pela Vercel:

- `/console.html` — editor com prévia, fonte, tamanho, cores e alinhamento.
- `/visualizacao.html` — somente exibição em tela cheia, atualizada aproximadamente a cada 1,2 segundo.

## Publicar

1. Na Vercel, importe `Nomade-22/painel-ao-vivo`, usando a raiz do repositório e a opção **Other** para framework.
2. Em **Environment Variables**, crie `ADMIN_TOKEN` com uma senha longa e aleatória (não coloque a senha no GitHub).
3. Faça o deploy. Abra `/console.html`, informe a chave e digite. Abra `/visualizacao.html` no outro aparelho.

## Limitação de armazenamento

Esta versão utiliza **Vercel Runtime Cache**, um cache compartilhado pela região `gru1` (São Paulo). O valor expira após 24 horas sem ser renovado e pode ser removido antes disso por limite de armazenamento. Não é um banco de dados permanente. O console não deve ser utilizado para conteúdo que precise ficar guardado para sempre.

As páginas e a API ficam no mesmo domínio Vercel. A visualização é pública para quem tem o link, e somente quem conhece `ADMIN_TOKEN` pode editar.
