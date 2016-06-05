param(
    [ValidateSet("edge", "chrome", "firefox", "opera", "ie")] [string] $White = "edge",
    [ValidateSet("edge", "chrome", "firefox", "opera", "ie")] [string] $Black = "chrome");

$configs = @{
    ie =        @("Start-Process -FilePath `"C:\Program Files (x86)\Microsoft Web Driver\IEDriverServer.exe`" -ArgumentList `"/port={0}`";", "internet explorer");
    edge =      @("Start-Process -FilePath `"C:\program files (x86)\Microsoft Web Driver\MicrosoftWebDriver.exe`" -ArgumentList `"--verbose --port={0}`";", "edge");
    chrome =    @("Start-Process -FilePath `"C:\program files (x86)\Microsoft Web Driver\chromedriver.exe`" -ArgumentList `"--verbose --port={0}`";", "chrome");
    opera =     @("Start-Process -FilePath `"C:\program files (x86)\Microsoft Web Driver\operadriver.exe`" -ArgumentList `"--verbose --port={0}`";", "chrome");
    firefox =   @("Start-Process -FilePath `"C:\program files (x86)\Microsoft Web Driver\wires.exe`" -ArgumentList '-b `"C:\Program Files\nightly\firefox.exe`" --webdriver-port {0}';", "firefox");
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
} | kill -ErrorAction Ignore;

$whitePort = 17557;
$blackPort = 17558;
$chessPort = 17559;

Start-Process -FilePath $env:UserProfile\appdata\roaming\npm\http-server.cmd -WorkingDirectory $env:UserProfile\development\webdriverchess\simplechess -ArgumentList "-p $chessPort" ;
iex ($configs[$White][0] -f $whitePort);
iex ($configs[$Black][0] -f $blackPort);
$result = node driver.js http://localhost:$whitePort http://localhost:$blackPort http://localhost:$chessPort ;

if ($result -match ($configs[$White][1] + " wins")) {
	New-Object PSObject | Add-Member -PassThru Winner $White;
} elseif ($result -match ($configs[$Black][1] + " wins")) {
	New-Object PSObject | Add-Member -PassThru Winner $Black;
} else {
	New-Object PSObject | Add-Member -PassThru Winner "None";
}
