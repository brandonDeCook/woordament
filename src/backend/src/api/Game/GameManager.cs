﻿using System.Text.Json;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace Api.Game;

public class GameManager
{
    private readonly BoardManager _boardManager;
    private readonly BlobContainerClient _gamesBlobContainerClient;
    private const string _codeCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public GameManager(BlobServiceClient blobServiceClient, BoardManager boardManager)
    {
        _boardManager = boardManager ?? throw new ArgumentNullException(nameof(boardManager));
        _gamesBlobContainerClient = blobServiceClient.GetBlobContainerClient("games");
    }

    public async Task<Game> Create(string hostName, Guid hostId)
    {
        var board = await _boardManager.GetRandomBoard().ConfigureAwait(false);

        var random = new Random(DateTime.Now.Millisecond);
        var code = new string(Enumerable.Repeat(_codeCharacters, 5)
            .Select(s => s[random.Next(s.Length)]).ToArray());

        var game = new Game([new Player(hostId, hostName, PlayerType.HOST, 0)], GameStatus.WAITING, board, code, Guid.NewGuid());

        _ = await _gamesBlobContainerClient.GetBlobClient($"{code}.json")
            .UploadAsync(BinaryData.FromObjectAsJson(game, GameJsonSerializerOptions.Default), overwrite: true);

        return game;
    }

    public async Task<Game?> Update(GameStatus status, string code)
    {
        var game = await Get(code).ConfigureAwait(false);
        if (game is null)
        {
            return null;
        }

        if (game.Status is GameStatus.WAITING && status is GameStatus.IN_PROGRESS)
        {
            var updatedGame = game with { Status = status };
            _ = await _gamesBlobContainerClient.GetBlobClient($"{code}.json")
                .UploadAsync(BinaryData.FromObjectAsJson(updatedGame, GameJsonSerializerOptions.Default), overwrite: true);

            return updatedGame;
        }

        throw new ArgumentException("Invalid Game state change");
    }

    public async Task<Game?> Get(string code)
    {
        var blobClient = _gamesBlobContainerClient.GetBlobClient($"{code}.json");
        if (!await blobClient.ExistsAsync().ConfigureAwait(false))
        {
            return null;
        }

        Response<BlobDownloadResult>? downloadedGameBlob = await blobClient.DownloadContentAsync().ConfigureAwait(false);

        return JsonSerializer.Deserialize<Game>(downloadedGameBlob.Value.Content, GameJsonSerializerOptions.Default);
    }

    public async Task<Game?> UpdatePlayer(string code, Guid playerId, string name, double score)
    {
        var game = await Get(code).ConfigureAwait(false);
        if (game is null)
        {
            return null;
        }

        var result = game.Players
            .Select((player, idx) => new { Player = player, Index = idx })
            .FirstOrDefault(x => x.Player.Id == playerId);
        if (result is null)
        {
            game.Players.Add(new Player(playerId, name, PlayerType.GUEST, score));
        }
        else
        {
            var updatedPlayer = result.Player with { Score = score, Name = name };
            game.Players[result.Index] = updatedPlayer;
        }

        if (!game.Players.Any(x => x.Score <= 0))
        {
            game = game with { Status = GameStatus.DONE };
        }

        _ = await _gamesBlobContainerClient.GetBlobClient($"{code}.json")
            .UploadAsync(BinaryData.FromObjectAsJson(game, GameJsonSerializerOptions.Default), overwrite: true);

        return game;
    }
}