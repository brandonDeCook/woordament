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

public record Player(Guid Id, string Name, PlayerType Type, double Score, IReadOnlyList<string>? Words = null);

public record Game(IList<Player> Players, GameStatus Status, Board board, string Code, Guid Id);

public record Board(IReadOnlyDictionary<string, double> WordList, IList<IList<char>> Tiles, Guid Id, string? Theme = null);