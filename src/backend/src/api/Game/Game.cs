namespace Api.Game;

public enum GameStatus
{
    WAITING,
    IN_PROGRESS,
    DONE
}

public enum PlayerType
{
    HOST,
    GUEST
}

public record Player(Guid Id, string Name, PlayerType Type, double Score);

public record Game(IList<Player> Players, GameStatus Status, Board board, string code, Guid Id);

public record Board(IReadOnlyDictionary<string, double> WordList, IList<IList<char>> Tiles, Guid Id);