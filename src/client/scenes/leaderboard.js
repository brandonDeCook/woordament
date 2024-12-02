import { Scene } from 'phaser';
import GameService from '../services/gameService';

export class Leaderboard extends Scene {
    constructor() {
        super('Leaderboard');
        this.pollingInterval = 3000;
        this.pollingDuration = 180000;
        this.loadingDotCount = 1;
    }

    init(data) {
        this.game = data.game;
        this.player = data.player;
        this.polling = true;
    }

    preload() {}

    async create() {
        this.loadingText = this.add.text(400, 20, "Loading.", {
            fontSize: "24px",
            color: "#ffffff",
        }).setOrigin(0.5);

        this.time.addEvent({
            delay: 500,
            callback: this.updateLoadingText,
            callbackScope: this,
            loop: true,
        });

        this.titleText = this.add.text(400, 50, "Leaderboard", {
            fontSize: "32px",
            color: "#ffffff",
            fontStyle: "bold",
        }).setOrigin(0.5);

        await this.updatePlayerScore();

        await this.pollForLeaderboardUpdates();
    }

    updateLoadingText() {
        if (this.polling) {
            this.loadingDotCount = (this.loadingDotCount % 3) + 1;
            const dots = '.'.repeat(this.loadingDotCount);
            this.loadingText.setText(`Loading${dots}`);
        }
    }

    async pollForLeaderboardUpdates() {
        const gameService = new GameService('https://api20240727112536.azurewebsites.net');
        const startTime = Date.now();

        const poll = async () => {
            try {
                const response = await gameService.getGameByIdAsync(this.game.code);

                this.renderLeaderboard(response.players);

                if (response.status === "DONE") {
                    this.loadingText.setText("");
                    this.polling = false;
                    return;
                }

                if (Date.now() - startTime < this.pollingDuration && this.polling) {
                    setTimeout(poll, this.pollingInterval);
                } else {
                    this.loadingText.setText("Timeout");
                }
            } catch (error) {
                console.error("Error polling leaderboard updates:", error);
            }
        };

        await poll();
    }

    renderLeaderboard(players) {
        if (this.leaderboardTexts) {
            this.leaderboardTexts.forEach(text => text.destroy());
        }

        const sortedPlayers = players
            .filter(player => player.score > 0)
            .map(player => ({
                ...player,
                name: player.name || "Anonymous",
            }))
            .sort((a, b) => b.score - a.score);

        this.leaderboardTexts = sortedPlayers.map((player, index) => {
            const rank = index + 1;
            const displayText = `${rank}. ${player.name} - ${player.score}`;
            return this.add.text(200, 100 + index * 30, displayText, {
                fontSize: "24px",
                color: "#ffffff",
            });
        });
    }

    async updatePlayerScore() {
        try {
            const gameService = new GameService('https://api20240727112536.azurewebsites.net');
            const response = await gameService.updatePlayerByGame({
                gameId: this.game.code,
                id: this.player.id,
                name: this.player.nickname,
                score: this.player.score,
            });

            return response.players;
        } catch (error) {
            console.error("Failed to update player score:", error);
            return [];
        }
    }
}
