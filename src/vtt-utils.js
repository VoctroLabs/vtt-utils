import webvtt from '@voctrolabs/node-webvtt';

const regExps = {
    speaker: /<v.*?(.*?)>/, // https://www.w3.org/TR/webvtt1/#webvtt-cue-voice-span
    style: /<emphasis level="(?<style>.*)">/,
    tags: /<.*?>/g
};

class FormatError extends Error {}
class CompatibilityError extends Error {}

function formatTime(duration) {
    let seconds = parseInt((duration)%60)
    , minutes = parseInt((duration/(60))%60)
    , hours = parseInt((duration/(60*60))%24)
    , milliseconds = parseInt(((duration)%60 - seconds) * 1000);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
    milliseconds = (milliseconds < 100) ? (milliseconds < 10) ? "00" + milliseconds : "0" + milliseconds : milliseconds;

    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

function createTextFromCues(cues)
{
    let NEWLINE = "\r\n";
    let ARROW =  " --> ";
    let outputText = "WEBVTT" + NEWLINE + NEWLINE;
    for (let i = 0; i < cues.length - 1; i++) {
        outputText += (i+1).toString() + NEWLINE +  formatTime(cues[i].start) + ARROW + formatTime(cues[i].end) + NEWLINE + cues[i].text + NEWLINE + NEWLINE;
    }

    outputText += (cues.length).toString() + NEWLINE +  formatTime(cues[cues.length - 1].start) + ARROW + formatTime(cues[cues.length - 1].end) + NEWLINE + cues[cues.length - 1].text + NEWLINE;

    return outputText;
}

class Sentence {
    constructor(text = "", start = 0.0, end = 0.0) {
        this.text = text;
        this.start = start;
        this.end = end;
    }
}

class SpeakerContent {
    constructor(language, model, defaultStyle) { // constructor
        this.language = language;
        if (model !== null) {
            this.model = model;
        }
        if (defaultStyle !== null) {
            this.defaultStyle = defaultStyle;
        }
        this.sentences = [];
    }
}

function getModelForSpeaker(models, speaker) {
    for (let i = 0; i < models.length; i++) {
        if (models[i][0] === speaker) {
            return models[i][1];
        }
    }
    return undefined;
}

function getDefaultStyleForSpeaker(models, speaker) {
    for (let i = 0; i < models.length; i++) {
        if (models[i][0] === speaker && models[i].length > 2) {
            return models[i][2];
        } else {
            return undefined;
        }
    }
    return undefined;
}

/**
 * Generates a VTT-formatted subtitle from a SRT text
 * @param  {String} inputSrtText Input subtitle text, in SRT format
 * @return {String}              Output subtitle text, in VTT format
 */
function srtToVtt(inputSrtText){
    // Change commas in text
    let reg = /[0-9](,)[0-9]/g;
    let commasMatches = inputSrtText.match(reg);

    for (let i = 0; i < commasMatches.length; i++) {
        inputSrtText = inputSrtText.replace(commasMatches[i], commasMatches[i].replace(',','.'));
    }

    let NEWLINE = "\r\n";
    let outputText = "WEBVTT" + NEWLINE + NEWLINE + inputSrtText.trim() + NEWLINE;
    return outputText;
}

/**
* Parses an input subtitle provided as text and output the subtitle with sentence per cue
* @param  {String} inputVttText Input subtitle text, in VTT format
* @return {String}              Output subtitle text, in VTT format
*/
function parseToSentences(inputVttText){
    let inputVtt;
    try {
        inputVtt = webvtt.parse(inputVttText);
    } catch (e) {
        throw new FormatError(e.message)
    }

    let newCues = [];

    for (let i = 0; i < inputVtt.cues.length; i++) {
        let cue = inputVtt.cues[i];
        // remove voice closing tags, unnecessary since we are going to have a single voice per cue
        cue.text = cue.text.replace(/<\/v>/g, '').trim();
        let endsWithPoint = false;

        let currentVoiceTag;
        if (cue.text.indexOf('<v') >= 0) {
            currentVoiceTag = cue.text.substring(cue.text.indexOf('<v'), cue.text.indexOf('>') + 1);
        } else { //default
            currentVoiceTag = '<v Speaker1>';
        }

        // more than one sentence in fragment
        let separators = ["\\\. ", "\\\? ", "\\\! "];
        let reg = new RegExp(separators.join('|'), 'g');
        if (cue.text.indexOf(". ") >= 0 || cue.text.indexOf("? ") >= 0 || cue.text.indexOf("! ") >= 0) {
            let sentences = cue.text.split(reg);
            let tokens = cue.text.match(reg);
            for (let j = 0; j < sentences.length; j++) {
                if (j < sentences.length -1){
                    sentences[j] += tokens[j];
                }
                let newCue = Object.assign({}, cue);
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
            let foundPoint = false;
            let cueIdx = 1;
            while (!foundPoint) {
                let nextCue = inputVtt.cues[i+cueIdx];
                nextCue.text = nextCue.text.replace(/<\/v>/g, '').trim();
                // Next fragment has several sentences. We take the end of 1st and continue
                if (nextCue.text.search("\\. ") >= 0) {
                    foundPoint = true;
                    let newCue = Object.assign({}, cue);
                    if (cue.text.indexOf('<v') >= 0) {
                        currentVoiceTag = cue.text.substring(cue.text.indexOf('<v'), cue.text.indexOf('>') + 1);
                        newCue.text = cue.text + nextCue.text.split(". ")[0] + ".";
                    } else {
                        newCue.text = currentVoiceTag + cue.text + nextCue.text.split(". ")[0] + ".";
                    }

                    newCue.end = nextCue.start + (nextCue.end - nextCue.start)/nextCue.text.split(". ").length;
                    newCues.push(newCue);
                    inputVtt.cues[i+cueIdx].text = nextCue.text.substring(nextCue.text.search("\\. ") + 2);
                    inputVtt.cues[i+cueIdx].start = newCue.end;
                    // Next fragment contains the rest of the sentence
                } else if (nextCue.text.slice(-1) == ".") {
                    foundPoint = true;
                    let newCue = Object.assign({}, cue);
                    newCue.text += " " + nextCue.text.replace(currentVoiceTag, '');
                    newCue.end = nextCue.end;
                    if (newCue.text.indexOf('<v') < 0) {
                        newCue.text = currentVoiceTag + newCue.text;
                    }
                    newCues.push(newCue);
                    i += cueIdx;
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
}

/**
* Checks that the start and end times of cues in two VTT subtitles are equal
* @param  {String} srcVttText    Source subtitle text, in VTT format
* @param  {String} targetVttText Target subtitle text, in VTT format
* @return {Boolean}              True if both are equivalent, false otherwise
*/
function checkSubtitlesEquivalency(srcVttText, targetVttText){
    var srcVtt;
    try {
        srcVtt = webvtt.parse(srcVttText);
    } catch (e) {
        throw new FormatError('Error in src subtitle: ' + e.message)
    }

    var targetVtt;
    try {
        targetVtt = webvtt.parse(targetVttText);
    } catch (e) {
        throw new FormatError('Error in target subtitle: ' + e.message)
    }

    if (srcVtt.cues.length != targetVtt.cues.length) {
        throw new CompatibilityError('Subtitles have different number of cues (' + srcVtt.cues.length.toString() + ' and ' + targetVtt.cues.length + ')')
    }

    for (let i = 0; i < srcVtt.cues.length; i++) {
        if (srcVtt.cues[i].start != targetVtt.cues[i].start || srcVtt.cues[i].end != targetVtt.cues[i].end){
            throw new CompatibilityError('Start and end times differ at cue ' + (i+1).toString())
        }
    }

    return true;
}

/**
 * Assigns a style to the cue in position cueIdx for the VTT-formatted subtitle inputVttText by adding a '<emphasis level="style">' tag to the cue.
 * @param  {String} inputVttText Input subtitle text, in VTT format
 * @param  {String} style        Name of the style for the cue (e.g: 'neutral', 'sad', 'aggresive'...)
 * @param  {Number} cueIdx       Index of the cue where the style must be applied
 * @return {String}              inputVttText modified
 */
function assignStyleToCue(inputVttText, style, cueIdx){
    cueIdx = parseInt(cueIdx);
    const inputVtt = webvtt.parse(inputVttText);
    const emphTag = "<emphasis level=\"" + style + "\">";
    const match = regExps['style'].exec(inputVtt.cues[cueIdx].text);
    if (match) {
        inputVtt.cues[cueIdx].text = inputVtt.cues[cueIdx].text.replace(match[0], emphTag);
    } else {
        inputVtt.cues[cueIdx].text = emphTag + inputVtt.cues[cueIdx].text + "</emphasis>";
    }

    return createTextFromCues(inputVtt.cues);
}

function getSpeaker(cueText) {
    const match = regExps['speaker'].exec(cueText);
    return match[1].trim();
}

/**
 * Returns the different speakers present in the VTT formated subtitle vttText, looking at the voice ('<v>') tags in the cues.
 * @param  {String}     vttText Subtitle text, in VTT format
 * @return {String[]}           Array of speakers
 */
function getSpeakers(vttText){
    const vtt = webvtt.parse(vttText);
    const speakers = new Map();
    vtt.cues.forEach(cue => speakers.set(getSpeaker(cue.text), true));
    return Array.from(speakers.keys());
}

// Return the style of a cue
function getStyle(cueText) {
    const match = regExps['style'].exec(cueText);
    return match? match[1] : match;
}

/**
* Generates JSON-formatted to generate synthesis with voiceful
* @param  {String}  language        Language identifier
* @param  {String}  modelsString    Array with speakers-voice models-(optional)defaultStyle correspondence (e.g. '[["speaker1","model1","style1"],["speaker2","model2"]]')
* @param  {String}  vttText         Subtitle text, in VTT format
* @return {String}                  JSON-formatted string for synthesis
*/
function getAsJSON(language, modelsString, vttText){
    let output = new Object();
    output.speakers = new Object();

    const models = JSON.parse(modelsString);

    const vtt = webvtt.parse(vttText);

    for (let i = 0; i < vtt.cues.length; i++) {
        const cue = vtt.cues[i];
        const speaker = getSpeaker(cue.text);
        if (!output.speakers.hasOwnProperty(speaker)) {
            output.speakers[speaker] = new SpeakerContent(
              language, getModelForSpeaker(models, speaker), getDefaultStyleForSpeaker(models, speaker));
        }

        const sentence = new Sentence(removeSpeaker(cue.text), cue.start, cue.end);
        output.speakers[speaker].sentences.push(sentence);
    }

    return JSON.stringify(output);
}

/**
 * Return the text of a cue without speaker tag
 * @param  {String} cueText Text from a sentence of a subtitle
 * @return {String}              cueText without the speaker tag
 */
function removeSpeaker(cueText) {
    return cueText.replace(regExps['speaker'], '');
}

/**
 * Return the text of a cue without any tags
 * @param  {String} cueText Text from a sentence of a subtitle
 * @return {String}              cueText without tags
 */
function removeTags(cueText) {
  return cueText.replace(regExps['tags'], '');
}

/**
 * Return noise gate values as string to introduce in VoMix effect
 * @param  {String} vttText Subtitle text, in VTT format
 * @param  {Number} transitionTime Transition time, in seconds
 * @return {String}              Noise gate values as string to introduce in JSON
 */
function generateNoiseGateString(vttText, transitionTime)
{
    const vtt = webvtt.parse(vttText);
    let points = [];

    for (var i = 0; i < vtt.cues.length; i++) {
        // Check if we need to add in points
        let currentStart = vtt.cues[i].start;
        let currentEnd = vtt.cues[i].end;
        let previousEnd = 0.0;
        if (i > 0) {
            previousEnd = vtt.cues[i-1].end;
        }
        let nextStart = vtt.cues[i].end + transitionTime;
        if (i < vtt.cues.length - 1) {
            nextStart = vtt.cues[i+1].start;
        }

        if (currentStart - transitionTime > previousEnd + transitionTime) {
            points.push([currentStart-transitionTime, 1.0]);
            points.push([currentStart, 0.0]);
        }

        // Check if we need to add out points
        if (currentEnd + transitionTime < nextStart - transitionTime){
            points.push([currentEnd, 0.0]);
            points.push([currentEnd+transitionTime, 1.0]);
        }
    }

    return JSON.stringify(points);
}

export default {
    CompatibilityError,
    FormatError,
    assignStyleToCue,
    checkSubtitlesEquivalency,
    generateNoiseGateString,
    getSpeaker,
    getSpeakers,
    getStyle,
    getAsJSON,
    parseToSentences,
    removeSpeaker,
    removeTags,
    srtToVtt,
    webvtt
}
