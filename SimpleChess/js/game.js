(function (root) {
    "use strict";
    // Player contract:
    //  moveAsync(move) returns Promise(move)
    // Given the previous move (or undefined to start the game).
    // Check if the previous move is gameOver
    // Returns its next move.
    
    // move contract:
    //  string gameOver
    //  string boardFen
    //  string moveSan
    //  int playerIndex

    root.playerFactories = [
        RandomPlayer,
        StockfishPlayer,
        UserAgentPlayer,
        InvokePlayer
    ];
    root.playerFactories["random"] = RandomPlayer;
    root.playerFactories["stockfish"] = StockfishPlayer;
    root.playerFactories["human"] = UserAgentPlayer;
    root.playerFactories["webdriver"] = InvokePlayer;

    function BufferedPromiseChannel () {
        var buffer = [];
        var waitForValues = null; // Only non-null if buffer is empty and someone is waiting.

        this.addToBack = function (value) {
            if (waitForValues) {
                waitForValues.resolve(value);
                waitForValues = null;
            }
            else {
                buffer.push(value);
            }
        };

        this.removeFromFrontAsync = function () {
            if (buffer.length) {
                return Promise.resolve(buffer.splice(0, 1)[0]);
            }
            else {
                if (!waitForValues) {
                    waitForValues = new Deferral();
                }
                return waitForValues.promise;
            }
        };
    }

    // Run this as a part of global script to ensure it exists for
    // both InvokePlayer and webdriver to use, no matter who gets there
    // first.
    var invokerCommunication = new (function () {
        var channel0 = new BufferedPromiseChannel();
        var channel1 = new BufferedPromiseChannel();

        root.wdl = root.wdl === undefined ? [] : root.wdl;

        // Provide a nextMove and get a previousMove
        this.resolveNextMoveAsync = (function (nextMove) {
            if (nextMove) {
                root.wdl.push("0 resolveNextMoveAsync " + nextMove + " " + JSON.stringify(nextMove));
                console.log("0 resolveNextMoveAsync " + nextMove + " " + JSON.stringify(nextMove));
                channel0.addToBack(nextMove);
            }
            return channel1.removeFromFrontAsync();
        }).bind(this);

        // Provide a previousMove and get a nextMove
        this.resolvePreviousMoveAsync = (function (previousMove) {
            if (previousMove) {
                root.wdl.push("1 resolvePreviousMoveAsync " + previousMove + " " + JSON.stringify(previousMove));
                console.log("1 resolvePreviousMoveAsync " + previousMove + " " + JSON.stringify(previousMove));
                channel1.addToBack(previousMove);
            }
            return channel0.removeFromFrontAsync();
        }).bind(this);
    })();
    root.invokerCommunication = invokerCommunication;

    function InvokePlayer(game) {
        this.moveAsync = function (previousMove) {
            root.wdl.push("UA resolving previousmove: " + previousMove + " " + JSON.stringify(previousMove));
            console.log("UA resolving previousmove: " + previousMove + " " + JSON.stringify(previousMove));
            return invokerCommunication.resolvePreviousMoveAsync(previousMove).then(function (nextMove) {
                root.wdl.push("UA got nextmove: " + nextMove + " " + JSON.stringify(nextMove));
                console.log("UA got nextmove: " + nextMove + " " + JSON.stringify(nextMove));
                return nextMove;
            });
        };
    }

    function StockfishPlayer(game) {
        var chess = new Chess();
        var longAlgNotationRegExp = /[KkQqRrBbNnSsFf]?([a-h][1-8])x?([a-h][1-8])(e\.p\.|[KkQqRrBbNnSsFf])?/
        var worker = new Worker("js/stockfish6.js");
        var initAsync = nextEventAsync(worker, "message", function (eventArg) {
            return eventArg.data === "uciok";
        });

        var originalPostMessage = worker.postMessage.bind(worker);
        worker.postMessage = function (msg) {
            console.log(" -> " + JSON.stringify(msg));
            originalPostMessage(msg);
        };
        worker.addEventListener("message", function (eventArg) {
            console.log(" <- " + JSON.stringify(eventArg.data));
        });

        worker.postMessage("uci");

        this.moveAsync = (function (previousMove) {
            return initAsync.then((function () {
                var result = nextEventAsync(worker, "message", function (eventArg) {
                    return eventArg.data.startsWith("bestmove ");
                });

                if (previousMove) {
                    worker.postMessage("position fen " + previousMove.boardFen);
                }
                else {
                    worker.postMessage("position startpos");
                }
                worker.postMessage("go movetime " + Math.ceil(game.options.plyTime / 1000));

                return result.then(function (eventArg) {
                    if (previousMove) {
                        chess.load(previousMove.boardFen);
                    }
                    var moveLan = eventArg.data.split(" ")[1];
                    var results = longAlgNotationRegExp.exec(moveLan);
                    var moveObj = {
                        from: results && results[1],
                        to: results && results[2],
                        promotion: results && results[3]
                    }
                    if (results) {
                        chess.move(moveObj);
                    }
                    return {
                        moveSan: moveObj,
                        boardFen: chess.fen(),
                        gameOver: game.chessToGameOverString(chess),
                        playerIndex: -1
                    };
                });
            }).bind(this));
        }).bind(this);
    }

    function UserAgentPlayer(game) {
        var chess = new Chess();
        this.moveAsync = (function (previousMove) {
            var deferral = new Deferral();

            if (previousMove) {
                chess.move(previousMove.moveSan);
            }

            game.board.onDrop = function (source, target, piece, newPosition, oldPosition, currentOrientation) {
                var moveAsObject = {from: source, to: target};
                var prettyMove = chess.move(moveAsObject);
                if (prettyMove) {
                    game.board.onDrop = null;
                    deferral.resolve({
                        boardFen: chess.fen(),
                        moveSan: prettyMove.san,
                        gameOver: game.chessToGameOverString(chess),
                        playerIndex: -1
                    });
                }
                else {
                    return "snapback";
                }
            };

            return deferral.promise;
        }).bind(this);
    }

    function RandomPlayer(game) {
        var chess = new Chess();
        this.moveAsync = (function (previousMove) {
            var myMove = {
                gameOver: previousMove && previousMove.gameOver,
                moveSan: "",
                boardFen: "",
                playerIndex: -1
            };
    
            if (previousMove) {
                chess.move(previousMove.moveSan);
            }

            if (!previousMove || !previousMove.gameOver) {
                var moves = chess.moves();
                myMove.moveSan = moves[Math.floor(Math.random() * moves.length)];
                chess.move(myMove.moveSan);
                myMove.boardFen = chess.fen();
                myMove.gameOver = game.chessToGameOverString(chess);
            }
    
            return timeoutAsync(1000, myMove);
        }).bind(this);
    }
    
    function Game(boardId, gameOptions) {
        function normalizeGameOptions(gameOptions) {
            gameOptions = gameOptions || {};
            gameOptions = JSON.parse(JSON.stringify(gameOptions));
            gameOptions.plyTime = gameOptions.plyTime || 5000;

            gameOptions.players = [];
            gameOptions.players.push({
                name: gameOptions.p0Name || "white",
                type: gameOptions.p0Type || "human"
            });
            gameOptions.players.push({
                name: gameOptions.p1Name || "black",
                type: gameOptions.p1Type || "random"
            });
            return gameOptions;
        }
    
        gameOptions = normalizeGameOptions(gameOptions);
    
        var onDrop = (function () {
            if (this.board.onDrop) {
                return this.board.onDrop.apply(this.board, arguments);
            }
            else {
                return "snapback";
            }
        }).bind(this);

        var boardConfig = {
            pieceTheme: "/img/chesspieces/wikipedia/{piece}.png",
            position: "start",
            showNotation: true,
            showErrors: "console",
            draggable: true,
            onDrop: onDrop
        };
        this.options = gameOptions;
        this.board = new ChessBoard(boardId, boardConfig);
        this.history = [];
        this.players = gameOptions.players.map((function (description) {
            var player = JSON.parse(JSON.stringify(description));
            player.agent = new root.playerFactories[player.type](this);
            return player;
        }).bind(this));
    
        this.gameLoopAsync = (function (previousMove) {
            var currentPlayerIndex = this.history.length % this.players.length;
            var currentPlayer = this.players[currentPlayerIndex];
            var nextPlayer = this.players[(currentPlayerIndex + 1) % this.players.length];
            var statusElement = document.getElementById("status");
    
            statusElement.textContent = "Waiting for " + currentPlayer.name;
            return currentPlayer.agent.moveAsync(previousMove).then((function (currentPlayersMove) {
                currentPlayersMove.playerIndex = currentPlayerIndex;
                console.log(JSON.stringify(currentPlayersMove));
                this.history.push(currentPlayersMove);
                this.board.position(currentPlayersMove.boardFen, true);

                if (!currentPlayersMove.gameOver) {
                    return this.gameLoopAsync(currentPlayersMove);
                } else {
                    console.log("game over found!!!");
                    // inform the other player that the game is over but no need to wait.
                    nextPlayer.agent.moveAsync(currentPlayersMove);
                    return currentPlayersMove;
                }
            }).bind(this));
        }).bind(this);

        this.chessToGameOverString = (function (chess) {
            var gameOver;
            var playerIndex = (chess.turn() === "b" ? 0 : 1);
            if (chess.game_over()) {
                gameOver = "Gameover: " + this.players[playerIndex].name + " wins!";
                if (chess.in_checkmate()) {
                    gameOver = "Checkmate: " + this.players[playerIndex].name + " wins!";
                }
                else if (chess.in_stalemate()) {
                    gameOver = "Draw: stalemate";
                }
                else if (chess.insufficient_material()) {
                    gameOver = "Draw: insufficient material";
                }
                else if (chess.in_threefold_repetition()) {
                    gameOver = "Draw: threefold repetition";
                }
                else if (chess.in_draw()) {
                    gameOver = "Draw";
                }
            }

            return gameOver;
        }).bind(this);
    }
    root.Game = Game;

})(this);
