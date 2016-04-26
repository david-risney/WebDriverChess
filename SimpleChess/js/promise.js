(function (root) {
    function Deferral() {
        this.promise = new Promise((function (s, e, p) {
            this.resolve = s;
            this.reject = e;
            this.notify = p;
        }).bind(this));
    }
    root.Deferral = Deferral;

    function timeoutAsync(delayInMs, resolution) {
        var signal = new Deferral();

        setTimeout(function () {
            signal.resolve(resolution);
        }, delayInMs);

        return signal.promise;
    }
    root.timeoutAsync = timeoutAsync;

    function nextEventAsync(target, eventName, filter) {
        var deferral = new Deferral();
        function nextEventListener(eventArg) {
            if (!filter || filter(eventArg)) {
                deferral.resolve(eventArg);
            }
        }
        target.addEventListener(eventName, nextEventListener);

        return deferral.promise;
    }
    root.nextEventAsync = nextEventAsync;

    function logifyPromiseFunction(promiseFn, name) {
        return function () {
            console.log("Promise " + name + " start");
            var result = promiseFn.apply(this, Array.from(arguments));

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
    }
    root.logifyPromiseFunction = logifyPromiseFunction;

 })(this);
