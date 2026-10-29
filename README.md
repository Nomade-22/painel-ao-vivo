# Painel ao Vivo

Dois endereços: `console.html` (editor protegido por login) e `visualizacao.html` (exibição pública). Sincronização via Firebase Realtime Database.

## Configuração

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Adicione um aplicativo Web e copie a configuração para `firebase-config.js`, incluindo `databaseURL` do Realtime Database.
3. Em **Authentication → Sign-in method**, habilite **E-mail/senha**. Em **Users**, crie um usuário administrador.
4. Copie o **UID** desse usuário. Em **Realtime Database → Rules**, cole as regras de `database.rules.json`, substituindo `SUBSTITUA_PELO_UID_ADMIN` pelo UID. Publique as regras.
5. No Firebase Authentication, inclua o domínio de hospedagem em **Authorized domains** se necessário.
6. Crie um repositório novo no GitHub e envie os arquivos desta pasta à raiz da branch `main`.
7. Em **Settings → Pages → Build and deployment**, selecione **Deploy from a branch → main → /(root)**. Aguarde o endereço `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`.
8. Abra `console.html` para editar; abra `visualizacao.html` em qualquer aparelho para acompanhar.

## Segurança

Não use regras `".write": true`. A tela de exibição é pública: qualquer pessoa com o link pode ler o texto exibido. Apenas o UID do administrador pode gravar. Evite dados sensíveis no texto exibido.
