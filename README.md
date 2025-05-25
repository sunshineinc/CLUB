# Club Penguin Style 3D Game

Um jogo multiplayer 3D inspirado no Club Penguin, desenvolvido com Three.js e WebSocket.

## Requisitos

- Node.js (versão 14 ou superior)
- NPM (gerenciador de pacotes do Node.js)

## Configuração

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

## Executando o jogo

1. Inicie o servidor:
```bash
npm start
```

2. Abra seu navegador e acesse:
```
http://localhost:3000
```

## Controles

- Setas direcionais: Mover o pinguim
- P: Tirar screenshot
- Chat: Digite sua mensagem e pressione Enter ou clique em Enviar

## Recursos

- Multiplayer em tempo real
- Chat entre jogadores
- Personalização do pinguim
- Sistema de iglu
- Minigames
- Sistema de moedas
- Loja de itens

## Estrutura de arquivos

- `server.js`: Servidor WebSocket para multiplayer
- `game.js`: Lógica principal do jogo
- `index.html`: Interface do usuário
- `styles.css`: Estilos do jogo
- `assets/`: Pasta com recursos do jogo
  - `penguin.glb`: Modelo 3D do pinguim
  - `hat1.png`: Chapéu de inverno
  - `hat2.png`: Chapéu de festa
  - `hat3.png`: Coroa
  - `shirt1.png`: Camisa básica
  - `shirt2.png`: Camisa de festa
  - `suit.png`: Terno
  - `glasses.png`: Óculos
  - `scarf.png`: Cachecol
  - `bowtie.png`: Gravata borboleta
  - `chair.png`: Cadeira
  - `table.png`: Mesa
  - `bed.png`: Cama
  - `chest.png`: Baú

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request 