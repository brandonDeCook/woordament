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
        CreateGameRequest? createGameRequest = await request.ReadFromJsonAsync<CreateGameRequest>(GameJsonSerializerOptions.Default).ConfigureAwait(false);
        if (createGameRequest is null)
        {
            return new BadRequestResult();
        }

        return new OkObjectResult(await _gameManager.CreateGame(createGameRequest.HostName, createGameRequest.HostId).ConfigureAwait(false));
    }

    [Function(nameof(GetGame))]
    public async Task<ActionResult> GetGame([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "games/{Code}")] HttpRequest request, string code)
    {
        Game? game = await _gameManager.GetGame(code).ConfigureAwait(false);
        if (game is null)
        {
            return new NotFoundResult();
        }   
        return new OkObjectResult(game);
    }

    [Function(nameof(UpdateGamePlayers))]
    public async Task<ActionResult> UpdateGamePlayers(
        [HttpTrigger(AuthorizationLevel.Anonymous, "patch", Route = "games/{Code}/players")] HttpRequest request,
        string code)
    {
        UpdateGamePlayersRequest? updateGamePlayerRequest = await request
            .ReadFromJsonAsync<UpdateGamePlayersRequest>(GameJsonSerializerOptions.Default).ConfigureAwait(false);
        if (updateGamePlayerRequest is null)
        {
            return new BadRequestResult();
        }

        Game? game = await _gameManager
            .UpdatePlayer(code, updateGamePlayerRequest.Id, updateGamePlayerRequest.Name, updateGamePlayerRequest.Score)
            .ConfigureAwait(false);
        if (game is null)
        {
            return new NotFoundResult();
        }

        return new OkObjectResult(game);
    }
}