(function (root) {
    function parseUrlEncodedQuery(query) {
        return query.split("&").map(function (nameValuePairString) {
            return nameValuePairString.split("=");
        }).reduce(function (total, next) {
            total[next[0]] = next[1];
            return total;
        }, {});
    }
    var parsedQuery = parseUrlEncodedQuery(document.location.search.substr(1));
    root.domContentLoaded = nextEventAsync(document, "DOMContentLoaded");

    function initAsync() {
        var game = new Game("board1", parsedQuery);
        var playersElement = document.getElementById("players");
        playersElement.textContent = "White: " + parsedQuery.p0Name + ", Black: " + parsedQuery.p1Name;
        root.initialDeferral = new Deferral();

        root.initialDeferral.resolve();
        
        root.initialDeferral.promise.then(function () {
            return game.gameLoopAsync();
        }).then(function (finalMove) {
            var statusElement = document.getElementById("status");
            statusElement.textContent = finalMove.gameOver;

            console.log("Game complete: " + finalMove.gameOver);
        });
    }
    $(document).ready(initAsync);
})(this);
