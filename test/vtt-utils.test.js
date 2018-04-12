'use strict';

const fs = require('fs');
const chai = require('chai');
chai.use(require('chai-arrays'));
chai.should();

const VTTUtils = require('../lib/vtt-utils').default;

function example() {
  if (!example.result) example.result = fs.readFileSync('./test/data/example.vtt').toString();
  return example.result;
}

describe('VTTUtils', () => {

  it('should return speakers from VTT text', () => {
    const speakers = VTTUtils.getSpeakers(example());
    speakers.should.be.containingAllOf(['Speaker1', 'Speaker2']);
  });

  it('should get speaker name from a single cue', () => {
    const speaker = VTTUtils.getSpeaker("<v = Speaker2>I'm Speaker2 and this is the second time I talk,");
    speaker.should.equal('Speaker2');
  });

  it('should remove cue tags', () => {
    const speaker = VTTUtils.removeTags("<v = Speaker2>I'm Speaker2 and this is the second time I talk,");
    speaker.should.equal("I'm Speaker2 and this is the second time I talk,");
  });

});