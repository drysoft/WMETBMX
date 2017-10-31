/**
 * Retrieve the current content of the system clipboard.
 */
function getContentFromClipboard() {
    var result = '';
    var sandbox = document.getElementById('sandbox');
    sandbox.value = '';
    sandbox.select();
    if (document.execCommand('paste')) {
        result = sandbox.value;
        console.log('got value from sandbox: ' + result);
    }
    sandbox.value = '';
    return result;
}

function copyToClipboard(str) {
    console.log("setting sandbox val");
    var sandbox = document.getElementById('sandbox');
    sandbox.value = str;
    sandbox.select();
    if (document.execCommand('copy')) {
        console.log("sending value to clipboard:" + str);
    }
    sandbox.value = "";
}

chrome.runtime.onMessageExternal.addListener(
    function (request, sender, sendResponse) {
        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");
        if (request.id == "getData")
            sendResponse({ data: getContentFromClipboard() });
        else if (request.id == "setData")
            copyToClipboard(request.data);
    });

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");
        console.log(request);
        if (request.id == "getData")
            sendResponse({ data: getContentFromClipboard() });
        else if (request.id == "setData")
            copyToClipboard(request.data);
    });

console.log("My tools background is running.");