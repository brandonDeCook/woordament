import { Scene } from 'phaser';
import Utils from '../utils';

export class Menu extends Scene {
    constructor() {
        super('Menu');
        this.joinGameCodeInput = null;
        this.nicknameInput = null;
    }

    preload() {
        this.load.plugin(
            'rexinputtextplugin',
            'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexinputtextplugin.min.js',
            true
        );
        this.player = Utils.getPlayerFromLocalStorage();
        this.load.audio('buttonSelect', 'assets/sounds/buttonSelect.wav');
    }

    create() {
        const COLORS = {
            background: '#000000',
            textDefault: '#ffffff',
            textHover: '#ff0',
            inputBorder: { code: 'yellow', nickname: 'blue' },
            inputBackground: 'white',
            inputFontColor: 'black',
        };

        const FONT_SIZES = {
            title: '64px',
            button: '32px',
            input: '24px',
        };

        this.cameras.main.setBackgroundColor(COLORS.background);

        this.addCenteredText(this.scale.height / 4, 'Woo-rdament', FONT_SIZES.title);

        const createGameButton = this.createButton(
            this.scale.height / 2,
            'Create Game',
            this.handleCreateGame.bind(this),
            COLORS
        );

        const joinGameButtonYpos = createGameButton.y + 50;
        const joinGameButton = this.createButton(
            joinGameButtonYpos,
            'Join Game',
            this.handleJoinGame.bind(this),
            COLORS
        );

        const joinGameCodeInputYpos = joinGameButton.y + 40;
        this.joinGameCodeInput = this.createInputField(
            joinGameCodeInputYpos,
            'enter code',
            COLORS.inputBorder.code,
            COLORS
        );

        const nicknameButtonYpos = joinGameButton.y + 90;
        this.addCenteredText(nicknameButtonYpos, 'Nick Name', FONT_SIZES.button);

        const nicknameInputYpos = nicknameButtonYpos + 40;
        const nicknameDefaultText = this.player.nickname || 'enter name';
        this.nicknameInput = this.createInputField(
            nicknameInputYpos,
            nicknameDefaultText,
            COLORS.inputBorder.nickname,
            COLORS
        );

        this.nicknameInput.on('textchange', () => {
            if (this.nicknameInput.text.length > 9) {
                this.nicknameInput.text = this.nicknameInput.text.slice(0, 9);
            }
        });

        this.setupInputBlur(this.joinGameCodeInput);
        this.setupInputBlur(this.nicknameInput);

        this.nicknameInput.on('focus', () => {
            if (this.nicknameInput.text === 'enter name') {
                this.nicknameInput.text = '';
            }
        });
    }

    addCenteredText(y, text, fontSize) {
        this.add
            .text(this.scale.width / 2, y, text, { fontSize, color: '#ffffff' })
            .setOrigin(0.5);
    }

    createButton(y, text, callback, colors) {
        const button = this.add
            .text(this.scale.width / 2, y, text, {
                fontSize: '32px',
                color: colors.textDefault,
            })
            .setOrigin(0.5)
            .setInteractive();

        button.on('pointerover', () => button.setStyle({ fill: colors.textHover }));
        button.on('pointerout', () => button.setStyle({ fill: colors.textDefault }));
        button.on('pointerdown', callback);

        return button;
    }

    createInputField(y, placeholder, borderColor, colors) {
        return this.add
            .rexInputText(this.scale.width / 2, y, 140, 40, {
                type: 'textarea',
                text: placeholder,
                fontSize: '24px',
                borderColor,
                backgroundColor: colors.inputBackground,
            })
            .setFontColor(colors.inputFontColor)
            .setOrigin(0.5)
            .on('focus', (input) => {
                if (input.text === placeholder) {
                    input.text = '';
                }
            });
    }

    setupInputBlur(input) {
        this.input.on('pointerdown', () => input.setBlur());
    }

    handleCreateGame(){
        this.setupPlayer();

        this.sound.play('buttonSelect');
        this.scene.stop('Menu');
        this.scene.start('Loading', { gameCode: this.joinGameCodeInput.text, player: this.player, buttonClick: "create" });
    }

    handleJoinGame() {
        if (this.joinGameCodeInput.text === '' || this.joinGameCodeInput.text === 'enter code') {
            this.joinGameCodeInput.text = '1KPK0';
        }

        this.setupPlayer();

        this.sound.play('buttonSelect');
        this.scene.stop('Menu');
        this.scene.start('Loading', { gameCode: this.joinGameCodeInput.text.toUpperCase(), player: this.player, buttonClick: "join" });
    }

    setupPlayer(){
        if (this.nicknameInput.text === '' || this.nicknameInput.text === 'enter name') {
            this.nicknameInput.text = Utils.generateGameNickname();            
        }
        this.player.nickname = this.nicknameInput.text;

        if (this.player.id == null) {
            this.player.id = Utils.generateGUID();
        }

        Utils.setPlayerToLocalStorage(this.player.id, this.player.nickname);
    }
}
