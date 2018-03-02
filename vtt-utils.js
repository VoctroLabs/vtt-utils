const webvtt = require('node-webvtt');

function formatTime(duration) {
    var seconds = parseInt((duration)%60)
        , minutes = parseInt((duration/(60))%60)
        , hours = parseInt((duration/(60*60))%24)
        , milliseconds = parseInt((duration - seconds) * 1000);


    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
    milliseconds = (milliseconds < 100) ? (milliseconds < 10) ? "00" + milliseconds : "0" + milliseconds : milliseconds;

    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

module.exports = {
    /**
    * Parses an input subtitle provided as text and output the subtitle with sentence per cue
    * @param  {String} inputVttText Input subtitle text, in VTT format
    * @return {String}              Output subtitle text, in VTT format
    */
    parseToSentences: function (inputVttText){
        const inputVtt = webvtt.parse(inputVttText);

        var newCues = [];

        for (var i = 0; i < inputVtt.cues.length; i++) {
            var cue = inputVtt.cues[i];
            // remove voice closing tags, unnecessary since we are going to have a single voice per cue
            cue.text = cue.text.replace(/<\/v>/g, '');
            var endsWithPoint = false;

            var currentVoiceTag;
            if (cue.text.indexOf('<v') >= 0) {
                currentVoiceTag = cue.text.substring(cue.text.indexOf('<v'), cue.text.indexOf('>') + 1);
            } else { //default
                currentVoiceTag = '<v = Speaker1>';
            }

            // more than one sentence in fragment
            var separators = ["\\\. ", "\\\? ", "\\\! "];
            var reg = new RegExp(separators.join('|'), 'g');
            if (cue.text.indexOf(". ") >= 0 || cue.text.indexOf("? ") >= 0 || cue.text.indexOf("! ") >= 0) {
                var sentences = cue.text.split(reg);
                var tokens = cue.text.match(reg);
                for (var j = 0; j < sentences.length; j++) {
                    if (j < sentences.length -1){
                        sentences[j] += tokens[j];
                    }
                    var newCue = Object.assign({}, cue);
                    if (sentences[j].indexOf('<v') >= 0) {
                        currentVoiceTag = sentences[j].substring(sentences[j].indexOf('<v'), sentences[j].indexOf('>') + 1);
                        newCue.text = sentences[j];
                    } else {
                        newCue.text = currentVoiceTag + sentences[j];
                    }

                    newCue.text = newCue.text.trim();

                    if (['.', '?', '!'].indexOf(newCue.text.slice(-1)) == -1){
                        newCue.text += ".";
                    }

                    newCue.start = cue.start + j*(cue.end - cue.start)/sentences.length;
                    newCue.end = cue.start + (j+1)*(cue.end - cue.start)/sentences.length;
                    newCues.push(newCue);
                }
            }

            // Fragment does not contain a complete sentence
            else if (cue.text.slice(-1) != ".") {
                foundPoint = false;
                var cueIdx = 1;
                while (!foundPoint) {
                    var nextCue = inputVtt.cues[i+cueIdx];
                    // Next fragment has several sentences. We take the end of 1st and continue
                    if (nextCue.text.search("\\. ") >= 0) {
                        foundPoint = true;
                        var newCue = Object.assign({}, cue);
                        newCue.text = cue.text + nextCue.text.split(". ")[0] + ".";
                        newCue.end = nextCue.start + (j+1)*(nextCue.end - nextCue.start)/nextCue.text.split(". ").length;
                        newCues.push(newCue);
                        inputVtt.cues[i+cueIdx].text = nextCue.text.substring(nextCue.text.search("\\. "));
                        inputVtt.cues[i+cueIdx].start = newCue.end;
                        // Next fragment contains the rest of the sentence
                    } else if (nextCue.text.slice(-1) == ".") {
                        foundPoint = true;
                        var newCue = Object.assign({}, cue);
                        newCue.text += " " + nextCue.text.replace(currentVoiceTag, '');
                        newCue.end = nextCue.end;
                        newCues.push(newCue);
                        i++;
                    } else {
                        cue.text += " " + nextCue.text;
                        cueIdx++;
                    }
                }
            } else {
                newCues.push(cue);
            }
        }

        var NEWLINE = "\r\n";
        var ARROW =  " --> ";
        var outputText = "WEBVTT" + NEWLINE + NEWLINE;
        for (var i = 0; i < newCues.length; i++) {
            newCues[i].identifier = (i+1).toString();
            outputText += newCues[i].identifier + NEWLINE +  formatTime(newCues[i].start) + ARROW + formatTime(newCues[i].end) + NEWLINE + newCues[i].text + NEWLINE + NEWLINE;
        }

        return outputText;
    },

    /**
     * Checks that the start and end times of cues in two VTT subtitles are equal
     * @param  {String} srcVttText    Source subtitle text, in VTT format
     * @param  {String} targetVttText Target subtitle text, in VTT format
     * @return {Boolean}              True if both are equivalent, false otherwise
     */
    checkSubtitlesEquivalency: function (srcVttText, targetVttText){
        const srcVtt = webvtt.parse(srcVttText);
        const targetVtt = webvtt.parse(targetVttText);

        if (srcVtt.cues.length != targetVtt.cues.length) {
            return false;
        }

        for (var i = 0; i < srcVtt.cues.length; i++) {
            if (srcVtt.cues[i].start != targetVtt.cues[i].start || srcVtt.cues[i].end != targetVtt.cues[i].end){
                return false;
            }
        }

        return true;
    },

    /**
     * Generates JSON-formatted to generate synthesis with voiceful
     * @param  {String} language Language identifier
     * @param  {String} modelId  Voice model identifier
     * @param  {String} vttText  Subtitle text, in VTT format
     * @return {String}          JSON-formatted string for synthesis
     */
    getAsJSON: function(language, modelId, vttText){
        var output = new Object();
        output.speakers = [];

        return [];
    }
};
