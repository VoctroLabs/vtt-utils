# vtt-utils

> Utils for handling VTT subtitles

## Install

```bash
npm i -S vtt-utils
```

## Usage

```js
var vttutils = require('vtt-utils');

// outputVttText contains one single sentence per cue from inputVttText
var outputVttText = vttutils.parseToSentences(inputVttText);

```

## Example

There is an example of usage in `example/index.html`.
First run the following commands to produce the necessary bundle for the browser:
```
npm install
npm build-example
```

## License

[MIT](http://vjpr.mit-license.org)
