# vtt-utils

_vtt-utils_ is a library for handling VTT subtitles within [voiceful](http://voiceful.io). It includes different functions to import and parse subtitles, as well as to export them for voiceful in the appropriate format.

## Install

```bash
npm i -S vtt-utils
```

## Dependencies

[node-webvtt](https://github.com/VoctroLabs/node-webvtt) (Voctro Labs fork)

## Usage

### Importing the library
```js
var vttutils = require('vtt-utils');

```

### API
#### srtToVtt(inputSrtText)
Generates a VTT-formatted subtitle from a SRT text
```js
/**
 * @param  {String} inputSrtText Input subtitle text, in SRT format
 * @return {String}              Output subtitle text, in VTT format
 */
```

#### parseToSentences(inputVttText)
Parses an input subtitle provided as text and output the subtitle with sentence per cue. When several cues are joined into a single one, this function automatically adds `<prosody duration>` SSML tags to keep the original time info, in milliseconds (e.g. `<prosody duration="1000ms">` for 1 second). When two non-adjacent cues are joined (i.e. the ending time of the first is not equal to the start time of the second), it adds SSML `<break>` SSML tags to keep this info (e.g. `<break time="1000ms">`) for cues separated by 1 second. 
```js
/**
* @param  {String} inputVttText Input subtitle text, in VTT format
* @return {String}              Output subtitle text, in VTT format
*/
```

#### checkSubtitlesEquivalency(srcVttText, targetVttText)
Checks that the start and end times of cues in two VTT subtitles are equal
```js
/**
* @param  {String} srcVttText    Source subtitle text, in VTT format
* @param  {String} targetVttText Target subtitle text, in VTT format
* @return {Boolean}              True if both are equivalent, false otherwise
*/
```

#### assignStyleToCue(inputVttText, style, cueIdx)
Assigns a style to the cue in position cueIdx for the VTT-formatted subtitle inputVttText by adding a `<emphasis level="style">` tag to the cue.
```js
/**
 * @param  {String} inputVttText Input subtitle text, in VTT format
 * @param  {String} style        Name of the style for the cue (e.g: 'neutral', 'sad', 'aggresive'...)
 * @param  {Number} cueIdx       Index of the cue where the style must be applied
 * @return {String}              inputVttText modified
 */
```

#### getSpeakers(vttText)
Returns the different speakers present in the VTT formated subtitle vttText, looking at the voice (`<v>`) tags in the cues.
```js
/**
 * @param  {String}     vttText Subtitle text, in VTT format
 * @return {String[]}           Array of speakers
 */
```

#### getAsJSON(language, modelsString, vttText)
Generates JSON-formatted to generate synthesis with voiceful.
```js
/**
* @param  {String}  language        Language identifier
* @param  {String}  modelsString    Array with speakers-voice models-(optional)defaultStyle correspondence (e.g. '[["speaker1","model1","style1"],["speaker2","model2"]]')
* @param  {String}  vttText         Subtitle text, in VTT format
* @param  {Number[]}    selectedSentences   Array with indexes of sentences to be synthesized
* @return {String}                  JSON-formatted string for synthesis
*/
```

#### removeSpeaker(cueText)
Return the text of a cue without speaker tag
```js
/**
 * @param  {String} cueText Text from a sentence of a subtitle
 * @return {String}              cueText without the speaker tag
 */
```

#### removeTags(cueText)
Return the text of a cue without any tags
```js
/**
 * @param  {String} cueText Text from a sentence of a subtitle
 * @return {String}              cueText without tags
 */
 ```

#### generateNoiseGateString(vttText, transitionTime)
 Return noise gate values as string to introduce in VoMix effect
 ```js
 /**
  * @param  {String} vttText Subtitle text, in VTT format
  * @param  {Number} transitionTime Transition time, in seconds
  * @return {String}              Noise gate values as string to introduce in JSON
  */
 ```

 #### getNumberOfCues(vttText)
 Returns the number of cues in the vtt subtitle vttText
 ```js
/**
 * @param  {String} vttText Subtitle text, in VTT format
 * @return {Number}         Number of cues
 */
 ```

  #### getVideoFriendlyVtt(vttText)
 Returns the subtitle with cues short enough that they are readable together with video. It `<prosody duration>` tags are present, the function uses this information. Otherwise, it returns a subtitle with cues shorter than 70 characters.
 ```js
/**
 * @param   {String} vttText    Subtitle text, in VTT format
 * @return  {String}            Video-friendly subtitle, in VTT format
 */
 ```

## Development

To start developing first clone de repository and install the dependencies with NPM:
```js
git clone git@github.com:VoctroLabs/vtt-utils.git
cd vtt-utils
npm install
```

### Example

There is an example of usage in `example/index.html`.
First run the following commands to produce the necessary bundle for the browser:
```bash
npm run build-example
```
Then open `example/index.html` in your browser.

### Tests

Run tests with:
```js
npm run test
```

## License

[MIT](http://vjpr.mit-license.org)
