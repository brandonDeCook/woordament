namespace Api.Game;

public record UpdatePlayersRequest(Guid? Id, string Name, double Score = 0);