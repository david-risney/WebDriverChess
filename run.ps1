kill (@() + (ps "node") + 
    (ps "MicrosoftWebDriver") + (ps "MicrosoftEdge*") + 
    (ps "chromedriver") + (ps "chrome"));

Start-Process -FilePath $env:UserProfile\appdata\roaming\npm\http-server.cmd -WorkingDirectory $env:UserProfile\development\webdriverchess\simplechess
Start-Process -FilePath "C:\program files (x86)\Microsoft Web Driver\MicrosoftWebDriver.exe" -ArgumentList "--verbose";
Start-Process -FilePath "C:\program files (x86)\Microsoft Web Driver\chromedriver.exe" -ArgumentList "--verbose";

node driver.js http://localhost:17556 http://localhost:9515 http://localhost:8080
