# Link — Voz e tela

Aplicativo web simples, multi-tenant, com contas individuais, salas de voz e compartilhamento de tela. Interface em português.

## Recursos

- Cadastro e login com e-mail e senha; hash scrypt, sessão aleatória e cookie HttpOnly.
- Cada espaço (tenant) possui membros e salas isolados. Uma conta pode participar de vários espaços.
- Administradores criam, renomeiam e excluem salas de voz e canais de texto, geram e revogam convites e removem membros.
- Canais de texto com mensagens persistentes, atualização automática e histórico paginado.
- A exclusão de salas de voz em uso é bloqueada; excluir um canal de texto exige confirmação na interface e remove seu histórico.
- Convites expiram em 24 horas, aceitam até 20 novos membros e só são armazenados como hash.
- Entrada sem microfone para ouvir e compartilhar tela; ativação do microfone durante a chamada.
- Volume individual de 0 a 100% e silenciamento local por participante, salvo neste navegador. Clique no ícone de alto-falante do participante ou use o botão direito no cartão.
- Voz WebRTC, microfone, câmera e compartilhamento de tela simultâneos, com presença via Socket.IO. Até 6 conexões por sala.
- Compartilhamento com botão de tela cheia e modo ampliado de compatibilidade.
- Cartões de participantes, controles centralizados, reações e mão levantada sincronizadas por sala.
- Três temas escuros (Neon Club, Midnight e Playground), navegação por ícones e perfil com ícones ou foto personalizada sincronizado com a conta.
- Autorização de tenant no servidor, inclusive no ingresso e na sinalização WebRTC.
- Banco SQLite em volume persistente. Nenhuma conta ou senha padrão.

## Desenvolvimento

Requer Node.js 24+.

```sh
npm ci
npm run build
npm start
```

Abra http://localhost:3000. Depois de editar a interface, execute `npm run build` novamente. O backend serve o resultado de `dist`.

```sh
npm test
```

Os testes criam contas e espaços temporários e verificam sessões, convites, permissões e isolamento da sinalização entre tenants.

## Railway

O Dockerfile faz o build da interface e inicia o servidor. `railway.json` configura healthcheck e uma única réplica.

1. Conecte este repositório à branch `main` no Railway.
2. Anexe um volume persistente em `/data` **antes de cadastrar usuários reais**.
3. Gere um domínio HTTPS. O app lê `RAILWAY_PUBLIC_DOMAIN` automaticamente; para domínio próprio, configure `APP_ORIGIN=https://seu-dominio`.
4. Defina `NODE_ENV=production` e `DATA_DIR=/data` (já são os padrões da imagem).
5. Acesse o app, crie sua conta e seu espaço, e convide os membros.

Não coloque senhas, bancos ou arquivos `.env` no Git. Faça backup do volume. A arquitetura usa uma única instância; múltiplas réplicas exigem migrar SQLite para Postgres e adicionar um adaptador compartilhado do Socket.IO.

## TURN e compatibilidade

O WebRTC tenta conexão direta com STUN. Para redes restritivas, configure um serviço TURN externo com credenciais temporárias compatíveis com o mecanismo HMAC do coturn:

- `TURN_URLS`: URLs separadas por vírgula, por exemplo `turn:turn.example.com:3478,turns:turn.example.com:5349`.
- `TURN_SECRET`: o `static-auth-secret` do servidor TURN. É usado apenas no backend para assinar credenciais de 1 hora.

Não exponha a chave TURN no frontend. O Railway hospeda a aplicação e a sinalização; não substitui um relay TURN com suporte UDP/TCP.

Recomendado: Chrome/Edge no computador, HTTPS e fones de ouvido. O navegador solicita o microfone ao entrar e uma tela/janela ao compartilhar. Compartilhamento de tela no celular depende do navegador. O compartilhamento solicita também áudio da guia ou do sistema. Na janela do navegador, escolha a guia e marque **Compartilhar áudio da guia**; para tela inteira, ative o áudio do sistema se essa opção estiver disponível. Se o navegador retornar apenas vídeo, o app informa que a transmissão está sem som. O som compartilhado e a voz usam trilhas independentes: silenciar o microfone não silencia a guia. O app não reproduz localmente o som que você está compartilhando, para evitar retorno. A câmera só é solicitada ao clicar em Ativar câmera durante uma chamada. Desligar a câmera ou sair encerra a captura. O tema é uma preferência deste navegador. A imagem de perfil é recortada ao centro e reduzida para 256 × 256 antes de ser salva na conta; aparece nas listas de membros e nas chamadas. Aceita JPG, PNG e WebP de até 5 MB na seleção.

## Escopo da primeira versão

Sem gravação, envio de e-mail, recuperação de senha ou verificação de e-mail. Convites são compartilhados manualmente. A interface e as regras de isolamento têm testes locais; uma chamada real em redes diferentes exige validação com dois dispositivos e, conforme a rede, TURN.

## Salas e canais

Clique nos três pontos ao lado da sala ou do canal para mudar o nome ou excluir. Apenas o administrador vê essas opções; o servidor verifica as mesmas permissões. O botão + em Canais de texto cria um canal. Todos os membros do espaço podem ler e escrever nos seus canais, inclusive durante uma chamada de voz. Mensagens têm até 2.000 caracteres, são armazenadas no mesmo volume SQLite e carregam as 50 mais recentes com opção de abrir o histórico anterior. A interface busca novas mensagens a cada 3 segundos e atualiza a lista de canais a cada 8 segundos enquanto a página está visível.
