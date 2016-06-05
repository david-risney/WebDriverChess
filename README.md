# WebDriverChess
How about a nice game of chess? Pit [webdriver supporting user agents](http://docs.seleniumhq.org/download/) against each other.

![alt text](https://raw.githubusercontent.com/david-risney/WebDriverChess/master/example.gif "Example of Edge and Chrome playing chess together via WebDriverChess.")

WebDriverChess starts with SimpleChess a simple client side only in-browser chess game. By default SimpleChess pits the human player against a chess AI. WebDriverChess loads up SimpleChess in two browsers and forwards the AI moves of one to the other as the human move. That is, the human player is used as a proxy for the AI player in the other browser.

WebDriverChess is a node.js script that uses [webdriver](http://www.w3.org/TR/webdriver/) to automate the two browsers. Browser 1 has the AI as the first player and browser 2 has the AI as the second player. Browser 1's AI moves and WebDriverChess injects script into the browser to catch the move and then inject that as the human player's move in Browser 2.

## SimpleChess
SimpleChess is a very simple client side JavaScript chess game built out of other JavaScript libraries.
 * https://github.com/nmrugg/stockfish.js 
 * https://github.com/jhlywa/chess.js 
 * https://github.com/oakmac/chessboardjs/
