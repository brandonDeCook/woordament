using Azure.Storage.Blobs;
using board_generator;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using System.Text.Json;

using var driver = new ChromeDriver();

await driver.Navigate().GoToUrlAsync("https://wordament.douile.com/").ConfigureAwait(false);
await Task.Delay(2000);

// TODO: Generate tiles from ChatGPT

var tiles = new List<List<char>>()
{
    new() { 'u', 'y', 'g', 'r' },
    new() { 'c', 's', 'n', 'e' },
    new() { 'r', 'a', 's', 'n' },
    new() { 'g', 'a', 't', 's' }
};

for (var i = 1; i <= 16; i++)
{
    var inputBox = driver.FindElement(By.CssSelector($"input[aria-label='Tile {i} input']"));
    var zeroBasedIndex = i - 1;
    var row = zeroBasedIndex / 4;
    var col = zeroBasedIndex % 4;
    inputBox.SendKeys(tiles[row][col].ToString());
}

var outputRows = driver.FindElements(By.CssSelector("table.output-box tr"));
var words = new Dictionary<string, double>();

foreach (var row in outputRows)
{
    var cells = row.FindElements(By.TagName("td")).ToArray();
    if (cells.Length is 2)
    {
        var points = double.Parse(cells[0].Text.Trim('[', ']'));
        var word = cells[1].Text;
        words[word] = points;
    }
}

var board = new Board(words, tiles);

const string connectionString = "YourConnString";
const string containerName = "boards";
var blobName = $"{board.Id}.json";

var blobServiceClient = new BlobServiceClient(connectionString);
var containerClient = blobServiceClient.GetBlobContainerClient(containerName);
await containerClient.CreateIfNotExistsAsync();
var blobClient = containerClient.GetBlobClient(blobName);

using var ms = new MemoryStream();
JsonSerializer.Serialize(ms, board, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
ms.Position = 0;
await blobClient.UploadAsync(ms, overwrite: true);

driver.Quit();