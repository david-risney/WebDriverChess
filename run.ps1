param(
    [ValidateSet("edge", "chrome", "firefox", "opera", "ie")] [string] $White = "edge",
    [ValidateSet("edge", "chrome", "firefox", "opera", "ie")] [string] $Black = "chrome");

$configs = @{
    ie =        "Start-Process -FilePath `"C:\Program Files (x86)\Microsoft Web Driver\IEDriverServer.exe`" -ArgumentList `"/port={0}`";";
    edge =      "Start-Process -FilePath `"C:\program files (x86)\Microsoft Web Driver\MicrosoftWebDriver.exe`" -ArgumentList `"--verbose --port={0}`";";
    chrome =    "Start-Process -FilePath `"C:\program files (x86)\Microsoft Web Driver\chromedriver.exe`" -ArgumentList `"--verbose --port={0}`";";
    opera =     "Start-Process -FilePath `"C:\program files (x86)\Microsoft Web Driver\operadriver.exe`" -ArgumentList `"--verbose --port={0}`";";
    firefox =   "Start-Process -FilePath `"C:\program files (x86)\Microsoft Web Driver\wires.exe`" -ArgumentList '-b `"C:\Program Files\nightly\firefox.exe`" --webdriver-port {0}';";
};

ps | ?{ 
    $psName = $_.name;
    @(
        "node",
        "MicrosoftEdge*", "MicrosoftWebDriver",
        "chrome", "chromedriver",
        "opera", "operadriver",
        "firefox", "wires",
        "iexplore", "IEDriverServer"
    ) | ?{ $psName -like $_; }
} | kill;

$whitePort = 17557;
$blackPort = 17558;
$chessPort = 17559;

Start-Process -FilePath $env:UserProfile\appdata\roaming\npm\http-server.cmd -WorkingDirectory $env:UserProfile\development\webdriverchess\simplechess -ArgumentList "-p $chessPort"
iex ($configs[$White] -f $whitePort);
iex ($configs[$Black] -f $blackPort);
node driver.js http://localhost:$whitePort http://localhost:$blackPort http://localhost:$chessPort
