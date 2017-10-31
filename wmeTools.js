(function () {

    if (!document.location.href.includes("waze")) return;

    var script = document.createElement('script');
    script.textContent = "var extensionId = " + JSON.stringify(chrome.runtime.id);
    (document.head || document.documentElement).appendChild(script);
    script.parentNode.removeChild(script);

    console.log("My tools id:" + JSON.stringify(chrome.runtime.id));

    var code = '(' + function () {

        var UpdateObject,
            AddOrGetCity,
            AddOrGetStreet,
            MultiAction;

        var _debugLevel = 3;
        var _version = "0.1"
        var _roadTypeDropDownSelector = 'select[name="roadType"]';
        var _roadTypes = {
            St: { val: 1, title: 'Street', wmeColor: '#ffffeb', svColor: '#ffffff', category: 'streets', visible: true },
            PS: { val: 2, title: 'Primary Street', wmeColor: '#f0ea58', svColor: '#cba12e', category: 'streets', visible: true },
            mH: { val: 7, title: 'Minor Highway', wmeColor: '#69bf88', svColor: '#ece589', category: 'highways', visible: true },
            MH: { val: 6, title: 'Major Highway', wmeColor: '#45b8d1', svColor: '#c13040', category: 'highways', visible: true },
            Fw: { val: 3, title: 'Freeway', wmeColor: '#c577d2', svColor: '#387fb8', category: 'highways', visible: false },
            Rmp: { val: 4, title: 'Ramp', wmeColor: '#b3bfb3', svColor: '#58c53b', category: 'highways', visible: false },
            OR: { val: 8, title: 'Off-road / Not maintained', wmeColor: '#867342', svColor: '#82614a', category: 'otherDrivable', visible: false },
            PLR: { val: 20, title: 'Parking Lot Road', wmeColor: '#ababab', svColor: '#2282ab', category: 'otherDrivable', visible: true },
            PR: { val: 17, title: 'Private Road', wmeColor: '#beba6c', svColor: '#00ffb3', category: 'otherDrivable', visible: true },
            Fer: { val: 15, title: 'Ferry', wmeColor: '#d7d8f8', svColor: '#ff8000', category: 'otherDrivable', visible: false },
            WT: { val: 5, title: 'Walking Trail (non-drivable)', wmeColor: '#b0a790', svColor: '#00ff00', category: 'nonDrivable', visible: false },
            PB: { val: 10, title: 'Pedestrian Boardwalk (non-drivable)', wmeColor: '#9a9a9a', svColor: '#0000ff', category: 'nonDrivable', visible: false },
            Sw: { val: 16, title: 'Stairway (non-drivable)', wmeColor: '#999999', svColor: '#b700ff', category: 'nonDrivable', visible: false },
            RR: { val: 18, title: 'Railroad (non-drivable)', wmeColor: '#c62925', svColor: '#ffffff', category: 'nonDrivable', visible: false },
            RT: { val: 19, title: 'Runway/Taxiway (non-drivable)', wmeColor: '#ffffff', svColor: '#00ff00', category: 'nonDrivable', visible: false }
        };
        var _lockDropDownSelector = 'select[name="lockRank"]';


        function log(message, level) {
            if (message && level <= _debugLevel) {
                console.log('My Tools: ' + message);
            }
        }

        //> Executes a callback if is valid, if not, it tries again after a time
        function bootstrap(valid, callback, tries) {
            log("bootstrap", 1);
            tries = tries || 1;

            if (valid()) {
                callback();
            } else if (tries < 250) {
                setTimeout(function () { bootstrap(valid, callback, tries+1); }, 200);
            }
        }


        function init() {
            log("init", 1);
            $.fn.exists = function () {
                return this.length !== 0;
            };
			console.log('drysoft: LOAD');
            //> Adds hiperlink element
            createLinkToGMaps();
            createLinkToGaia();

            //> Adds bar items
            observeBarItems();

            if (typeof (require) !== "undefined") {
                UpdateObject = require("Waze/Action/UpdateObject");
                AddOrGetCity = require("Waze/Action/AddOrGetCity");
                AddOrGetStreet = require("Waze/Action/AddOrGetStreet");
                MultiAction = require("Waze/Action/MultiAction");
            }

            log(_version + " is running.", 0);
        }

        function observeBarItems(){
            bootstrap(
                function () { return $("#topbar-container").exists(); },
                function(){
                    var observer = new MutationObserver(function (mutations) {
                        mutations.forEach(function (mutation) {
                            if ($(mutation.target).hasClass("full-address")
                            && mutation.addedNodes.length > 0
                            && mutation.addedNodes[0].nodeName === "#text") {
                                //console.log(mutation);
                                //> Adds selector functionality
                                createSelector();
                                //> Adds no street functionality
                                createNoStreet();
                                //> Adds paste street functionality
                                createPasteStreet();
                                //> Adds mH template
                                create60mH3();
                                //> Adds PS template
                                create40PS2();
                            }
                        });
                    });
                    observer.observe($("#topbar-container")[0], {
                        childList: true,
                        subtree: true
                    });
                }
            );
        }

        //> Appends a link to permalinks section on status bar
        function createLinkToGaia() {
            log("Creating link to MDM", 1);
            var $a = $("<a href='#' data-toggle='tooltip' title='Ir a Gaia MDM'><img src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAINSURBVDhPnZPfS1NhGMcf6A8QgpIVpczN82vKCCyoLvpxWdRutMn5uTGhvJEoiIl0kxeDLOqiKBqSsKCrrIyCJhGlIl14IavAMFs4IU3BmIUz9+054w3GcKF94L047/t8v+f7Puc5VBVZ95Bih0ixukhxoiQ7+8TJJtCcTvLpX8lrgBrcZYJ2t6+SbKZI7vCIqipoVjf5LHiOX8SlW4MYHn+P/icjOBS7CpKjIMmaoGZjp6iuQLWDVNe+5j8Rx0xuHuX8LhYRS6RAfhukmNeFogLF6CPJwY1HI3g9vYJnk9+R/rCIpZVCySRfKMB/qgdU3zZHgXCtUJXREE5vP3oBw5lZJMe+4Vo6i97nMxiaXCgZ/FoDTncnQXtD66TpLUJVhi/8quZwF95+nMXSz3VkcnlcfjqNHl73x+fwYuoHQvF7oLpqBrJ50+347cE3pTe6vPuyjP6xHB5OLCC7mId0Ms4JwvMkRXcJVRmqtZ/8erH2yHmMZj4Li78UEe0dAPm4iaqVFIoN0OyE2+mag504m3iAgaFR9KVeosW4wmKeh0b7E8/JHlG9Aa2t29jkMckRvmsbd/yM23WQVwfvL/OXOiAq/0EwsoM0c4qaYm5cFjqgAA+RauuiYhOozjFq1AsU4CTNHWxi3BEnW0Ax71LwnJsgW0q1ZSS7nqOv8jXiYuc/0Ph3bop4xVMFRH8AgigQaceEwpQAAAAASUVORK5CYII=' width='20px' height='20px' align='left' hspace='2' vspace='2'></a>");
            $a[0].onclick = go2GMDM;
            $(".WazeControlPermalink").append($a);
        }
        //> Appends a link to permalinks section on status bar
        function createLinkToGMaps() {
            log("Creating link to GMaps", 1);
            var $b = $("<a href='#' data-toggle='tooltip' title='Ir a Google Maps'><img src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAFV0lEQVRIx32VX4xdVRnFf9/+c+69c2fuzDh25s6UWErHzgy0U6CIYG0pA4HyQh0TE31RE/pQNKQSNTxpNP558qGaVkVq0gaiCRDAKGYCFGKMmGqHAkI0rSWxGirQznXamfvvnL0/H+6dO3fGxH3OyTl7J2fttda39t6y5ekv9UgaH1HVQwb6FaV9oyiqCqzrK0SUnmbgrotNZs8vsflqEycGenowvaW6Ha2+4DYuH3CSxkeM8k0QFEXa7//XAspAI/LdUxVuu7hEQyIBIaqi1SqxspDX+uj9agtPOFU9RBdoM6TUQwZAYi1ObFtBe1KFgPCdPy9w03tLVC2gghFBY1tpjGTvv4vJXzPjOrYAOeN5eHo/n986g4jw47ef59G358g0dpQpsPODBlsv1QjSGl3KIueuLFNKHJsKOYwAIRAqV5xbsaUZUh6e3s/esW08+PufsJzWKNiEWmjijev4rwJbFhvkQ2wpjsoL/15gsZkSVZkZHuDaYh4VIV69ikFBVamHjC9O3MUP3niOF/91hs+N38F9H7mFr+6YpRmzNTVwEURbfjVCJI2KE0EEFtOASLtWsRmMthMCEIkdpplmTAxu5NPX3U4as9U0ReX9vKFpWij9iWVTMU9ihEHv+WhfnqggMVIf3mjdiv+JtRz/20m+vmOWECNPnf8D37jls/zy3O/wxnXYG+DUUI5FCxsihKjsGipxQ6mHnBG8tByRLOXq9p24FWZOLEff+i2qytHdBzEIj597hRNnX27lu600qDI9mjG4x8BcAAeZKkVrVtOmSnVkjNr4JLL5iQOd0CuQxoxGyFAiifX4TkwhKEwUmjw5dQlD4PLhJvZdAUPbwpVFKVycuY/mjbfSqcHKLM5Yij5H0eXXgFeDsGugzrPTlxlMlFxsEmYnNC30deoDICFwZdN1VLffjDUGo6y9gDU/rDCf+VCNxyb/Q79TRJosmj1UBr8gS7d+nFZsWtZkSY739s3irCVJPEa1ne+uhy5VWVQme1KOTVXob+ezmbuTCp/B+4T6x24n6+trsc8yLt65D5PP46zFOYfpZrrWLmU5g08ONnh2xyVKTsHUobiHdODLlMsbKRQKmNIASzs/gWQp9Q0jNLZM4IxpgbcsWvW/W0UWYWaozs8mK5Ssgq3xq7P7eezNh8j7BO8d5XKZvlxC7bbdxKhUrx1H8gWcc3jvcc6txrS7ZQpTxZSfT1Uo2QgoJ9+5l2NvPICqYaBH2bdd8N4zPDxMQ6E2Pkk2MoZrA1trWwrWW7QchF39dZ7bcYmSi+DqnLywlyPzBwlqCcCJV4W5v0DeQ5IkjI0Mw+Q2dOjDeO/x3mNMC9r2zt74rRUNQeGOwXo8dn2FfqeCq/Gbs7McnT9IM3oERRSiwusXhCzCzZuUGIVk8zj1fAHTLu5KDTp7QGjZEo/fsBB7jTpUeen8vfrTMw9IVIOsHHNdip8+bSj4qPu2IbneXsrex4WFBQkhiLR3PKPaSsvugWr9+ekPQq9Rh6nz4j/2cuS1ByVEu2YlrgaiRerxPzqZe8tSSNCeYtGMjo7GJEnSzt6VKdwzVF86PrVoeyweU9Vfn/sUPzz9EI0s12LeHeHWeloNRIQTrzp+ccpTcFG997ZcLksul6upKmZrMb385PbLoWijh6AvvXOPPnrmAFFN56DsZs26rUXa40+dtvLMvCiqaq11IyMjKVCxf/3+hoEEcze2xssX9tR+NH/Ip9FLd2x1nffdne7JX/+noT8fl64f01xUm+vr6/22/d7XrvkTplaa+/v9Q4fnvzKSBi/rYP4HdP3nqjKR1y7YnFF986bNekTEHf4vYx67NSB7cBcAAAAASUVORK5CYII=' width='20px' height='20px' align='left' hspace='2' vspace='2'></a>");
            $b[0].onclick = go2GMaps;
            $(".WazeControlPermalink").append($b);
        }
        //> Appends a link to wmetb floating bar 
        function createSelector() {
            log("Creating selector functionality", 1);
            //var $c = $('<div id="selectUnder" title="Selecciona debajo" style="position: absolute; left: 0px; height: 25px; width: 25px; text-align: center; top: 124px; box-shadow: rgb(154, 154, 154) 2px 2px 0px 0px; background-color: white;"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAMAAAHMepGRAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAKvUExURQAAAHSpuJnK2Xqyw3qyxHitvIy6yHauvnOquXyvvnaquneuvZzJ2Hmuv3Wru3OotnOpuXSru3KpuHOpuZbF1X21xX+zwYKzwnOouHWpuHGouHCmt3+ywnOpuHWsvHKouXOouXuxwIK1xYi9zZjI13Wjt4q9zYW2xHKpuJbD04a3xXOquQD//3ywwJfG1H+/f5fG1nquvXSqtJ3G0mbMzHKouXasvHKrunSqv3WpupHC0rTV4JbG1ZbG13OsvHitvHWquXqtvnGptbXW4XKru3GpunKouXKpuZO/zHquvnKpu3KlspXE0pXE1HWuvXWru3GouH+/v3OquHSsu3OpuW6mvHKnuHOpunewwHOquXOqun+ywoG2xJbE13OpuXasvHOouXOktHetvXKouHSouZXE03WtvHmywpXE1XKouIS2xpbH1nOouHqzxHatvXatvou+zoy7yJW/zJTC0nu0xYCywXuvvqTL1Yy+zoi7zIK0wpTF1HGpqXSrvHSpt3Knuou8ypnDz5nD0H///3KpuXSsvHetvZfE1W+vt3i0w3+fn3Spt3WrvHWqu2aZzLHT3XaruXOqt4S3x3GptnKnt3Sru3SqunCnt3Wru3+2xXKpunSpuHGot4C0w3Wru3SpuJbF1nSruW+nuoC1xG6lunOpunSptnetvXSpuW2jtou9zYa2xHitvXisu3Wqunequ222tpXH13Wvvnyvv3Sru4e4ynKqtp3F0XanunWlun+0wmaysnesvHOruXesvYC1xXWpt3Sruniywm2pwnSsu3KquGqqv4K3x3SrunesvHOpuXOpuXWrunKnt3WquXOiuXauvnauv3WsvHKouHevv3evwHOpuICzwXyywHOpuHarunaruniwwHSqulWqqnKnuJPD03GpvHmxwo3AznGmtNrsHCgAAADldFJOUwCndP//2P/pWMvv3XLY9DVUx3vDfP+8/9JXLyu4y+LmWP+wlXUnkP+5fP+LAcl5BHn/GP8Foub/GG+D/3p6/9qp1S3/MS2X9//OYhR+fv/j/wSj6IQXrp////+6r3rN6+8f/tU7e93/e1umeKP///+S//9////T/46X/30JLnJ6kv//AqX93XsgEQg5PfQF/1/ApD/e0/X+9f9O3v61z8t99imuJV1R4uYOkP/WImQeB3v/yf6cPP8pJf8K5v/m/yfz/xX/9Az/+9sh9+/zfAv///ur/////8Ts61b//wPVgDb/jkhiGVSiAAAACXBIWXMAABcRAAAXEQHKJvM/AAABuElEQVQ4T2OAg3NA7CTSCmIKgwhUsB6Iqx6AmZxgEgvY4M6VCWG1ZDxQgLCAQBxKEwWuQWkGyV5zCGNmWbHNSgjzidkDRwgLCNawQxkMDCsmQhlUAwfM+09DmSDAvyychXdVO3cPlA8Ci45rxTx48KAhGMqHgbA2zYwTh6EcBPAzPgtlIYEa13tQ1iABK2866ECZMLB7frkhNPyhQDrokf10OX0oj4GhWWBpwgwZW5GrUD4I+LNFqaU+eBDtBuWDwBSPowYPHvie6YDyQcCkLmrrgwcZuYFQPgQkXix4oHQZyoGB2is3+FygbDjQLrwuBWXCwbL9oqDkigrWJkIZwx8cO7XTG8rEBywX7iplZuyC8rADo26h+3cji7YrJp+HimCA0Mn1cRfz9ulOytbdInsbKogCznNM3XQkP2/P5iwrveoHPsoH5S2gMqgg5dBq58YAMSZgrgICzZPps7DnjvMT0jZFTFscC1ZmO/eSaSdUAguwyLmwvHLjgwcLHt+K3wEVww5UNe6wVqjweJZ49UFFcIGHgklzAvwklkC5uEGIXZO1+l5+KA83OL9udsS8bahZYLADBgYAJviIlX2pjLgAAAAASUVORK5CYII=" height="25px" width="25px" id="selectUnder_icon" class="WMETBdashboard"></div>');
            var $c = $('<div id="selectUnder" title="Selecciona debajo" style="display: inline;"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAMAAAHMepGRAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAKvUExURQAAAHSpuJnK2Xqyw3qyxHitvIy6yHauvnOquXyvvnaquneuvZzJ2Hmuv3Wru3OotnOpuXSru3KpuHOpuZbF1X21xX+zwYKzwnOouHWpuHGouHCmt3+ywnOpuHWsvHKouXOouXuxwIK1xYi9zZjI13Wjt4q9zYW2xHKpuJbD04a3xXOquQD//3ywwJfG1H+/f5fG1nquvXSqtJ3G0mbMzHKouXasvHKrunSqv3WpupHC0rTV4JbG1ZbG13OsvHitvHWquXqtvnGptbXW4XKru3GpunKouXKpuZO/zHquvnKpu3KlspXE0pXE1HWuvXWru3GouH+/v3OquHSsu3OpuW6mvHKnuHOpunewwHOquXOqun+ywoG2xJbE13OpuXasvHOouXOktHetvXKouHSouZXE03WtvHmywpXE1XKouIS2xpbH1nOouHqzxHatvXatvou+zoy7yJW/zJTC0nu0xYCywXuvvqTL1Yy+zoi7zIK0wpTF1HGpqXSrvHSpt3Knuou8ypnDz5nD0H///3KpuXSsvHetvZfE1W+vt3i0w3+fn3Spt3WrvHWqu2aZzLHT3XaruXOqt4S3x3GptnKnt3Sru3SqunCnt3Wru3+2xXKpunSpuHGot4C0w3Wru3SpuJbF1nSruW+nuoC1xG6lunOpunSptnetvXSpuW2jtou9zYa2xHitvXisu3Wqunequ222tpXH13Wvvnyvv3Sru4e4ynKqtp3F0XanunWlun+0wmaysnesvHOruXesvYC1xXWpt3Sruniywm2pwnSsu3KquGqqv4K3x3SrunesvHOpuXOpuXWrunKnt3WquXOiuXauvnauv3WsvHKouHevv3evwHOpuICzwXyywHOpuHarunaruniwwHSqulWqqnKnuJPD03GpvHmxwo3AznGmtNrsHCgAAADldFJOUwCndP//2P/pWMvv3XLY9DVUx3vDfP+8/9JXLyu4y+LmWP+wlXUnkP+5fP+LAcl5BHn/GP8Foub/GG+D/3p6/9qp1S3/MS2X9//OYhR+fv/j/wSj6IQXrp////+6r3rN6+8f/tU7e93/e1umeKP///+S//9////T/46X/30JLnJ6kv//AqX93XsgEQg5PfQF/1/ApD/e0/X+9f9O3v61z8t99imuJV1R4uYOkP/WImQeB3v/yf6cPP8pJf8K5v/m/yfz/xX/9Az/+9sh9+/zfAv///ur/////8Ts61b//wPVgDb/jkhiGVSiAAAACXBIWXMAABcRAAAXEQHKJvM/AAABuElEQVQ4T2OAg3NA7CTSCmIKgwhUsB6Iqx6AmZxgEgvY4M6VCWG1ZDxQgLCAQBxKEwWuQWkGyV5zCGNmWbHNSgjzidkDRwgLCNawQxkMDCsmQhlUAwfM+09DmSDAvyychXdVO3cPlA8Ci45rxTx48KAhGMqHgbA2zYwTh6EcBPAzPgtlIYEa13tQ1iABK2866ECZMLB7frkhNPyhQDrokf10OX0oj4GhWWBpwgwZW5GrUD4I+LNFqaU+eBDtBuWDwBSPowYPHvie6YDyQcCkLmrrgwcZuYFQPgQkXix4oHQZyoGB2is3+FygbDjQLrwuBWXCwbL9oqDkigrWJkIZwx8cO7XTG8rEBywX7iplZuyC8rADo26h+3cji7YrJp+HimCA0Mn1cRfz9ulOytbdInsbKogCznNM3XQkP2/P5iwrveoHPsoH5S2gMqgg5dBq58YAMSZgrgICzZPps7DnjvMT0jZFTFscC1ZmO/eSaSdUAguwyLmwvHLjgwcLHt+K3wEVww5UNe6wVqjweJZ49UFFcIGHgklzAvwklkC5uEGIXZO1+l5+KA83OL9udsS8bahZYLADBgYAJviIlX2pjLgAAAAASUVORK5CYII=" height="20px" width="20px" id="selectUnder_icon" class="WMETBdashboard"></div>');
            $c[0].onclick = selectUnder;
            bootstrap(
                function () { return $(".full-address").exists(); },
                function () { $(".full-address").append($c); }
            );
        }
        //> Appends a link to wmetb floating bar 
        function createNoStreet() {
            log("Creating set no street functionality", 1);
            //var $c = $('<div id="noStreet" title="Sin calle" style="position: absolute; left: 0px; height: 25px; width: 25px; text-align: center; top: 149px; box-shadow: rgb(154, 154, 154) 2px 2px 0px 0px; background-color: white;"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAAoCAMAAAHrifkhAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAbUExURQAAAC9zty50ti51tS51ti11ti51ti51ti11thljO/IAAAAJdFJOUwBAnoTnZrb/z726EQIAAAAJcEhZcwAAFxEAABcRAcom8z8AAAC/SURBVDhP7ZUBDoMgDEVLKb+9/4n3MbhlkQlmS2Y2X7RFSouWgtIjmp5jYnRuugtctTXfBc+BYKPA3rSIVfF4/CYIFT22BkOMy+SiTAjO8ZFnxAWt1QEZ9tIO0PipKp5jfZVUWuMOO1BKSA5sjbSi1D3La2u8+ENgrF1IcT94NADF6OgsqZ2N04HDky8zLsfuj+EemXcxR6Lm4cvEhvvuX7BirhI1LYuLKygiMb0DOJtSoDpyRjrQnaHGnhcrIjd8JwMxHexI7wAAAABJRU5ErkJggg==" height="25px" width="25px" id="noStreet_icon" class="WMETBdashboard"></div>');
            var $c = $('<div id="noStreet" title="Sin calle" style="display: inline;"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAAoCAMAAAHrifkhAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAbUExURQAAAC9zty50ti51tS51ti11ti51ti51ti11thljO/IAAAAJdFJOUwBAnoTnZrb/z726EQIAAAAJcEhZcwAAFxEAABcRAcom8z8AAAC/SURBVDhP7ZUBDoMgDEVLKb+9/4n3MbhlkQlmS2Y2X7RFSouWgtIjmp5jYnRuugtctTXfBc+BYKPA3rSIVfF4/CYIFT22BkOMy+SiTAjO8ZFnxAWt1QEZ9tIO0PipKp5jfZVUWuMOO1BKSA5sjbSi1D3La2u8+ENgrF1IcT94NADF6OgsqZ2N04HDky8zLsfuj+EemXcxR6Lm4cvEhvvuX7BirhI1LYuLKygiMb0DOJtSoDpyRjrQnaHGnhcrIjd8JwMxHexI7wAAAABJRU5ErkJggg==" height="20px" width="20px" id="noStreet_icon" class="WMETBdashboard"></div>');
            $c[0].onclick = function () { setNoStreet(); setSpeed(30); };
            bootstrap(
                function () { return $(".full-address").exists(); },
                function () { $(".full-address").append($c); }
            );
        }
        //> Appends a link to wmetb floating bar 
        function createPasteStreet() {
            log("Creating paste street functionality", 1);
            //var $c = $('<div id="pasteStreet" title="Pegar calle" style="position: absolute; left: 0px; height: 25px; width: 25px; text-align: center; top: 174px; box-shadow: rgb(154, 154, 154) 2px 2px 0px 0px; background-color: white;"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAP3SURBVEhLzZZtTFtVHMZJZsIHE/SL05lo4owxakKWqPFty6IfFmMWX0Oi+0CUD5KoMwJzjOoUFiVmDhLCpbCVMaAz6wqowCiUOylgoVBoR3uhkPLW3t729u3e0q6lrcAeD+wmBkPhmuyDT/LLuTn/3Oc5539zcm7W/0JarXYfM8e8aLfbc6Wpeye9Xn+/zcbU+3h/2OPxcoPDRoVUujfqo+l86y0bTCZTn2lszDo0bExoNB0vS+X/prw87b6yTtPDJfqp/dWNLS90dnZWdXX12rt6dBtNanWxpq2ttldPo6dPP6zRtv94TtXyzPcjC/vLrusekix2V8O0+9P+1eQ4nVozNQ+Nua40XkZzcwsoqg5KpTJOxmRdnRLqVjVUpKZh5mdvptZN3ZGkqYZxH5NsMuvClKup4w7QRqDGHSguKkZJqQIlim9x5rsKlJ4t33ouOnUaX575BpRTwNV1oDUNlFnchZJNZlVY3BTlB6pdaZyfE1FBT6K2zwgVPYKGfgIZLxLq9cO4ZJiAej6EX1xRXGNv41dmsWFpaf5tnuOOOxyOA5LldilGl6gL7AYqZ2Mon4vjsjsBIZbAajKFaCL5D6spxMgYEUWIYQGiICAajSGeSCCZTILjuErJcruKDE7qnDONszYRp6wCLjF+xEUBiVgUsZWVHSDz0c1aFPE4WchqEpsKBkNNkuV2fdY/QymYBL42B/G5KYDaW16yujCixEwQI7sjiFvcDQjWS5bbVdBtp4omV/CF0YeCQQ5VZg/EUBArpBVh0go5bGzcQSCQIeCjditVOBJGwR8sPtS7UDnqghAMIkJ6HAqFZbG+vkECAjsHvH9tgsof8OOEbgnvdi2gfGgB4UCAfMjwZl9lsba2Dp7PEPBW8yiV18vhvd+cOKadg4J2Iuj3I0x24fcHZJFO/0UC+J0DXr9opI7/vow3NTM4rGZQonMgyPMIkV3wvF8WqVQaLJsh4FXKQL1x3YmjLTY8r7LiZBeDgM+3tQufj5dFkpwZlmV3DjhURVOvtDrwksqCZykzCtunwHu5rRCO88oikVjNHPDcT33UIZUdudQ4nqgaxccaC8jRh58EeMjLcojvFnCwopt6utaKp6pG8EjlME6ozfBxHvA+L1gPJ4vb5ERnDHi0tKPx8RobHvvZjJwfTPigZRKsaxms24XFpeW9WV6GGFnB4uLizgEPfHX1dI6C9uYoerz3Fd9wv6MciM7NzmJmZho2Rgb2abg9XkzZ7Vcky3/pZE129ifKg9n5DU9mHak+cL71Rt742LjLYBiK0rRR3IvBwT8jExaLMGY2y7+3yV2cq+sfOKrT0Yf3orf75hHyk/CawWB48O7bWVl/AzJwyvTIYRt8AAAAAElFTkSuQmCC" height="25px" width="25px" id="pasteStreet_icon" class="WMETBdashboard"></div>');
            var $c = $('<div id="pasteStreet" title="Pegar calle" style="display: inline;"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAP3SURBVEhLzZZtTFtVHMZJZsIHE/SL05lo4owxakKWqPFty6IfFmMWX0Oi+0CUD5KoMwJzjOoUFiVmDhLCpbCVMaAz6wqowCiUOylgoVBoR3uhkPLW3t729u3e0q6lrcAeD+wmBkPhmuyDT/LLuTn/3Oc5539zcm7W/0JarXYfM8e8aLfbc6Wpeye9Xn+/zcbU+3h/2OPxcoPDRoVUujfqo+l86y0bTCZTn2lszDo0bExoNB0vS+X/prw87b6yTtPDJfqp/dWNLS90dnZWdXX12rt6dBtNanWxpq2ttldPo6dPP6zRtv94TtXyzPcjC/vLrusekix2V8O0+9P+1eQ4nVozNQ+Nua40XkZzcwsoqg5KpTJOxmRdnRLqVjVUpKZh5mdvptZN3ZGkqYZxH5NsMuvClKup4w7QRqDGHSguKkZJqQIlim9x5rsKlJ4t33ouOnUaX575BpRTwNV1oDUNlFnchZJNZlVY3BTlB6pdaZyfE1FBT6K2zwgVPYKGfgIZLxLq9cO4ZJiAej6EX1xRXGNv41dmsWFpaf5tnuOOOxyOA5LldilGl6gL7AYqZ2Mon4vjsjsBIZbAajKFaCL5D6spxMgYEUWIYQGiICAajSGeSCCZTILjuErJcruKDE7qnDONszYRp6wCLjF+xEUBiVgUsZWVHSDz0c1aFPE4WchqEpsKBkNNkuV2fdY/QymYBL42B/G5KYDaW16yujCixEwQI7sjiFvcDQjWS5bbVdBtp4omV/CF0YeCQQ5VZg/EUBArpBVh0go5bGzcQSCQIeCjditVOBJGwR8sPtS7UDnqghAMIkJ6HAqFZbG+vkECAjsHvH9tgsof8OOEbgnvdi2gfGgB4UCAfMjwZl9lsba2Dp7PEPBW8yiV18vhvd+cOKadg4J2Iuj3I0x24fcHZJFO/0UC+J0DXr9opI7/vow3NTM4rGZQonMgyPMIkV3wvF8WqVQaLJsh4FXKQL1x3YmjLTY8r7LiZBeDgM+3tQufj5dFkpwZlmV3DjhURVOvtDrwksqCZykzCtunwHu5rRCO88oikVjNHPDcT33UIZUdudQ4nqgaxccaC8jRh58EeMjLcojvFnCwopt6utaKp6pG8EjlME6ozfBxHvA+L1gPJ4vb5ERnDHi0tKPx8RobHvvZjJwfTPigZRKsaxms24XFpeW9WV6GGFnB4uLizgEPfHX1dI6C9uYoerz3Fd9wv6MciM7NzmJmZho2Rgb2abg9XkzZ7Vcky3/pZE129ifKg9n5DU9mHak+cL71Rt742LjLYBiK0rRR3IvBwT8jExaLMGY2y7+3yV2cq+sfOKrT0Yf3orf75hHyk/CawWB48O7bWVl/AzJwyvTIYRt8AAAAAElFTkSuQmCC" height="20px" width="20px" id="pasteStreet_icon" class="WMETBdashboard"></div>');
            $c[0].onclick = pasteStreet;
            bootstrap(
                function () { return $(".full-address").exists(); },
                function () { $(".full-address").append($c); }
            );
        }
        //> Appends a link to wmetb floating bar 
        function create60mH3() {
            log("Creating lv3 60km mH functionality", 1);
            //var $c = $('<div id="mH60" title="mH" style="position: absolute; left: 0px; height: 25px; width: 25px; text-align: center; top: 198px; box-shadow: rgb(154, 154, 154) 2px 2px 0px 0px; background-color: white; background-size: 25px; background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAYAAAA6RwvCAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABZ0RVh0Q3JlYXRpb24gVGltZQAxMS8wOS8xNWB5Zg4AAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzbovLKMAAAB/ElEQVRYhe2YPWjbQBiGnwvJEPCQzaM2TR27FDxoz6ItSyEeuha6du6Q1aarA+pUuhlKdlEKXQrt0EWeLDK0WWICIYE45OtgnTifT6otJKShLxycDt17D9/96DspEaEL2q/acabUAHhuNf/2RT5V8VO7RGSm1BkwBPqAKnn1D3ABvPNF0tpAZkpNgFN2j6AAX4DTfwGVgmTh/wwc7Qhg6xF4WTZthSAzpU6Aj1hT0AtDemHIYRBw4HlrfZZpyn0cczudcjudumzPfZFXzgFFZKMkcJLAUwKiy2UQyMN8LtvqYT6XyyAQ0yMrE9eYLoiBDXE9Gm0NYOt6NHLBvNkGZGF2uomiyhBaN1Fkgzwl4BWCJDCpKxK2HJH5UQayNNdE3XKsmYEee8/YJWcY50Q/iop2WmU5PN/ryp7RONSVXhhubM06dOB59MLQbHrmAumbIE3J8t7PDs0VSPaQH1yHQdAYiMP7OAfB+oo2MS0l3i9MkNb1H8SWBvluNi7TrXKZSnJ4f8tBfJGvrJIYAO7juDEQh/dFDpLpSlcKcolaZHk/ZkFYA4nMl5uYnmWa2iC/dCUH8UXeskrpALgaDmsHcXi+3gDJ9EFX7uKYxXhcG8RiPOZufX381NMCdDQxki6litJS8tyZ60T3L1gWULtXTgdQu5fwAqj2fks0qb9wkQP7KV35ewAAAABJRU5ErkJggg==);"><div style="text-align:center;font-size:9px;">mH</div></div>');
            var $c = $('<div id="mH60" title="mH" style="display: inline-block; height: 20px; width: 20px; background-size: 20px; background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAYAAAA6RwvCAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABZ0RVh0Q3JlYXRpb24gVGltZQAxMS8wOS8xNWB5Zg4AAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzbovLKMAAAB/ElEQVRYhe2YPWjbQBiGnwvJEPCQzaM2TR27FDxoz6ItSyEeuha6du6Q1aarA+pUuhlKdlEKXQrt0EWeLDK0WWICIYE45OtgnTifT6otJKShLxycDt17D9/96DspEaEL2q/acabUAHhuNf/2RT5V8VO7RGSm1BkwBPqAKnn1D3ABvPNF0tpAZkpNgFN2j6AAX4DTfwGVgmTh/wwc7Qhg6xF4WTZthSAzpU6Aj1hT0AtDemHIYRBw4HlrfZZpyn0cczudcjudumzPfZFXzgFFZKMkcJLAUwKiy2UQyMN8LtvqYT6XyyAQ0yMrE9eYLoiBDXE9Gm0NYOt6NHLBvNkGZGF2uomiyhBaN1Fkgzwl4BWCJDCpKxK2HJH5UQayNNdE3XKsmYEee8/YJWcY50Q/iop2WmU5PN/ryp7RONSVXhhubM06dOB59MLQbHrmAumbIE3J8t7PDs0VSPaQH1yHQdAYiMP7OAfB+oo2MS0l3i9MkNb1H8SWBvluNi7TrXKZSnJ4f8tBfJGvrJIYAO7juDEQh/dFDpLpSlcKcolaZHk/ZkFYA4nMl5uYnmWa2iC/dCUH8UXeskrpALgaDmsHcXi+3gDJ9EFX7uKYxXhcG8RiPOZufX381NMCdDQxki6litJS8tyZ60T3L1gWULtXTgdQu5fwAqj2fks0qb9wkQP7KV35ewAAAABJRU5ErkJggg==);"><div style="text-align:center;font-size:9px;">mH</div></div>');
            $c[0].onclick = function () {
                setSpeed(60);
                onRoadTypeButtonClick('mH');
                setLock(2);
            };
            bootstrap(
                function () { return $(".full-address").exists(); },
                function () { $(".full-address").append($c); }
            );
        }
        //> Appends a link to wmetb floating bar 
        function create40PS2() {
            log("Creating lv2 40km PS functionality", 1);
            //var $c = $('<div id="PS40" title="PS" style="position: absolute; left: 0px; height: 25px; width: 25px; text-align: center; top: 222px; box-shadow: rgb(154, 154, 154) 2px 2px 0px 0px; background-color: white; background-size: 25px; background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAYAAAA6RwvCAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABZ0RVh0Q3JlYXRpb24gVGltZQAxMS8wOS8xNWB5Zg4AAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzbovLKMAAAB/ElEQVRYhe2YPWjbQBiGnwvJEPCQzaM2TR27FDxoz6ItSyEeuha6du6Q1aarA+pUuhlKdlEKXQrt0EWeLDK0WWICIYE45OtgnTifT6otJKShLxycDt17D9/96DspEaEL2q/acabUAHhuNf/2RT5V8VO7RGSm1BkwBPqAKnn1D3ABvPNF0tpAZkpNgFN2j6AAX4DTfwGVgmTh/wwc7Qhg6xF4WTZthSAzpU6Aj1hT0AtDemHIYRBw4HlrfZZpyn0cczudcjudumzPfZFXzgFFZKMkcJLAUwKiy2UQyMN8LtvqYT6XyyAQ0yMrE9eYLoiBDXE9Gm0NYOt6NHLBvNkGZGF2uomiyhBaN1Fkgzwl4BWCJDCpKxK2HJH5UQayNNdE3XKsmYEee8/YJWcY50Q/iop2WmU5PN/ryp7RONSVXhhubM06dOB59MLQbHrmAumbIE3J8t7PDs0VSPaQH1yHQdAYiMP7OAfB+oo2MS0l3i9MkNb1H8SWBvluNi7TrXKZSnJ4f8tBfJGvrJIYAO7juDEQh/dFDpLpSlcKcolaZHk/ZkFYA4nMl5uYnmWa2iC/dCUH8UXeskrpALgaDmsHcXi+3gDJ9EFX7uKYxXhcG8RiPOZufX381NMCdDQxki6litJS8tyZ60T3L1gWULtXTgdQu5fwAqj2fks0qb9wkQP7KV35ewAAAABJRU5ErkJggg==);"><div style="text-align:center;font-size:9px;">PS</div></div>');
            var $c = $('<div id="PS40" title="PS" style="display: inline-block; height: 20px; width: 20px; background-size: 20px; background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAYAAAA6RwvCAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABZ0RVh0Q3JlYXRpb24gVGltZQAxMS8wOS8xNWB5Zg4AAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzbovLKMAAAB/ElEQVRYhe2YPWjbQBiGnwvJEPCQzaM2TR27FDxoz6ItSyEeuha6du6Q1aarA+pUuhlKdlEKXQrt0EWeLDK0WWICIYE45OtgnTifT6otJKShLxycDt17D9/96DspEaEL2q/acabUAHhuNf/2RT5V8VO7RGSm1BkwBPqAKnn1D3ABvPNF0tpAZkpNgFN2j6AAX4DTfwGVgmTh/wwc7Qhg6xF4WTZthSAzpU6Aj1hT0AtDemHIYRBw4HlrfZZpyn0cczudcjudumzPfZFXzgFFZKMkcJLAUwKiy2UQyMN8LtvqYT6XyyAQ0yMrE9eYLoiBDXE9Gm0NYOt6NHLBvNkGZGF2uomiyhBaN1Fkgzwl4BWCJDCpKxK2HJH5UQayNNdE3XKsmYEee8/YJWcY50Q/iop2WmU5PN/ryp7RONSVXhhubM06dOB59MLQbHrmAumbIE3J8t7PDs0VSPaQH1yHQdAYiMP7OAfB+oo2MS0l3i9MkNb1H8SWBvluNi7TrXKZSnJ4f8tBfJGvrJIYAO7juDEQh/dFDpLpSlcKcolaZHk/ZkFYA4nMl5uYnmWa2iC/dCUH8UXeskrpALgaDmsHcXi+3gDJ9EFX7uKYxXhcG8RiPOZufX381NMCdDQxki6litJS8tyZ60T3L1gWULtXTgdQu5fwAqj2fks0qb9wkQP7KV35ewAAAABJRU5ErkJggg==);"><div style="text-align:center;font-size:9px;">PS</div></div>');
            $c[0].onclick = function () {
                setSpeed(40);
                onRoadTypeButtonClick('PS');
                setLock(1);
            };
            bootstrap(
                function () { return $(".full-address").exists(); },
                function () { $(".full-address").append($c); }
            );
        }

        //> Opens a new MDM window on current position
        function go2GMDM() {
            log("opening MDM", 2);
            var link = $(".permalink")[0].href;
            //> Extracts coordinates from element inner text and encode them into base64
            window.open("http://gaia.inegi.org.mx/mdm6/?v=" + btoa("lat:" + getQueryString(link, 'lat') + ",lon:" + getQueryString(link, 'lon') + ",z:" + (parseInt(getQueryString(link, 'zoom')) + 8)));
        }

        //> Opens a new Google Maps window on current position
        function go2GMaps() {
            log("opening GMaps", 2);
            var link = $(".fa.fa-link.permalink")[0].href;
            window.open("https://www.google.com/maps/@" + getQueryString(link, 'lat') + "," + getQueryString(link, 'lon') + "," + (parseInt(getQueryString(link, 'zoom')) + 12) + "z");
        }

        //> Taken from WME Permalink to serveral Maps by AlexN-114
        function getQueryString(link, name) {
            var pos = link.indexOf(name + '=') + name.length + 1;
            var len = link.substr(pos).indexOf('&');
            if (-1 == len) len = link.substr(pos).length;
            return link.substr(pos, len);
        }

        function selectUnder() {
            if (W.selectionManager.selectedItems.length > 0) {
                log("selecting under", 2);
                var toSelect = [];
                var newItem = W.selectionManager.selectedItems[W.selectionManager.selectedItems.length - 1].model;
                if (newItem.state == "Insert" && (newItem.type == "mapComment" || newItem.type == "segment")) {
                    for (var prop in W.model.segments.objects) {
                        var segment = W.model.segments.get(prop);
                        if (newItem.attributes.geometry.intersects(segment.attributes.geometry))
                            toSelect.push(segment);
                    }
                    W.selectionManager.select(toSelect);
                    W.model.actionManager.undo();
                }
            }
        }

        function getConnectedSegmentIDs(segmentID) {
            var IDs = [];
            var segment = W.model.segments.get(segmentID);
            [W.model.nodes.get(segment.attributes.fromNodeID), W.model.nodes.get(segment.attributes.toNodeID)].forEach(function (node) {
                if (node) {
                    node.attributes.segIDs.forEach(function (segID) {
                        if (segID !== segmentID) { IDs.push(segID); }
                    });
                }
            });
            return IDs;
        }

        function getFirstConnectedStateID(startSegment) {
            var stateID = null;
            var nonMatches = [];
            var segmentIDsToSearch = [startSegment.attributes.id];
            while (stateID === null && segmentIDsToSearch.length > 0) {
                var startSegmentID = segmentIDsToSearch.pop();
                startSegment = W.model.segments.get(startSegmentID);
                var connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
                for (var i = 0; i < connectedSegmentIDs.length; i++) {
                    var streetID = W.model.segments.get(connectedSegmentIDs[i]).attributes.primaryStreetID;
                    if (streetID !== null && typeof (streetID) !== 'undefined') {
                        var cityID = W.model.streets.get(streetID).cityID;
                        stateID = W.model.cities.get(cityID).attributes.stateID;
                        break;
                    }
                }

                if (stateID === null) {
                    nonMatches.push(startSegmentID);
                    connectedSegmentIDs.forEach(function (segmentID) {
                        if (nonMatches.indexOf(segmentID) === -1 && segmentIDsToSearch.indexOf(segmentID) === -1) {
                            segmentIDsToSearch.push(segmentID);
                        }
                    });
                } else {
                    return stateID;
                }
            }
            return null;
        }

        function getFirstConnectedCityID(startSegment) {
            var cityID = null;
            var nonMatches = [];
            var segmentIDsToSearch = [startSegment.attributes.id];
            while (cityID === null && segmentIDsToSearch.length > 0) {
                var startSegmentID = segmentIDsToSearch.pop();
                startSegment = W.model.segments.get(startSegmentID);
                var connectedSegmentIDs = getConnectedSegmentIDs(startSegmentID);
                for (var i = 0; i < connectedSegmentIDs.length; i++) {
                    var streetID = W.model.segments.get(connectedSegmentIDs[i]).attributes.primaryStreetID;
                    if (streetID !== null && typeof (streetID) !== 'undefined') {
                        cityID = W.model.streets.get(streetID).cityID;
                        break;
                    }
                }

                if (cityID === null) {
                    nonMatches.push(startSegmentID);
                    connectedSegmentIDs.forEach(function (segmentID) {
                        if (nonMatches.indexOf(segmentID) === -1 && segmentIDsToSearch.indexOf(segmentID) === -1) {
                            segmentIDsToSearch.push(segmentID);
                        }
                    });
                } else {
                    return cityID;
                }
            }
            return null;
        }

        function getEmptyCity(stateID) {
            log("getEmptyCity(stateID:" + stateID + ")", 3);
            var emptyCity = null;
            W.model.cities.getObjectArray().forEach(function (city) {
                if (city.attributes.stateID === stateID && city.attributes.isEmpty) {
                    emptyCity = city;
                }
            });
            return emptyCity;
        }
        function getCity(cityID) {
            log("getCity(cityID:" + cityID + ")", 3);
            var cities = W.model.cities.getByIds([cityID]);
            if (cities.length > 0) {
                return cities[0];
            } else {
                return null;
            }
        }

        function setNoStreet(streetName) {
            var segments = W.selectionManager.selectedItems;
            if (segments.length === 0 || segments[0].model.type !== 'segment') {
                return;
            }

            segments.forEach(function (segment) {
                var segModel = segment.model;
                if (streetName || segModel.attributes.primaryStreetID === null) {
                    log("Setting Street", 2);
                    var stateID = getFirstConnectedStateID(segment.model);
                    log("Setting Street stateID:" + stateID, 3);
                    if (stateID) {
                        var state = W.model.states.get(stateID);
                        var country = W.model.countries.get(state.countryID);

                        var m_action = new MultiAction();
                        var cityToSet;
                        m_action.setModel(W.model);
                        cityToSet = getCity(getFirstConnectedCityID(segment.model));
                        if (!cityToSet) cityToSet = getEmptyCity(state.id);
                        if (!cityToSet) {
                            log("Setting Street Creating new empty city.", 3);
                            var addCityAction = new AddOrGetCity(state, country, "", true);
                            m_action.doSubAction(addCityAction);
                            cityToSet = getEmptyCity(state.id);
                        }
                        var newStreet;
                        var isEmpty = streetName == null;
                        if (streetName) newStreet = { name: streetName, cityID: cityToSet.attributes.id };
                        else newStreet = { isEmpty: true, cityID: cityToSet.attributes.id };
                        var street = W.model.streets.getByAttributes(newStreet)[0];
                        if (!street) {
                            streetName = streetName || "";

                            log("Setting Street Creating new street:" + streetName, 3);
                            var addStreetAction = new AddOrGetStreet(streetName, cityToSet, isEmpty);
                            m_action.doSubAction(addStreetAction);
                            street = W.model.streets.getByAttributes(newStreet)[0];
                        }
                        var action3 = new UpdateObject(segModel, { primaryStreetID: street.id });
                        m_action.doSubAction(action3);
                        W.model.actionManager.add(m_action);
                    }
                }
            });
        }

        function setSpeed(speed) {
            if (!$("input[name=fwdMaxSpeed]").prop('disabled')
                && !$("input[name=revMaxSpeed]").prop('disabled')) {

                log("setSpeed: " + speed, 3);

                //waze is set to the correct country unit
                $("input[name=fwdMaxSpeed]").val(speed).change();
                $("input[name=revMaxSpeed]").val(speed).change();

                // Check the verified boxes
                if ($("#fwdMaxSpeedUnverifiedCheckbox")) $("#fwdMaxSpeedUnverifiedCheckbox").prop("checked", true);
                if ($("#revMaxSpeedUnverifiedCheckbox")) $("#revMaxSpeedUnverifiedCheckbox").prop("checked", true);
            }
        }

        function pasteStreet() {
            log("pasting street name.", 1);
            var streetName = "";
            chrome.runtime.sendMessage(
                extensionId,
                { id: "getData" },
                function (response) {
                    log("pasting street:" + JSON.stringify(response), 3);
                    streetName = response.data;
                    setNoStreet(streetName);
                });
        }

        function onRoadTypeButtonClick(roadTypeAbbr) {
            $(_roadTypeDropDownSelector).val(_roadTypes[roadTypeAbbr].val).change();
        }

        function setLock(lock) {
            $(_lockDropDownSelector).val(lock).change();
        }

        bootstrap(
            function () {
                return window.W &&
                    window.W.map &&
                    window.W.model &&
                    require &&
                    $;
            },
            init);
    } + ')();';

    var script = document.createElement('script');
    script.textContent = code;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
})();