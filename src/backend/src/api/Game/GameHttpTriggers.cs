using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Api.Game;

public class GameHttpTriggers
{
    private readonly ILogger<GameHttpTriggers> _logger;
    private readonly GameManager _gameManager;

    public GameHttpTriggers(ILogger<GameHttpTriggers> logger, GameManager gameManager)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _gameManager = gameManager ?? throw new ArgumentNullException(nameof(gameManager));
    }

    [Function(nameof(CreateGame))]
    public async Task<ActionResult> CreateGame([HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "games")] HttpRequest request)
    {
        var createGameRequest = await request.ReadFromJsonAsync<CreateGameRequest>(GameJsonSerializerOptions.Default).ConfigureAwait(false);
        return new OkObjectResult(await _gameManager.CreateGame(createGameRequest.HostName).ConfigureAwait(false));
    }

    [Function(nameof(GetGame))]
    public async Task<ActionResult> GetGame([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "games/{code}")] HttpRequest request, string code)
    {
        Game? game = await _gameManager.GetGame(code).ConfigureAwait(false);
        if (game is null)
        {
            return new NotFoundResult();
        }   
        return new OkObjectResult(game);
    }

    [Function(nameof(UpdatePlayers))]
    public async Task<ActionResult> UpdatePlayers([HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "games/{code}/players")] HttpRequest request, string code)
    {
        var updatePlayerRequest = await request.ReadFromJsonAsync<UpdatePlayersRequest>(GameJsonSerializerOptions.Default).ConfigureAwait(false);
        Game? game = await _gameManager.UpdatePlayer(code, updatePlayerRequest.Id, updatePlayerRequest.Name, updatePlayerRequest.Score)
            .ConfigureAwait(false);
        if (game is null)
        {
            return new NotFoundResult();
        }   
        return new OkObjectResult(game);
    }
}