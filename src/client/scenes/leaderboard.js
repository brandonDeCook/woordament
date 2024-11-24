import { Scene } from 'phaser';

export class Leaderboard extends Scene {
    constructor() {
        super('Leaderboard');
    }

    preload() {
    }

    create() {
        const leaderboardData = {
            "players": [
                { "id": "cef0c7ae-be71-4ae3-b202-28faf6d7ecb5", "name": "defNotBrandon", "type": "HOST", "score": 9001 },
                { "id": "1ea7f13e-7e31-4095-8b63-7195e4894a94", "name": "maybeBrandon", "type": "GUEST", "score": 159.0 },
                { "id": "0b3d4189-29a2-4517-8d07-a3f079269607", "name": "flapBird", "type": "GUEST", "score": 15 },
                { "id": "93d3f36c-c284-4da9-a4e0-a1d20fc17850", "name": "DarkClaw", "type": "GUEST", "score": 200 },
                { "id": "b121b406-088b-46fd-8158-de6f21acf977", "name": "DarkViper", "type": "GUEST", "score": 187.5 }
            ]
        };

        const sortedPlayers = leaderboardData.players
            .map(player => ({
                ...player,
                name: player.name || "Anonymous" 
            }))
            .sort((a, b) => b.score - a.score);

        this.add.text(400, 50, "Leaderboard", {
            fontSize: "32px",
            color: "#ffffff",
            fontStyle: "bold",
        }).setOrigin(0.5);

        sortedPlayers.forEach((player, index) => {
            const rank = index + 1;
            const displayText = `${rank}. ${player.name} - ${player.score}`;
            this.add.text(200, 100 + index * 30, displayText, {
                fontSize: "24px",
                color: "#ffffff",
            });
        });
    }
}