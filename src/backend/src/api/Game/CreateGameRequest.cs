namespace Api.Game;

public record CreateGameRequest(Guid HostId, string HostName);