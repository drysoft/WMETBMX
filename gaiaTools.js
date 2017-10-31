(function () {
    if (!document.location.href.includes("gaia")) return;

    var script = document.createElement('script');
    script.textContent = "var extensionId = " + JSON.stringify(chrome.runtime.id);
    (document.head || document.documentElement).appendChild(script);
    script.parentNode.removeChild(script);


    var code = '(' + function () {

        var _debugLevel = 3;
        var _version = "0.1"

        function log(message, level) {
            if (message && level <= _debugLevel) {
                console.log('My Tools: ' + message);
            }
        }

        function bootstrap(tries) {
            tries = tries || 1;

            if ($ && $("#mdm6DinamicPanel")[0] && $("#map")[0]) {
                init();
            } else if (tries < 200) {
                setTimeout(function () {
                    bootstrap(tries+1);
                }, 200);
            } else {
                log("Gaia ToolBox for Waze Editors (GTB4WE) couldn't start.", 0);
            }
        }

        bootstrap();

        function init() {

            initStreetNameObserver();

            initDenueNameObserver();

            log("Gaia ToolBox for Waze Editors (GTB4WE) " + _version + " is running.", 0);
        }

        function initStreetNameObserver() {
            log("initStreetNameObserver", 1);
            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if ($(mutation.target).hasClass("dinamicPanel-detail")) {
                        selectStreetName();
                    }
                });
            });
            observer.observe($("#mdm6DinamicPanel")[0], {
                childList: true,
                subtree: true
            });
        }

        function initDenueNameObserver() {
            log("initDenueNameObserver", 1);
            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if ($(mutation.target).prop("id") == "info_recordCard") {
                        selectDenueName();
                    }
                });
            });
            observer.observe($("#map")[0], {
                childList: true,
                subtree: true
            });
        }

        function selectStreetName() {
            var elements = $(".dinamicPanel-detailMainLabel");
            if (elements.length === 0 || elements[0].childNodes.length === 0) return;
            var sel = window.getSelection();
            if (!sel.isCollapsed) return;

            var range = document.createRange();
            elements[0].childNodes.forEach(function (child) {
                if (child.nodeName == "#text") {
                    var toCopy = child.nodeValue;
                    log("selecting " + toCopy, 3);
                    range.selectNodeContents(child);
                    copyData(toCopy);
                    return;
                } else if (child.nodeName == "TABLE") {
                    var toCopy = child.childNodes[0].childNodes[0].childNodes[1].innerText;
                    log("selecting " + toCopy, 3);
                    range.selectNodeContents(child.childNodes[0].childNodes[0].childNodes[1]);
                    copyData(toCopy);
                    return;
                }
            });
            sel.removeAllRanges();
            sel.addRange(range);
        }

        function copyData(data) {
            log("copyData.", 1);
            var event = new CustomEvent("copy", { detail: { id: "setData", data: data } });
            window.dispatchEvent(event);
        }

        function selectDenueName() {
            log("selectDenueName.", 1);
            var elements = $("#info_recordCard").find("div.section_label");
            if (elements.length === 0) return;


            var child = elements[0];
            var toCopy = child.innerText;
            copyData(toTitleCase(toCopy));

            var range = document.createRange();
            var sel = window.getSelection();
            //if (!sel.isCollapsed) return;
            log("selecting " + toCopy, 3);
            range.selectNodeContents(child);
            sel.removeAllRanges();
            sel.addRange(range);
        }

        function toTitleCase(str) {
            return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
        }
    } + ')();';

    var script = document.createElement('script');
    script.textContent = code;
    (document.head || document.documentElement).appendChild(script);
    script.remove();

    window.addEventListener("copy", function (evt) {
        console.log("sending event copy");
        chrome.runtime.sendMessage(evt.detail);
    }, false);

})();