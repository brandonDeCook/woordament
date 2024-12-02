import { Scene } from 'phaser';
import GameService from '../services/gameService';

export class Loading extends Scene {
    constructor() {
        super('Loading');
    }

    init(data) {
        this.gameCode = data.gameCode;
        this.player = data.player;
        this.isCreateGame = data.buttonClick == "create" ? true : false;
        this.gameService = new GameService('https://api20240727112536.azurewebsites.net');
    }

    preload() {
        this.loadingText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, this.isCreateGame ? 'Waiting' : 'Loading', {
            fontSize: '32px',
            color: '#ffffff',
        }).setOrigin(0.5);

        this.dotCount = 0;
        this.time.addEvent({
            delay: 400,
            callback: this.updateLoadingText,
            callbackScope: this,
            loop: true
        });

        if (this.isCreateGame) {
            this.createGameAndPoll();
        } else {
            this.updatePlayerAndStartGame();
        }
    }

    async createGameAndPoll() {
        try {
            var response = await this.gameService.createGame(this.player.id, this.player.nickname);
            this.gameCode = response.code;
            this.pollingTimer = this.time.addEvent({
                delay: 3000,
                callback: async () => {
                    try {
                        const gameData = await this.gameService.getGameByIdAsync(this.gameCode);
                        this.renderPlayers(gameData.players);
                    } catch (error) {
                        console.error('Error fetching game data:', error);
                    }
                },
                callbackScope: this,
                loop: true
            });

            this.startButton = this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'Start', {
                fontSize: '28px',
                color: '#00ff00',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.startGame();
            });

        } catch (error) {
            console.error('Error creating game:', error);
        }
    }

    updatePlayerAndStartGame() {
        this.gameService.updatePlayerByGame({
            gameId: this.gameCode,
            id: this.player.id,
            name: this.player.nickname,
            score: 0,
        }).then(response => this.startGameScene(response));
    }

    renderPlayers(players) {
        if (this.playersTextGroup) {
            this.playersTextGroup.clear(true, true);
        }
        
        this.playersTextGroup = this.add.group();
        
        players.forEach((player, index) => {
            const playerText = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2 + 100 + index * 30,
                `${player.name || 'Guest'} - Score: ${player.score}`,
                { fontSize: '20px', color: '#ffffff' }
            ).setOrigin(0.5);
            
            this.playersTextGroup.add(playerText);
        });
    }

    startGame() {
        if (this.pollingTimer) {
            this.pollingTimer.remove(); // Stop polling
        }
        this.gameService.getGameByIdAsync(this.gameCode)
            .then(gameResponse => {
                this.startGameScene(gameResponse);
            })
            .catch(error => {
                console.error('Error starting game:', error);
            });
    }

    startGameScene(gameResponse) {
        this.scene.stop('Loading');
        this.scene.start('Game', { game: gameResponse, player: this.player });
    }

    updateLoadingText() {
        this.dotCount = (this.dotCount + 1) % 4;
        let dots = '.'.repeat(this.dotCount);

        if (this.isCreateGame) {
            this.loadingText.setText(`Waiting${dots}`);
        } else {
            this.loadingText.setText(`Loading${dots}`);
        }
    }
}
