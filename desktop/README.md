# Link para Windows

Aplicativo para Windows 10/11 de 64 bits com janela própria, logo Link, login persistente e instalador por usuário, sem necessidade de Node.js no computador de quem instala. O serviço continua em https://link-voice-production.up.railway.app/ e exige internet.

## Instalar

Baixe `Link-Setup-1.0.0.exe` na release `windows-v1.0.0` do repositório e execute. O instalador cria atalhos na área de trabalho e no menu Iniciar. Entre com a mesma conta do site. Fechar a janela encerra a chamada.

Ao compartilhar, escolha uma tela ou janela no seletor do aplicativo. A caixa de áudio é opcional e transmite o som do computador no Windows; não equivale ao áudio isolado de uma guia do Chrome. O app mantém o controle separado de voz, transmissão, música e efeitos.

O instalador inicial não possui assinatura Authenticode. Certificados e publicação na Microsoft Store não estão configurados.

## Desenvolvimento

```powershell
cd desktop
npm ci
npm test
npm start
```

## Gerar instalador

```powershell
npm run dist
```

Saída: `desktop/dist/Link-Setup-1.0.0.exe`. O workflow **Windows App** compila em Windows, preserva o instalador como artifact e publica o arquivo na release da versão. Para uma nova versão nativa, aumente `version` no `desktop/package.json` e atualize o lockfile. Mudanças no site aparecem ao recarregar ou reabrir o aplicativo.

O processo principal não expõe Node.js ao site. O único preload é o seletor local de tela, com IPC limitado a listar e selecionar uma fonte de captura. Links externos HTTPS abrem no navegador padrão.
