import { Scene } from 'phaser';
import GameService from '../services/gameService';

export class Loading extends Scene {
    constructor() {
        super('Loading');
    }

    init(data){
        this.gameCode = data.gameCode;
        this.player = data.player;
    }

    preload() {
        this.loadingText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, 'Loading', {
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

        var gameService = new GameService('https://api20240727112536.azurewebsites.net');
        gameService.updatePlayerByGame({
            gameId: this.gameCode,
            id: this.player.id,
            name: this.player.nickname,
            score: 0,
        }).then(response => this.startGameScene(response));
    }

    startGameScene(gameResponse){
        this.scene.stop('Loading');
        this.scene.start('Game', {game: gameResponse});
    }

    updateLoadingText() {
        this.dotCount = (this.dotCount + 1) % 4;
        let dots = '.'.repeat(this.dotCount);
        this.loadingText.setText(`Loading${dots}`);
    }
}