# Link — Voz e tela

Aplicativo web simples, multi-tenant, com contas individuais, salas de voz e compartilhamento de tela. Interface em português.

## Recursos

- Cadastro e login com e-mail e senha; hash scrypt, sessão aleatória e cookie HttpOnly.
- Cada espaço (tenant) possui membros e salas isolados. Uma conta pode participar de vários espaços.
- Administradores criam salas, geram e revogam convites e removem membros.
- Convites expiram em 24 horas, aceitam até 20 novos membros e só são armazenados como hash.
- Voz WebRTC, microfone, compartilhamento de tela e presença via Socket.IO. Até 6 conexões por sala.
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

Recomendado: Chrome/Edge no computador, HTTPS e fones de ouvido. O navegador solicita o microfone ao entrar e uma tela/janela ao compartilhar. Compartilhamento de tela no celular depende do navegador. Áudio do sistema não está incluído; voz vem do microfone.

## Escopo da primeira versão

Sem gravação, chat de texto, envio de e-mail, recuperação de senha ou verificação de e-mail. Convites são compartilhados manualmente. A interface e as regras de isolamento têm testes locais; uma chamada real em redes diferentes exige validação com dois dispositivos e, conforme a rede, TURN.
