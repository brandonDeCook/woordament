class Player {
    constructor(id, name, type, score) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.score = score;
    }
}

class Board {
    constructor(wordList, tiles, id) {
        this.wordList = wordList;
        this.tiles = tiles;
        this.id = id;
    }
}

class GameResponse {
    constructor(players, status, board, code, id) {
        this.players = players;
        this.status = status;
        this.board = board;
        this.code = code;
        this.id = id;
    }
}

export default class GameService {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    async getGameByIdAsync(gameId) {
        const url = `${this.baseURL}/api/games/${gameId}`;
    
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            const players = data.players.map(player => new Player(player.id, player.name, player.type, player.score));
            const board = new Board(data.board.wordList, data.board.tiles, data.board.id);
            const gameResponse = new GameResponse(players, data.status, board, data.code, data.id);
    
            return gameResponse;
        } catch (error) {
            console.error('Error fetching game:', error);
            throw error;
        }
    }
}