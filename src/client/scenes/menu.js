import { Scene } from 'phaser';

export class Menu extends Scene {

    constructor() {
        super('Menu');
    }

    preload() {
        this.load.plugin('rexinputtextplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexinputtextplugin.min.js', true);
    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');

        this.add.text(this.scale.width / 2, this.scale.height / 4, 'Woo-rdament', {
            fontSize: '64px',
            color: '#ffffff',
        }).setOrigin(0.5);

        const createGameButton = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Create Game', {
            fontSize: '32px',
            color: '#ffffff',
        }).setOrigin(0.5).setInteractive();

        createGameButton.on('pointerover', () => {
            createGameButton.setStyle({ fill: '#ff0' });
        });

        createGameButton.on('pointerout', () => {
            createGameButton.setStyle({ fill: '#ffffff' });
        });

        createGameButton.on('pointerdown', () => {
        });

        const joinGameButton = this.add.text(this.scale.width / 2, this.scale.height / 1.5, 'Join Game', {
            fontSize: '32px',
            color: '#ffffff',
        }).setOrigin(0.5).setInteractive();

        joinGameButton.on('pointerover', () => {
            joinGameButton.setStyle({ fill: '#ff0' });
        });

        joinGameButton.on('pointerout', () => {
            joinGameButton.setStyle({ fill: '#ffffff' });
        });

        joinGameButton.on('pointerdown', () => {
            if(joinGameCodeInputText.text == '' || joinGameCodeInputText.text == 'enter code'){
                joinGameCodeInputText.text = '1KPK0';
            }
            this.scene.stop('Menu');
            this.scene.start('Loading', { gameCode: joinGameCodeInputText.text });
        });

        const joinGameCodeInputTextYpos = joinGameButton.y + 50;

        var joinGameCodeInputText = this.add.rexInputText(this.scale.width / 2, joinGameCodeInputTextYpos, 140, 40, {
            type: 'textarea',
            text: 'enter code',
            fontSize: '24px',
            borderColor: 'yellow',
            backgroundColor: 'white'
        }).setFontColor('black')
            .setOrigin(0.5)
            .on('focus', function (inputText) {
                joinGameCodeInputText.text = '';
            });

        this.input.on('pointerdown', function () {
            joinGameCodeInputText.setBlur();
        });

        joinGameCodeInputText.on('keydown', function (joinGameCodeInputText, e) {
            if ((joinGameCodeInputText.inputType !== 'textarea') && (e.key === 'Enter')) {
                joinGameCodeInputText.setBlur();
            }
        });
    }
}
