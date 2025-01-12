import { Scene } from 'phaser';
import GameService from '../services/gameService';
import Colors from '../constants';

export class Loading extends Scene {
    constructor() {
        super('Loading');
    }

    init(data) {
        this.gameCode = data.gameCode;
        this.player = data.player;
        this.isCreateGame = data.buttonClick === "create" ? true : false;
        this.gameService = new GameService('https://api20240727112536.azurewebsites.net');
        this.gameLoaded = false;
    }

    preload() {
        this.isMobile =
            this.sys.game.device.os.android ||
            this.sys.game.device.os.iOS ||
            this.sys.game.device.os.iPad ||
            this.sys.game.device.os.iPhone;

        this.loadingText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, 'Loading', {
            fontSize: '32px',
            fontFamily: 'standard',
            color: Colors.WHITE.anchor,
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
            this.updatePlayerAndPoll();
        }

        this.load.audio('tileSelect', 'assets/sounds/tileSelect.wav');
        this.load.audio('wordSuccess', 'assets/sounds/wordSuccess.wav');
        this.load.audio('wordFail', 'assets/sounds/wordFail.wav');
        this.load.audio('buttonSelect2', 'assets/sounds/buttonSelect2.wav');
    }

    async createGameAndPoll() {
        try {
            const response = await this.gameService.create(this.player.id, this.player.nickname);
            this.gameCode = response.code;
            this.gameLoaded = true;
            this.pollingTimer = this.time.addEvent({
                delay: 3000,
                callback: async () => {
                    try {
                        const gameData = await this.gameService.get(this.gameCode);
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
                fontFamily: 'standard',
                color: Colors.GREEN.anchor,
                backgroundColor: Colors.BLACK.anchor,
                padding: { x: 10, y: 5 }
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.gameService.update({status: 'IN_PROGRESS'}, this.gameCode)
                    .then(gameResponse => {
                        this.startGameScene(gameResponse);
                    })
                    .catch(error => {
                        console.error('Error starting game:', error);
                    });
            });

            this.gameCodeText = this.add.text(this.startButton.x - 170, this.startButton.y - 55, 'Code: ' + response.code, {
                fontSize: '28px',
                fontFamily: 'standard',
                color: Colors.WHITE.anchor,
                backgroundColor: Colors.BLACK.anchor,
                padding: { x: 10, y: 5 }
            });

        } catch (error) {
            console.error('Error creating game:', error);
        }
    }

    async updatePlayerAndPoll() {
        try {
            await this.gameService.updatePlayers({
                gameId: this.gameCode,
                id: this.player.id,
                name: this.player.nickname,
                score: 0,
            });

            this.pollingTimer = this.time.addEvent({
                delay: 3000,
                callback: async () => {
                    try {
                        const gameData = await this.gameService.get(this.gameCode);
                        this.gameLoaded = true;
                        if (gameData.status === 'IN_PROGRESS') {
                        this.gameService.get(this.gameCode)
                            .then(gameResponse => {
                                this.startGameScene(gameResponse);
                            })
                            .catch(error => {
                                console.error('Error starting game:', error);
                            });
                        }
                        else if(gameData.status === 'DONE') {
                            this.pollingTimer.remove();
                            this.errorText = this.add.text(this.isMobile ? this.scale.width / 2 - 200 : this.scale.width / 2 - 320, this.scale.height / 2, 'Unable to join this game', {
                                fontSize: this.isMobile ? '16px' : '28px',
                                fontFamily: 'standard',
                                color: Colors.RED.anchor,
                                backgroundColor: Colors.BLACK.anchor,
                                padding: { x: 10, y: 5 }
                            });
                            console.log('Game: ' + gameData.code + ' is currently in state of DONE and cannot be joined');
                        }
                        else{
                            this.renderPlayers(gameData.players);
                        }
                    } catch (error) {
                        console.error('Error fetching game data:', error);
                    }
                },
                callbackScope: this,
                loop: true
            });
        } catch (error) {
            console.error('Error updating player:', error);
        }
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
                { fontSize: this.isMobile ? '16px' : '20px', fontFamily: 'standard', color: Colors.WHITE.anchor }
            ).setOrigin(0.5);
            
            this.playersTextGroup.add(playerText);
        });
    }

    startGameScene(gameResponse) {
        if (this.pollingTimer) {
            this.pollingTimer.remove();
        }
        this.sound.play('buttonSelect2');
        this.scene.stop('Loading');
        this.scene.start('Game', { game: gameResponse, player: this.player });
    }

    updateLoadingText() {
        this.dotCount = (this.dotCount + 1) % 4;
        let dots = '.'.repeat(this.dotCount);

        if (this.gameLoaded) {
            this.loadingText.setText(`Waiting${dots}`);
        } else {
            this.loadingText.setText(`Loading${dots}`);
        }
    }
}