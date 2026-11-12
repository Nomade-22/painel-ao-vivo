# V2J · Integração Shopee Affiliate Open API

## Situação

Código preparado em `api/shopee-afiliados.js` e página `shopee-afiliados.html`. Sem as credenciais reais e acesso administrativo ao projeto Vercel, a conexão com a Shopee **não pode ser considerada validada**.

## Ativar com segurança

No projeto do V2J na Vercel, abra **Settings → Environment Variables** e adicione no ambiente **Production**:

| Nome | Conteúdo |
|---|---|
| `SHOPEE_AFFILIATE_APP_ID` | App ID emitido pela Shopee para a Open API de afiliados |
| `SHOPEE_AFFILIATE_APP_SECRET` | Secret/Senha DA API de afiliados (não é a senha do login) |
| `V2J_AFFILIATE_DASHBOARD_KEY` | Chave administrativa independente, aleatória, com 32+ caracteres |

O App ID, Secret e chave administrativa **não devem ser enviados no chat nem commitados no GitHub**. Criar uma nova implantação de produção após configurar as variáveis. Caso o projeto esteja ligado ao GitHub, novas alterações podem iniciar uma implantação automaticamente, mas mudar env vars exige uma nova implantação.

### Testar

1. Abra `https://painel-ao-vivo-jhonatan23.vercel.app/shopee-afiliados.html` após verificar o deployment.
2. Confira se o painel mostra `Credenciais configuradas (não verificadas)` e `Proteção ativa`.
3. Informe **somente** a `V2J_AFFILIATE_DASHBOARD_KEY` no campo de chave administrativa. O campo permanece apenas na memória da página.
4. Busque um produto simples, por exemplo `sapatilha`. Sucesso com produtos retornados prova conexão autenticada. Erros GraphQL podem indicar diferenças de schema ou falta de permissão para uma operação.
5. Teste geração de short link e relatório de conversões. Não há garantia de pedidos disponíveis ou em tempo real.
6. Depois do teste, use **Limpar chave** e feche a aba.

## Funcionamento e limites

- Assinatura do servidor: `SHA256(AppId + TimestampEmSegundos + CorpoJsonExato + Secret)`, enviada no header `Authorization: SHA256 Credential=..., Timestamp=..., Signature=...`.
- Endpoint externo fixo: `POST https://open-api.affiliate.shopee.com.br/graphql`.
- O navegador **nunca** recebe o App Secret. Não há endpoint para queries GraphQL livres: são permitidas somente operações pré-definidas.
- Todas as operações com dados privados exigem a chave administrativa do V2J. A página não a salva em cookies ou armazenamento local.
- Conversões de afiliado são **diferentes** dos pedidos e métricas em tempo real da Shopee LIVE. A API de afiliados não comprovou suporte para curtidas e novos seguidores da transmissão.
- Nenhum pedido individual, nome de comprador, endereço ou credencial é escrito em log ou cache persistente por este módulo.
- As consultas de conversões mostram até 50 registros da primeira página, para até 31 dias; outras páginas ainda não estão automatizadas.
- Página de produtos mostra preço e taxa nos formatos recebidos, sem presumir unidade/escala; confira valores no portal Shopee.
- O schema GraphQL foi implementado com base em referências públicas da Open API; teste real com a conta aprovada ainda é necessário para validar os campos disponíveis.

## Testes de código

`npm test` (inclui `tests/shopee-affiliate.test.mjs`): verifica autenticação do painel, assinatura SHA256, rejeição de URL externa e de GraphQL arbitrário com simulações. Não substitui o teste com credenciais reais.