namespace board_generator;

public record Board(IReadOnlyDictionary<string, double> WordList, char[,] Tiles, Guid Id)
{
    public Board(IReadOnlyDictionary<string, double> WordList, char[,] Tiles) : this(WordList, Tiles, Guid.NewGuid())
    {
    }
}