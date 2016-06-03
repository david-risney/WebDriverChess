param(
    [ValidateSet("edge", "chrome", "firefox", "opera")] [string] $White = "edge",
    [ValidateSet("edge", "chrome", "firefox", "opera")] [string] $Black = "chrome");

$configs = @{
    edge =      @(@("MicrosoftEdge*", "MicrosoftWebDriver"),    "Start-Process -FilePath `"C:\program files (x86)\Microsoft Web Driver\MicrosoftWebDriver.exe`" -ArgumentList `"--verbose --port={0}`";");
    chrome =    @(@("chrome", "chromedriver"),                  "Start-Process -FilePath `"C:\program files (x86)\Microsoft Web Driver\chromedriver.exe`" -ArgumentList `"--verbose --port={0}`";");
    opera =     @(@("opera", "operadriver"),                    "Start-Process -FilePath `"C:\program files (x86)\Microsoft Web Driver\operadriver.exe`" -ArgumentList `"--verbose --port={0}`";");
    firefox =   @(@("firefox", "wires"),                        "Start-Process -FilePath `"C:\program files (x86)\Microsoft Web Driver\wires.exe`" -ArgumentList '-b `"C:\Program Files\nightly\firefox.exe`" --webdriver-port {0}' ");
};

$White
$configs[$White];
$Black
$configs[$Black];

ps | ?{ 
    $psName = $_.name;
    @(
        "node",
        "MicrosoftEdge*", "MicrosoftWebDriver",
        "chrome", "chromedriver",
        "opera", "operadriver",
        "firefox", "wires"
    ) | ?{ $psName -like $_; }
} | kill;

$whitePort = 17557;
$blackPort = 17558;
$chessPort = 17559;

Start-Process -FilePath $env:UserProfile\appdata\roaming\npm\http-server.cmd -WorkingDirectory $env:UserProfile\development\webdriverchess\simplechess -ArgumentList "-p $chessPort"
iex ($configs[$White][1] -f $whitePort);
iex ($configs[$Black][1] -f $blackPort);
node driver.js http://localhost:$whitePort http://localhost:$blackPort http://localhost:$chessPort
