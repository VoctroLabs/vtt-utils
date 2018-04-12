//  run "browserify clientExample.js -o bundle.js" to generate bundle.js for index.html

var vttutils = require('../lib/vtt-utils');

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

    var speakers = vttutils.getSpeakers(document.getElementById("outputSubtitleText").value);

    var speakersDiv = document.getElementById("speakersDiv");
    speakersDiv.innerHTML = "";
    var title = document.createElement("h4");
    title.innerHTML = "Speakers - models";
    speakersDiv.appendChild(title);

    for (var i = 0; i < speakers.length; i++) {
        var label = document.createTextNode(speakers[i]);
        var textInput = document.createElement("input");
        textInput.id = speakers[i];
        textInput.type = "text";
        speakersDiv.appendChild(label);
        speakersDiv.appendChild(textInput);
        var newLine = document.createElement("br");
        speakersDiv.appendChild(newLine);
    }

    var newLine = document.createElement("br");
    speakersDiv.appendChild(newLine);
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

    var speakersDiv = document.getElementById("speakersDiv");
    var speakers = speakersDiv.getElementsByTagName("input");

    var speakersModels = [];

    for (var i = 0; i < speakers.length; i++) {
        if (speakers[i].value === "") {
            speakersModels.push([speakers[i].id, null, "neutral"]);
        } else {
            speakersModels.push([speakers[i].id, speakers[i].value, "neutral"]);
        }

    }

    document.getElementById("outputJsonText").value = vttutils.getAsJSON("en", JSON.stringify(speakersModels), vttText);
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
