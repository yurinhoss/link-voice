export async function requestMicrophone(mediaDevices) {
  if (!mediaDevices?.getUserMedia) {
    return {stream: null, notice: 'Microfone indisponível neste navegador. Você pode ouvir e compartilhar a tela. Para falar, use um navegador atualizado com HTTPS.'};
  }
  try {
    const stream = await mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}, video: false});
    return {stream, notice: ''};
  } catch (error) {
    const notices = {
      NotFoundError: 'Nenhum microfone foi encontrado. Você pode ouvir e compartilhar a tela. Conecte um microfone e clique no botão de microfone para ativá-lo.',
      DevicesNotFoundError: 'Nenhum microfone foi encontrado. Você pode ouvir e compartilhar a tela. Conecte um microfone e clique no botão de microfone para ativá-lo.',
      NotAllowedError: 'O acesso ao microfone não foi autorizado. Você pode ouvir e compartilhar a tela. Para falar, permita o microfone no navegador e clique no botão de microfone.',
      SecurityError: 'O navegador bloqueou o microfone. Você pode ouvir e compartilhar a tela. Verifique as permissões do site para falar.',
      NotReadableError: 'Não foi possível acessar o microfone. Ele pode estar em uso por outro aplicativo. Você pode ouvir e compartilhar a tela.',
      TrackStartError: 'Não foi possível acessar o microfone. Ele pode estar em uso por outro aplicativo. Você pode ouvir e compartilhar a tela.',
    };
    if (notices[error.name]) return {stream: null, notice: notices[error.name]};
    throw error;
  }
}
