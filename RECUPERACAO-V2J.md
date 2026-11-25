# Recuperação V2J
Banco dedicado: v2j-live-central, database v2j_live (São Paulo). A tabela já foi criada.
1. Na Vercel, projeto painel-ao-vivo, configure V2J_DATABASE_URL como variável sensível de Production, com a connection string do banco dedicado. Nunca coloque a credencial no GitHub, no navegador ou no chat.
2. Publique a revisão e confira /api/v2j-health: storage deve ser neon.
3. Em primeira leitura, dados presentes no runtime cache são copiados para o banco sem sobrescrever linhas existentes. Não há fallback silencioso quando o banco falha. Se a cache estiver indisponível e a migração tiver sido avaliada, V2J_SKIP_LEGACY=1 permite iniciar os estados sem importar a cache. Não ativar antes de avaliar o backup.
4. Teste texto, vídeo, animações, cartas, câmera e Studio em dois dispositivos, sem uma transmissão ativa.
5. O retorno TikTok/Shopee permanece na cache até testes específicos; depois V2J_PERSIST_RETURNS=1 ativa a migração. Microfone continua com TTL de sinalização temporária.
6. Para recuperar vídeos já enviados na nuvem, defina um segredo administrativo independente V2J_ADMIN_TOKEN (24+ caracteres) e consulte GET /api/v2j-health?recover=1 autenticado com Authorization: Bearer. A consulta é somente leitura; não apaga arquivos. Pode haver paginação. Não expor o segredo em URLs.
7. Uploads novos registram um backup local dos links. A recuperação local é explícita e não restaura arquivos apagados do Blob.
8. Controle de acesso integral ainda requer um plano para credenciais do console, OBS e extensões; não habilitar proteção geral que quebre as fontes existentes sem teste.
