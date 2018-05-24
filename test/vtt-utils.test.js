'use strict';

const fs = require('fs');
const chai = require('chai');
const should = chai.should();
chai.use(require('chai-arrays'));

const VTTUtils = require('../src/vtt-utils').default;

const _data = new Map();
function data(filename) {
  if (!_data[filename]) _data[filename] = fs.readFileSync('./test/data/'+filename).toString();
  return _data[filename];
}

describe('VTTUtils', () => {

  describe('#parseToSentencesFromSRT', () => {
    it('should return correct VTT', () => {
      const vtt_i = VTTUtils.srtToVtt(data('example3.srt'));
      const vtt_o = VTTUtils.parseToSentences(vtt_i).replace(new RegExp(/\r\n/, 'g'), '\n')
      vtt_o.should.equal(data('example3.vtt'));
    });
  });

  describe('#getAsJSON', () => {
    it('should return correct JSON', () => {
      const json = VTTUtils.getAsJSON('es', '[["Speaker1","ayesha"]]', data('example2.vtt'));
      const normalize = json => JSON.stringify(JSON.parse(json));
      normalize(data('example2.json')).should.equal(normalize(json));
    });
  });

  describe('#getSpeaker', () => {
    it('should get speaker name from a single cue', () => {
      const speaker = VTTUtils.getSpeaker("<v Speaker2>I'm Speaker2 and this is the second time I talk,");
      speaker.should.equal('Speaker2');
    });
  });

  describe('#getSpeakers', () => {
    it('should return speakers from VTT text', () => {
      const speakers = VTTUtils.getSpeakers(data('example.vtt'));
      speakers.should.be.containingAllOf(['Speaker1', 'Speaker2']);
    });
  });

  describe('#getStyle', () => {
    it('should return style', () => {
      const style = VTTUtils.getStyle("<v Speaker2><emphasis level=\"sad\">I'm Speaker2</emphasis>");
      style.should.equal("sad");
    });

    it('should return no style', () => {
      const style = VTTUtils.getStyle("<v Speaker2>I'm Speaker2");
      should.not.exist(style);
    })
  });

  describe('#removeSpeaker', () => {
    it('should remove speaker tag', () => {
      const speaker = VTTUtils.removeSpeaker("<v Speaker2><emphasis level=\"sad\">I'm Speaker2</emphasis>");
      speaker.should.equal("<emphasis level=\"sad\">I'm Speaker2</emphasis>");
    });
  });

  describe('#removeTags', () => {
    it('should remove cue tags', () => {
      const speaker = VTTUtils.removeTags("<v Speaker2>I'm Speaker2 and this is the second time I talk,");
      speaker.should.equal("I'm Speaker2 and this is the second time I talk,");
    });
  });

});
