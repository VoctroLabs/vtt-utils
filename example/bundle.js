(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
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

    var speakersModels = new Object();

    for (var i = 0; i < speakers.length; i++) {
        speakersModels[speakers[i].id] = speakers[i].value;
    }

    document.getElementById("outputJsonText").value = vttutils.getAsJSON("EN", JSON.stringify(speakersModels), "neutral", vttText);
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

},{"./../vtt-utils":6}],2:[function(require,module,exports){
'use strict';

const parse = require('./lib/parser').parse;
const segment = require('./lib/segmenter').segment;
const hls = require('./lib/hls');

module.exports = { parse, segment, hls };

},{"./lib/hls":3,"./lib/parser":4,"./lib/segmenter":5}],3:[function(require,module,exports){
'use strict';

const segment = require('./segmenter').segment;

function hlsSegment (input, segmentLength, startOffset) {

  if (typeof startOffset === 'undefined') {
    startOffset = '900000';
  }

  const segments = segment(input, segmentLength);

  const result = [];
  segments.forEach((seg, i) => {

    const content = `WEBVTT
X-TIMESTAMP-MAP=MPEGTS:${startOffset},LOCAL:00:00:00.000

${printableCues(seg.cues)}
`;
    const filename = generateSegmentFilename(i);
    result.push({ filename, content });
  });
  return result;
}

function hlsSegmentPlaylist (input, segmentLength) {

  const segmented = segment(input, segmentLength);

  const printable = printableSegments(segmented);
  const longestSegment = Math.round(findLongestSegment(segmented));

  const template = `#EXTM3U
#EXT-X-TARGETDURATION:${longestSegment}
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
${printable}
#EXT-X-ENDLIST
`;
  return template;
}

function pad (num, n) {
  const padding = '0'.repeat(Math.max(0, n - num.toString().length));

  return `${padding}${num}`;
}

function generateSegmentFilename (index) {
  return `${index}.vtt`;
}

function printableSegments (segments) {
  const result = [];
  segments.forEach((seg, i) => {
    result.push(`#EXTINF:${seg.duration.toFixed(5)},
${generateSegmentFilename(i)}`);
  });

  return result.join('\n');
}

function findLongestSegment (segments) {
  let max = 0;
  segments.forEach((seg) => {
    if (seg.duration > max) {
      max = seg.duration;
    }
  });

  return max;
}

function printableCues (cues) {
  const result = [];
  cues.forEach((cue) => {
    result.push(printableCue(cue));
  });

  return result.join('\n\n');
}

function printableCue (cue) {
  const printable = [];

  if (cue.identifier) {
    printable.push(cue.identifier);
  }

  const start = printableTimestamp(cue.start);
  const end = printableTimestamp(cue.end);

  const styles = cue.styles ? `${cue.styles}` : '';

  // always add a space after end timestamp, otherwise JWPlayer will not
  // handle cues correctly
  printable.push(`${start} --> ${end} ${styles}`);

  if (cue.text) {
    printable.push(cue.text);
  }

  return printable.join('\n');
}

function printableTimestamp (timestamp) {
  const ms = (timestamp % 1).toFixed(3);
  timestamp = Math.round(timestamp - ms);
  const hours = Math.floor(timestamp / 3600);
  const mins = Math.floor((timestamp - (hours * 3600)) / 60);
  const secs = timestamp - (hours * 3600) - (mins * 60);

  // TODO hours aren't required by spec, but we include them, should be config
  const hourString = `${pad(hours, 2)}:`;
  return `${hourString}${pad(mins, 2)}:${pad(secs, 2)}.${pad(ms * 1000, 3)}`;
}

module.exports = { hlsSegment, hlsSegmentPlaylist };

},{"./segmenter":5}],4:[function(require,module,exports){
'use strict';

function ParserError (message, error) {
  this.message = message;
  this.error = error;
}
ParserError.prototype = Object.create(Error.prototype);

const TIMESTAMP_REGEXP = /([0-9]{1,2})?:?([0-9]{2}):([0-9]{2}\.[0-9]{3})/;

function parse (input) {

  if (typeof input !== 'string') {
    throw new ParserError('Input must be a string');
  }

  input = input.replace(/\r\n/g, '\n');
  input = input.replace(/\r/g, '\n');

  const parts = input.split('\n\n');

  const header = parts.shift();

  if (!header.startsWith('WEBVTT')) {
    throw new ParserError('Must start with "WEBVTT"');
  }

  const headerParts = header.split('\n');

  // nothing of interests, return early
  if (parts.length === 0 && headerParts.length === 1) {
    return { valid: true };
  }

  if (headerParts.length > 1 && headerParts[1] !== '') {
    throw new ParserError('No blank line after signature');
  }

  const cues = parseCues(parts);

  return { valid: true, cues };
}

function parseCues (cues) {
  return cues.map(parseCue);
}

function parseCue (cue, i) {
  let identifier = '';
  let start = 0;
  let end = 0;
  let text = '';
  let styles = '';

  // split and remove empty lines
  const lines = cue.split('\n').filter(Boolean);

  if (lines.length === 1 && !lines[0].includes('-->')) {
    throw new ParserError(`Cue identifier cannot be standalone (cue #${i})`);
  }

  if (lines.length > 1 &&
      !(lines[0].includes('-->') || lines[1].includes('-->'))) {
    const msg = `Cue identifier needs to be followed by timestamp (cue #${i})`;
    throw new ParserError(msg);
  }

  if (lines.length > 1 && lines[1].includes('-->')) {
    identifier = lines.shift();
  }

  if (lines.length > 0 && lines[0].includes('-->')) {
    const times = lines[0].split(' --> ');

    if (times.length !== 2 ||
        !validTimestamp(times[0]) ||
        !validTimestamp(times[1])) {
      throw new ParserError(`Invalid cue timestamp (cue #${i})`);
    }

    start = parseTimestamp(times[0]);
    end = parseTimestamp(times[1]);

    if (start > end) {
      throw new ParserError(`Start timestamp greater than end (cue #${i})`);
    }

    if (end <= start) {
      throw new ParserError(`End must be greater than start (cue #${i})`);
    }

    // TODO better style validation
    styles = times[1].replace(TIMESTAMP_REGEXP, '').trim();

    lines.shift();
  }

  text = lines.join('\n');

  return { identifier, start, end, text, styles };
}

function validTimestamp (timestamp) {
  return TIMESTAMP_REGEXP.test(timestamp);
}

function parseTimestamp (timestamp) {
  const matches = timestamp.match(TIMESTAMP_REGEXP);

  let secs = parseFloat(matches[3]);
  secs += parseFloat(matches[2]) * 60; // mins
  secs += parseFloat(matches[1] || 0) * 60 * 60; // hours
  return secs;
}

module.exports = { ParserError, parse };

},{}],5:[function(require,module,exports){
'use strict';

const parse = require('./parser').parse;

function segment (input, segmentLength) {
  segmentLength = segmentLength || 10;

  const parsed = parse(input);
  const segments = [];

  let cues = [];
  let queuedCue = null;
  let currentSegmentDuration = 0;
  let totalSegmentsDuration = 0;

  /**
   * One pass segmenting of cues
   */
  parsed.cues.forEach((cue, i) => {
    const firstCue = i === 0;
    const lastCue = i === parsed.cues.length - 1;
    const start = cue.start;
    const end = cue.end;
    const nextStart = lastCue ? Infinity : parsed.cues[i + 1].start;
    const cueLength = firstCue ? end : end - start;
    const silence = firstCue ? 0 : (start - parsed.cues[i - 1].end);

    currentSegmentDuration = currentSegmentDuration + cueLength + silence;

    debug('------------');
    debug(`Cue #${i}, segment #${segments.length + 1}`);
    debug(`Start ${start}`);
    debug(`End ${end}`);
    debug(`Length ${cueLength}`);
    debug(`Total segment duration = ${totalSegmentsDuration}`);
    debug(`Current segment duration = ${currentSegmentDuration}`);
    debug(`Start of next = ${nextStart}`);

    // if there's a boundary cue queued, push and clear queue
    if (queuedCue) {
      cues.push(queuedCue);
      currentSegmentDuration += queuedCue.end - totalSegmentsDuration;
      queuedCue = null;
    }

    cues.push(cue);

    // if a cue passes a segment boundary, it appears in both
    let shouldQueue = nextStart - end < segmentLength &&
                        silence < segmentLength &&
                        currentSegmentDuration > segmentLength;

    if (shouldSegment(totalSegmentsDuration, segmentLength, nextStart,
                      silence)) {

      const duration = segmentDuration(lastCue, end, segmentLength,
                                       currentSegmentDuration,
                                       totalSegmentsDuration);

      segments.push({ duration, cues });

      totalSegmentsDuration += duration;
      currentSegmentDuration = 0;
      cues = [];
    } else {
      shouldQueue = false;
    }

    if (shouldQueue) {
      queuedCue = cue;
    }
  });

  return segments;
}

function shouldSegment (total, length, nextStart, silence) {

  // this is stupid, but gets one case fixed...
  const x = alignToSegmentLength(silence, length);
  const nextCueIsInNextSegment = silence <= length ||
                                 x + total < nextStart;


  return nextCueIsInNextSegment && nextStart - total >= length;
}

function segmentDuration (lastCue, end, length, currentSegment, totalSegments) {
  let duration = length;

  if (currentSegment > length) {
    duration = alignToSegmentLength(currentSegment - length, length);
  }

  // make sure the last cue covers the whole time of the cues
  if (lastCue) {
    duration = parseFloat((end - totalSegments).toFixed(2));
  } else {
    duration = Math.round(duration);
  }

  return duration;
}

function alignToSegmentLength (n, segmentLength) {
  n += segmentLength - n % segmentLength;
  return n;
}

const debugging = false;
function debug (m) {
  if (debugging) {
    console.log(m);
  }
}

module.exports = { segment };

},{"./parser":4}],6:[function(require,module,exports){
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

function createTextFromCues(cues)
{
    var NEWLINE = "\r\n";
    var ARROW =  " --> ";
    var outputText = "WEBVTT" + NEWLINE + NEWLINE;
    for (var i = 0; i < cues.length - 1; i++) {
        outputText += (i+1).toString() + NEWLINE +  formatTime(cues[i].start) + ARROW + formatTime(cues[i].end) + NEWLINE + cues[i].text + NEWLINE + NEWLINE;
    }

    outputText += (cues.length - 1).toString() + NEWLINE +  formatTime(cues[cues.length - 1].start) + ARROW + formatTime(cues[cues.length - 1].end) + NEWLINE + cues[cues.length - 1].text + NEWLINE;

    return outputText;
}

class Sentence {
    constructor() { //default constructor
        this.text = "";
        this.start = 0.0;
        this.end = 0.0;
    }
}

class SpeakerContent {
    constructor(language, model, defaultStyle) { // constructor
        this.language = language;
        this.model = model;
        this.defaultStyle = defaultStyle;
        this.sentences = [];
    }
}

module.exports = {

    /**
     * Generates a VTT-formatted subtitle from a SRT text
     * @param  {String} inputSrtText Input subtitle text, in SRT format
     * @return {String}              Output subtitle text, in VTT format
     */
    srtToVtt: function (inputSrtText){
        // Change commas in text
        var reg = /[0-9](,)[0-9]/g;
        var commasMatches = inputSrtText.match(reg);

        for (var i = 0; i < commasMatches.length; i++) {
            inputSrtText = inputSrtText.replace(commasMatches[i], commasMatches[i].replace(',','.'));
        }

        var NEWLINE = "\r\n";
        var outputText = "WEBVTT" + NEWLINE + NEWLINE + inputSrtText.trim() + NEWLINE;
        return outputText;
    },

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
                if (cue.text.indexOf('<v') < 0) {
                    cue.text = currentVoiceTag + cue.text;
                }
                newCues.push(cue);
            }
        }

        return createTextFromCues(newCues);
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

    assignStyleToCue: function (inputVttText, style, cueIdx){
        cueIdx = parseInt(cueIdx) - 1;
        var emphTag = "<emphasis level=\"" + style + "\">";
        var reg = /<emphasis level\=\".*\">/

        var inputVtt = webvtt.parse(inputVttText);

        if (inputVtt.cues[cueIdx].text.search(reg) >= 0) {
            inputVtt.cues[cueIdx].text = inputVtt.cues[cueIdx].text.replace(inputVtt.cues[cueIdx].text.match(reg)[0], emphTag);
        } else {
            inputVtt.cues[cueIdx].text = emphTag + inputVtt.cues[cueIdx].text + "</emphasis>";
        }

        return createTextFromCues(inputVtt.cues);
    },

    getSpeakers: function(vttText){
        var speakers = [];

        const vtt = webvtt.parse(vttText);
        var reg = /\<v.*?\=.*?(.*?)\>/;

        for (var i = 0; i < vtt.cues.length; i++) {
            var regMatch = vtt.cues[i].text.match(reg)
            var speaker = regMatch[1].trim();

            if (speakers.indexOf(speaker) < 0) {
                speakers.push(speaker);
            }
        }

        return speakers;
    },

    /**
    * Generates JSON-formatted to generate synthesis with voiceful
    * @param  {String} language Language identifier
    * @param  {String} modelsString   Speakers-voice models correspondence (e.g. {"Speaker1": "modelId1", "Speaker2": "modelId2"})
    * @param  {String} vttText  Subtitle text, in VTT format
    * @return {String}          JSON-formatted string for synthesis
    */
    getAsJSON: function(language, modelsString, defaultStyle, vttText){
        var output = new Object();
        output.speakers = new Object();

        var models = JSON.parse(modelsString);

        const vtt = webvtt.parse(vttText);
        var reg = /\<v.*?\=.*?(.*?)\>/;

        for (var i = 0; i < vtt.cues.length; i++) {
            var regMatch = vtt.cues[i].text.match(reg)
            var speaker = regMatch[1].trim();
            if (!output.speakers.hasOwnProperty(speaker)) {
                output.speakers[speaker] = new SpeakerContent(language, models[speaker], defaultStyle);
            }

            var sentence = new Sentence();
            sentence.text = vtt.cues[i].text.replace(regMatch[0], '');
            sentence.start = vtt.cues[i].start;
            sentence.end = vtt.cues[i].end;

            output.speakers[speaker].sentences.push(sentence);
        }

        return JSON.stringify(output);
    }
};

},{"node-webvtt":2}]},{},[1]);
