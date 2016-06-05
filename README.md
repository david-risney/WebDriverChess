# WebDriverChess
How about a nice game of chess? Pit [webdriver supporting user agents](http://docs.seleniumhq.org/download/) against each other.

![alt text](https://raw.githubusercontent.com/david-risney/WebDriverChess/master/example.gif "Example of Edge and Chrome playing chess together via WebDriverChess.")

WebDriverChess starts with SimpleChess a simple client side only in-browser chess game. By default SimpleChess pits the human player against a chess AI. WebDriverChess loads up SimpleChess in two browsers and forwards the AI moves of one to the other as the human move. That is, the human player is used as a proxy for the AI player in the other browser.

WebDriverChess is a node.js script that uses [webdriver](http://www.w3.org/TR/webdriver/) to automate the two browsers. Browser 1 has the AI as the first player and browser 2 has the AI as the second player. Browser 1's AI moves and WebDriverChess injects script into the browser to catch the move and then inject that as the human player's move in Browser 2. The time the AI gets is fixed so the faster a browser can execute the AI's script, the better that browser will perform in the game.

## SimpleChess
SimpleChess is a very simple client side JavaScript chess game built out of other JavaScript libraries.
 * https://github.com/nmrugg/stockfish.js 
 * https://github.com/jhlywa/chess.js 
 * https://github.com/oakmac/chessboardjs/

## Browser Face Off
I got the webdriver executables for Chrome, FireFox, Internet Explorer, and Edge and ran them all under WebDriverChess against one another. I also got the webdriver executable for Opera, but Opera hangs when running under WebDriverChess so is not included here.

I ran all pairs of browsers in WebDriverChess, each pair 10 times and alternating player 1 and 2.

Browser | Wins
--------|-----
Edge 25.10586 (EdgeHTML 13.10586) | 23
Firefox Nightly 49.0a1 | 21
IE 11.306.10586 | 7
None | 5
Chrome  51.0.2704.79m | 4

The AI in SimpleChess is StockFish which is asm.js based. Accordingly the browsers with full asm.js support, Edge and Firefox, have a distinct advantage. Otherwise the amount of time the AI gets is fixed so the faster a browser runs the better it should perform. I did not expect IE 11 to do better than Chrome but I've rerun several times and get similar results. None means the match resulted in a draw.

The results of the individual matches:

White | Black | Winner
------|-------|--------
chrome | ie | ie
chrome | ie | chrome
chrome | ie | None
chrome | ie | chrome
chrome | ie | chrome
chrome | edge | edge
chrome | edge | edge
chrome | edge | edge
chrome | edge | edge
chrome | edge | edge
chrome | firefox | firefox
chrome | firefox | None
chrome | firefox | None
chrome | firefox | firefox
chrome | firefox | firefox
edge | ie | edge
edge | ie | edge
edge | ie | edge
edge | ie | edge
edge | ie | edge
edge | chrome | edge
edge | chrome | edge
edge | chrome | edge
edge | chrome | edge
edge | chrome | edge
edge | firefox | None
edge | firefox | firefox
edge | firefox | firefox
edge | firefox | firefox
edge | firefox | edge
firefox | ie | firefox
firefox | ie | firefox
firefox | ie | ie
firefox | ie | firefox
firefox | ie | firefox
firefox | edge | None
firefox | edge | edge
firefox | edge | firefox
firefox | edge | firefox
firefox | edge | edge
firefox | chrome | chrome
firefox | chrome | firefox
firefox | chrome | firefox
firefox | chrome | firefox
firefox | chrome | firefox
ie | edge | edge
ie | edge | edge
ie | edge | edge
ie | edge | edge
ie | edge | edge
ie | chrome | ie
ie | chrome | ie
ie | chrome | ie
ie | chrome | ie
ie | chrome | ie
ie | firefox | firefox
ie | firefox | firefox
ie | firefox | firefox
ie | firefox | firefox
ie | firefox | firefox
