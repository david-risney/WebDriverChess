(function (root) {
    "use strict";

    var http = require("http");
    var url = require("url");
    var plyTimeInSeconds = 50;
    var verboseOut = false;

    function Deferral() {
        var that = this;
        that.promise = new Promise(function (s, e, p) {
            that.resolve = s;
            that.reject = e;
            that.notify = p;
        });
    };

    function timeoutAsync(delayInMs, promise) {
        var signal = new Deferral();

        setTimeout(function () {
            signal.resolve(promise);
        }, delayInMs);

        return signal.promise;
    }

    var retrifyPromiseFunction = function (promiseFunction, resultIsGoodCallback, timeoutInMs) {
        timeoutInMs = timeoutInMs || 250;

        return function innerRetryAsync() {
            var that = this;
            var args = arrayFrom(arguments);

            return promiseFunction.apply(that, args).then(function (result) {
                if (resultIsGoodCallback(result)) {
                    return result;
                }
                else {
                    return timeoutAsync(timeoutInMs).then(function () {
                        return innerRetryAsync.apply(that, args);
                    });
                }
            });
        };
    }

    function arrayFrom(arrayLike) {
        var arr = [];
        for (var idx = 0; idx < arrayLike.length; ++idx) {
            arr.push(arrayLike[idx]);
        }
        return arr;
    }

    var logifyPromiseFunction = function (promiseFn, name) {
        return function () {
            console.log("Promise " + name + " start");
            var result = promiseFn.apply(this, arrayFrom(arguments));

            return result.then(function (completionResult) {
                var stringifiedResult = completionResult;
                if (typeof stringifiedResult !== "string") {
                    try {
                        stringifiedResult = JSON.stringify(completionResult);
                    }
                    catch (e) { }
                }

                console.log("Promise " + name + " done (" + stringifiedResult + ")");
                return completionResult;
            }, function (errorResult) {
                var stringifiedResult = errorResult;
                if (typeof stringifiedResult !== "string") {
                    try {
                        stringifiedResult = JSON.stringify(errorResult);
                    }
                    catch (e) { }
                }

                console.log("Promise " + name + " error (" + errorResult + ")");
                throw errorResult;
            });
        };
    };

    var httpRequestAsync = logifyPromiseFunction(function (method, stringUrl, objectBody) {
        var deferral = new Deferral();
        var collectedResponse = "";
        var parsedUrl = url.parse(stringUrl, false, true);
        var options = {
            port: parsedUrl.port,
            hostname: parsedUrl.hostname,
            method: method,
            path: parsedUrl.path,
        };
        var stringBody = JSON.stringify(objectBody);
        if (stringBody) {
            options.headers = {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Length": stringBody.length
            };
        }
        var request = http.request(options);
        if (stringBody) {
            if (verboseOut) {
                console.log("httpRequestAsync " + stringUrl + " " + stringBody);
            }
            request.write(stringBody);
        } else {
            console.log("httpRequestAsync " + stringUrl);
        }

        request.end();

        request.on("abort", function () {
            deferral.reject();
            console.log("httpRequestAsync failure");
        });

        request.on("response", function (response) {
            response.setEncoding("utf8");
            response.on("data", function (chunk) {
                collectedResponse += chunk;
            });
            response.on("end", function () {
                deferral.resolve(JSON.parse(collectedResponse));
                console.log("httpRequestAsync success");
            });
        });

        return deferral.promise;
    }, "httpRequestAsync");

    var webDriverCommand = {
        sessionAsync: logifyPromiseFunction(function (player) {
            return httpRequestAsync("POST", player.uri + "/session", {
                "desiredCapabilities": {
                    "browserName": "",
                    "browserVersion": "",
                    "platformName": "Windows NT",
                    "platformVersion": "10"
                },
                "requiredCapabilities": {}
            }).then(function (result) {
                if (result.status === 0) {
                    player.sessionId = result.sessionId;
                    player.name = result.value.browserName;
                    console.log("Updated player " + JSON.stringify(player));
                }
                else {
                    throw new Error("New session error: " + JSON.stringify(result));
                }
            });
        }, "sessionAsync"),
        getAsync: logifyPromiseFunction(function (player, uri) {
            return httpRequestAsync("POST", player.uri + "/session/" + player.sessionId + "/url", {
                url: uri
            });
        }, "getAsync"),
        executeScriptAsync: logifyPromiseFunction(function (player, script, args) {
            if (!args) {
                args = [];
            }

            if (verboseOut) {
                console.log("executeScriptAsync " + player.name + " " + script + "\n");
            }

            return httpRequestAsync("POST", player.uri + "/session/" + player.sessionId + "/execute", {
                script: script,
                args: args
            }).then(function (response) {
                if (response.status === 0) {
                    return response.value;
                }
                else {
                    throw new Error("executeScript: " + JSON.stringify(response));
                }
            });
        }, "executeScriptAsync"),
        executeScriptAsyncAsync: logifyPromiseFunction(function (player, script, args) {
            if (!args) {
                args = [];
            }

            if (verboseOut) {
                console.log("executeScriptAsyncAsync " + player.name + " " + script + "\n");
            }

            return httpRequestAsync("POST", player.uri + "/session/" + player.sessionId + "/execute_async", {
                script: script,
                args: args
            }).then(function (response) {
                if (response.status === 0) {
                    return response.value;
                }
                else {
                    throw new Error("executeScriptAsyncAsync: " + JSON.stringify(response));
                }
            });
        }, "executeScriptAsyncAsync"),
        setSessionTimeouts: logifyPromiseFunction(function (player, type, ms) {
            return httpRequestAsync("POST", player.uri + "/session/" + player.sessionId + "/timeouts", {
                type: type,
                ms: ms
            }).then(function (response) {
                if (response.status === 0) {
                    return response.value;
                }
                else {
                    throw new Error("setSessionTimeouts: " + JSON.stringify(response));
                }
            });
        }, "setSessionTimeouts")
    };

    var turnState = new (function TurnState() {
        var moveCount = 0;
        var players = [{}, {}];

        this.initialize = function (uri0, uri1) {
            moveCount = 0;
            players[0] = { uri: uri0 };
            players[1] = { uri: uri1 };
        };

        this.getMoveCount = function() { return moveCount; };
        this.getCurrentPlayer = function() { return players[moveCount % players.length]; };
        this.getNextPlayer = function() { return players[(moveCount + 1) % players.length]; };
        this.incrementMove = (function() { 
            var previousPlayer = this.getCurrentPlayer();
            ++moveCount;
            var newPlayer = this.getCurrentPlayer();
            if (verboseOut) {
                console.log("Changing player from " + previousPlayer.name + " to " + newPlayer.name);
            }
        }).bind(this);
    })();

    var lozza = new (function Lozza() {
        function initializeUserAgentsAsync() {
            turnState.initialize(
                 process.argv[2] || "http://localhost:17556",
                 process.argv[3] || "http://localhost:9515");

            return Promise.all([webDriverCommand.sessionAsync(turnState.getCurrentPlayer()).then(function () {
                return webDriverCommand.getAsync(turnState.getCurrentPlayer(), "http://op12no2.me/toys/lozza/play.htm?t=" + plyTimeInSeconds + "&c=b");
            }), webDriverCommand.sessionAsync(turnState.getNextPlayer()).then(function () {
                return webDriverCommand.getAsync(turnState.getNextPlayer(), "http://op12no2.me/toys/lozza/play.htm?t=" + plyTimeInSeconds + "&c=w");
            }).then(function () {
                return webDriverCommand.executeScriptAsync(turnState.getNextPlayer(),
                    "(function flipBoard() {" +
                    "    if (window.board) {" +
                    "        board.flip();" +
                    "    } else {" +
                    "        setTimeout(flipBoard, 500);" +
                    "    }" +
                    "})();"
                );
            })]);
        }

        function plyLoopAsync() {
            var lastMove;
            console.log("Getting move from player...");
            return timeoutAsync(plyTimeInSeconds * 1000).then(function () {
                return retrifyPromiseFunction(webDriverCommand.executeScriptAsync, function (result) { 
                    return JSON.parse(result) !== "waiting";
                })(turnState.getCurrentPlayer(),
                    "return (function (moveHistory) {\n" + 
                    "    return !chess.game_over() ? (moveHistory.length > " + turnState.getMoveCount() + " ? JSON.stringify(moveHistory[moveHistory.length - 1]) : '\"waiting\"') : '\"end\"';\n" +
                    "})(chess.history({verbose: true}));\n"
                );
            }).then(function (moveInJson) {
                console.log("Got move: " + moveInJson);

                if (JSON.parse(moveInJson) !== "end") {
                    return webDriverCommand.executeScriptAsync(turnState.getNextPlayer(),
                        "(function () {\n" +
                        "   var move = JSON.parse('" + moveInJson + "');\n" +
                        "   var compPiece = move.piece + move.color.toUpperCase();\n" +
                        "   onDrop(move.from, move.to, compPiece);\n" +
                        "   board.position(chess.fen(), false);\n" +
                        "})();"
                    ).then(function () {
                        console.log("Sent move to other player!");
                        turnState.incrementMove();

                        return plyLoopAsync();
                    });
                }
            });
        }

        this.playGameAsync = function () {
            return initializeUserAgentsAsync().then(function () {
                return plyLoopAsync();
            });
        }
    })();

    var kingdom = new (function Kingdom() {
        function initializeUserAgentsAsync() {
            turnState.initialize(
                 process.argv[2] || "http://localhost:17556",
                 process.argv[3] || "http://localhost:9515");
            var kingdomBaseUrl = process.argv[4] || "http://localhost:8080";

            return Promise.all([webDriverCommand.sessionAsync(turnState.getCurrentPlayer()).then(function () {
                return webDriverCommand.getAsync(turnState.getCurrentPlayer(), kingdomBaseUrl + "?b=human&w=ai&t=" + plyTimeInSeconds);
            }), webDriverCommand.sessionAsync(turnState.getNextPlayer()).then(function () {
                return webDriverCommand.getAsync(turnState.getNextPlayer(), kingdomBaseUrl + "?b=ai&a=human&t=" + plyTimeInSeconds);
            })]);
        }

        function getLastMove(moveCount) {
            var move = "waiting";

            if (window.gameHistory && gameHistory.length > moveCount) {
                var lastEntry = gameHistory[gameHistory.length - 1];

                if (lastEntry.move) {
                    move = { 
                        uci: lastEntry.move,
                        ponder: lastEntry.ponder
                    };
                }
                else {
                    move = { 
                        uci: lastEntry.eval_best_move,
                        ponder: lastEntry.eval_ponder
                    };
                }
            }

            return JSON.stringify(move);
        }

        function injectMove(move) {
            try {
                if (window.makeMove) {
                    window.makeMove(move.uci);
                }
            }
            catch (error) {
                throw new Error("Error: " + error.message + " " + error.stack);
            }
        }

        function plyLoopAsync() {
            var lastMove;
            console.log("Getting move from player...");
            return timeoutAsync(plyTimeInSeconds * 1000).then(function () {
                return retrifyPromiseFunction(webDriverCommand.executeScriptAsync, function (result) { 
                    return JSON.parse(result) !== "waiting";
                })(turnState.getCurrentPlayer(), "return (" + getLastMove.toString() + ")(" + turnState.getMoveCount() + ");");
            }).then(function (moveInJson) {
                console.log("Got move: " + moveInJson);

                if (JSON.parse(moveInJson) !== "end") {
                    return webDriverCommand.executeScriptAsync(turnState.getNextPlayer(), "return (" + injectMove.toString() + ")(" + moveInJson + ");").then(function () {
                        console.log("Sent move to other player!");
                        turnState.incrementMove();

                        return plyLoopAsync();
                    });
                }
            });
        }

        this.playGameAsync = function () {
            return initializeUserAgentsAsync().then(function () {
                return plyLoopAsync();
            });
        }
    })();

    var simpleChess = new (function SimpleChess() {
        function initializeUserAgentsAsync() {
            turnState.initialize(
                 process.argv[2] || "http://localhost:17556",
                 process.argv[3] || "http://localhost:9515");
            var baseUrl = process.argv[4] || "http://localhost:8080";

            return webDriverCommand.sessionAsync(turnState.getCurrentPlayer()).then(function () {
                return webDriverCommand.sessionAsync(turnState.getNextPlayer());
            }).then(function () {
                return webDriverCommand.setSessionTimeouts(turnState.getCurrentPlayer(), "script", 1 * 60 * 60 * 1000);
            }).then(function () {
                return webDriverCommand.getAsync(turnState.getCurrentPlayer(), baseUrl + 
                    "?p0Type=stockfish&p0Name=" + (turnState.getCurrentPlayer().name) + 
                    "&p1Type=webdriver&p1Name=" + (turnState.getNextPlayer().name) + 
                    "&plyTime=" + plyTimeInSeconds);
            }).then(function () {
                return webDriverCommand.executeScriptAsyncAsync(turnState.getCurrentPlayer(), 
                    "return (" + waitForDomContentLoaded.toString() + ")(arguments[0]);");
            }).then(function () {
                return webDriverCommand.setSessionTimeouts(turnState.getNextPlayer(), "script", 1 * 60 * 60 * 1000);
            }).then(function () {
                return webDriverCommand.getAsync(turnState.getNextPlayer(), baseUrl + 
                    "?p0Type=webdriver&p0Name=" + (turnState.getCurrentPlayer().name) +
                    "&p1Type=stockfish&p1Name=" + (turnState.getNextPlayer().name) +
                    "&plyTime=" + plyTimeInSeconds);
            }).then(function () {
                return webDriverCommand.executeScriptAsyncAsync(turnState.getNextPlayer(), 
                    "return (" + waitForDomContentLoaded.toString() + ")(arguments[0]);");
            });
        }

        function waitForDomContentLoaded(callback) {
            window.wdl = window.wdl === undefined ? [] : window.wdl;
            window.wdl.push("waitForDomContentLoaded called with " + callback);
            if (document.readyState !== "loading") {
                callback();
            }
            else {
                document.addEventListener("DOMContentLoaded", function () {
                    callback();
                });
            }
        }

        function injectAndWait(nextMove, callback) {
            window.wdl = window.wdl === undefined ? [] : window.wdl;
            window.wdl.push("WD injecting nextmove: " + nextMove + " " + JSON.stringify(nextMove));
            window.invokerCommunication.resolveNextMoveAsync(nextMove).then(function (previousMove) {
                window.wdl.push("WD got previousmove: " + previousMove + " " + JSON.stringify(previousMove));
                callback(JSON.stringify(previousMove));
            });
        }

        function plyAsync(moveInJson) {
            console.log("Getting move from player...");
            return webDriverCommand.executeScriptAsyncAsync(
                turnState.getCurrentPlayer(),
                "return (" + injectAndWait.toString() + ")(" + (moveInJson || null) + ", arguments[0]);"
            ).then(function (nextMoveInJson) {
                console.log("Got move: " + nextMoveInJson);
                turnState.incrementMove();
                return nextMoveInJson;
            });
        }

        function plyLoopAsync(moveInJson) {
            return plyAsync(moveInJson).then(function (nextMoveInJson) {
                var nextMove = JSON.parse(nextMoveInJson);
                if (!nextMove || !nextMove.gameOver) {
                    return plyLoopAsync(nextMoveInJson);
                }
                else {
                    console.log("Gove gameover");
                    plyAsync(nextMoveInJson);
                }
            });
        }
/*
        function plyLoopAsync(moveToInject, depth) {
            console.log("Getting move from player...");
            return webDriverCommand.executeScriptAsyncAsync(
                turnState.getCurrentPlayer(), 
                "return (" + injectAndWait.toString() + ")(" + (moveToInject || null) + ", arguments[0]);"
            ).then(function (nextMoveInJson) {
                console.log("Got move: " + nextMoveInJson);
                var nextMove = JSON.parse(nextMoveInJson);
                if (depth > 0) {
                    if (!nextMove || !nextMove.gameOver) {
                        turnState.incrementMove();
                        return plyLoopAsync(nextMoveInJson, depth - 1);
                    }
                    else {
                        turnState.incrementMove();
                        return plyLoopAsync(nextMoveInJson, 2);
                    }
                }
            });
        }
        */

        this.playGameAsync = function () {
            return initializeUserAgentsAsync().then(function () {
                return plyLoopAsync(null);
            });
        }
    })();

    simpleChess.playGameAsync().then(function () {
        console.log("game complete.");
    }, function (error) {
        console.log("game failed: " + error);
    });

})(this);
