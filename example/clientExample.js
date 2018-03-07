//  run "browserify clientExample.js -o bundle.js" to generate bundle.js for index.html

var vttutils = require('./../vtt-utils');

function loadFileAsText()
{
    var fileToLoad = document.getElementById("fileToLoad").files[0];

    var fileReader = new FileReader();
    fileReader.onload = function(fileLoadedEvent)
    {
        var textFromFileLoaded = fileLoadedEvent.target.result;
        document.getElementById("inputSubtitleText").value = textFromFileLoaded;
    };
    fileReader.readAsText(fileToLoad, "UTF-8");
}

function parseSubtitle()
{
    var inputVttText = document.getElementById("inputSubtitleText").value;

    document.getElementById("outputSubtitleText").value = vttutils.parseToSentences(inputVttText);
}

function assignStyle()
{
    var style = document.getElementById("styleCombo").value;
    var cueIdx = document.getElementById("cueIdx").value;
    var inputVtt = document.getElementById("outputSubtitleText").value;

    document.getElementById("outputSubtitleText").value = vttutils.assignStyleToCue(inputVtt, style, cueIdx);
}

function generateJson()
{
    var vttText = document.getElementById("outputSubtitleText").value;

    document.getElementById("outputJsonText").value = vttutils.getAsJSON("EN", "model1", "neutral", vttText);
}

function toVTT()
{
    document.getElementById("inputSubtitleText").value = vttutils.srtToVtt(document.getElementById("inputSubtitleText").value);
}

window.onload = function() {
    document.getElementById("fileToLoad").addEventListener("change", loadFileAsText);
    document.getElementById("parseButton").addEventListener("click", parseSubtitle);
    document.getElementById("assignStyleButton").addEventListener("click", assignStyle);
    document.getElementById("generateJsonButton").addEventListener("click", generateJson);
    document.getElementById("toVTTButton").addEventListener("click", toVTT);
};
