namespace board_generator;

public record Board(IReadOnlyDictionary<string, double> WordList, List<List<char>> Tiles, Guid Id)
{
    public Board(IReadOnlyDictionary<string, double> wordList, List<List<char>> tiles) : this(wordList, tiles, Guid.NewGuid())
    {
    }
}