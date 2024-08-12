using System.Diagnostics;
using System.Text.Json;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Caching.Memory;

namespace Api.Game;

public class BoardManager
{
    private readonly IMemoryCache _memoryCache;
    private readonly BlobContainerClient _boardsBlobContainerClient;

    public BoardManager(BlobServiceClient blobServiceClient, IMemoryCache memoryCache)
    {
        _memoryCache = memoryCache ?? throw new ArgumentNullException(nameof(memoryCache));
        _boardsBlobContainerClient = blobServiceClient.GetBlobContainerClient("boards");
    }

    public async Task<Board> GetRandomBoard()
    {
        if (!_memoryCache.TryGetValue("boardList", out List<Board>? boardList))
        {
            boardList = [];
            await foreach (BlobItem blobItem in _boardsBlobContainerClient.GetBlobsAsync())
            {
                BlobClient boardBlobClient = _boardsBlobContainerClient.GetBlobClient(blobItem.Name);
                Response<BlobDownloadResult>? downloadedBoardBlob =
                    await boardBlobClient.DownloadContentAsync().ConfigureAwait(false);
                Board? board = JsonSerializer.Deserialize<Board?>(downloadedBoardBlob.Value.Content, GameJsonSerializerOptions.Default);
                boardList.Add(board ?? throw new InvalidOperationException("Attempting to load null board"));
            }

            _memoryCache.Set("boardList", boardList, TimeSpan.FromHours(1));
        }

        Debug.Assert(boardList != null, nameof(boardList) + " != null");
        return boardList[new Random(Guid.NewGuid().GetHashCode()).Next(boardList.Count)];
    }
}