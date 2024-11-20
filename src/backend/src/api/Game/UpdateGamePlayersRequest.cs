namespace Api.Game;

public record UpdateGamePlayersRequest(Guid Id, string Name, double Score = 0);