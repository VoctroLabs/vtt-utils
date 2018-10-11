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
            const vtt_o = VTTUtils.parseToSentences(vtt_i).replace(new RegExp(/\r\n/, 'g'), '\n');
            vtt_o.should.equal(data('example3.vtt'));
        });
    });

    describe('#parseToSentencesError', () => {
        it('should throw FormatError with wrong VTT', () => {
            (() => {
                const vtt_i = data('example_wrongformat1.vtt');
                VTTUtils.parseToSentences(vtt_i).replace(new RegExp(/\r\n/, 'g'), '\n');
            })
            .should.throw(VTTUtils.FormatError);
        });
    });

    describe('#checkSubtitlesEquivalency', () => {
        it('should return true for equivalent time in subtitles', () => {
            const vtt_src = VTTUtils.srtToVtt(data('equivalent_1.srt'));
            const vtt_trg = VTTUtils.srtToVtt(data('equivalent_2.srt'));
            const vtt_o_src = VTTUtils.parseToSentences(vtt_src).replace(new RegExp(/\r\n/, 'g'), '\n');
            const vtt_o_trg = VTTUtils.parseToSentences(vtt_trg).replace(new RegExp(/\r\n/, 'g'), '\n');
            VTTUtils.checkSubtitlesEquivalency(vtt_o_src, vtt_o_trg).should.equal(true);
        });
    });

    describe('#checkSubtitlesEquivalencyParseErrorInSrc', () => {
        it('should throw FormatError with wrong VTT in src subtitle', () => {
            (() => {
                const vtt_o_src = data('example_wrongformat1.vtt');
                const vtt_trg = VTTUtils.srtToVtt(data('equivalent_2.srt'));
                const vtt_o_trg = VTTUtils.parseToSentences(vtt_trg).replace(new RegExp(/\r\n/, 'g'), '\n');
                VTTUtils.checkSubtitlesEquivalency(vtt_o_src, vtt_o_trg);
            })
            .should.throw(VTTUtils.FormatError, /src/);
        });
    });

    describe('#checkSubtitlesEquivalencyParseErrorInTarget', () => {
        it('should throw FormatError with wrong VTT in target subtitle', () => {
            (() => {
                const vtt_src = VTTUtils.srtToVtt(data('equivalent_1.srt'));
                const vtt_o_trg = data('example_wrongformat1.vtt');
                const vtt_o_src = VTTUtils.parseToSentences(vtt_src).replace(new RegExp(/\r\n/, 'g'), '\n');
                VTTUtils.checkSubtitlesEquivalency(vtt_o_src, vtt_o_trg);
            })
            .should.throw(VTTUtils.FormatError, /target/);
        });
    });

    describe('#checkSubtitlesEquivalencyCompatibilityErrorDifferentCuesNumber', () => {
        it('should throw CompatibilityError for subtitles with different number of cues', () => {
            (() => {
                const vtt_src = VTTUtils.srtToVtt(data('equivalent_1_morecues.srt'));
                const vtt_trg = VTTUtils.srtToVtt(data('equivalent_2.srt'));
                const vtt_o_src = VTTUtils.parseToSentences(vtt_src).replace(new RegExp(/\r\n/, 'g'), '\n');
                const vtt_o_trg = VTTUtils.parseToSentences(vtt_trg).replace(new RegExp(/\r\n/, 'g'), '\n');
                VTTUtils.checkSubtitlesEquivalency(vtt_o_src, vtt_o_trg);
            })
            .should.throw(VTTUtils.CompatibilityError, /number/);
        });
    });

    describe('#checkSubtitlesEquivalencyCompatibilityErrorDifferentTimes', () => {
        it('should throw CompatibilityError for subtitles with different times at cue 7', () => {
            (() => {
                const vtt_src = VTTUtils.srtToVtt(data('equivalent_1_differenttimes.srt'));
                const vtt_trg = VTTUtils.srtToVtt(data('equivalent_2.srt'));
                const vtt_o_src = VTTUtils.parseToSentences(vtt_src).replace(new RegExp(/\r\n/, 'g'), '\n');
                const vtt_o_trg = VTTUtils.parseToSentences(vtt_trg).replace(new RegExp(/\r\n/, 'g'), '\n');
                VTTUtils.checkSubtitlesEquivalency(vtt_o_src, vtt_o_trg);
            })
            .should.throw(VTTUtils.CompatibilityError, /cue 7/);
        });
    });

    describe('#getAsJSON', () => {
        it('should return correct JSON', () => {
            const json = VTTUtils.getAsJSON('es', '[["Speaker1","ayesha"]]', data('example2.vtt'));
            const normalize = json => JSON.stringify(JSON.parse(json));
            normalize(data('example2.json')).should.equal(normalize(json));
        });
    });

    describe('#getAsJSON with comma timestamps', () => {
        it('should return correct JSON', () => {
            const vtt_o = VTTUtils.parseToSentences(data('example4.vtt')).replace(new RegExp(/\r\n/, 'g'), '\n');
            const json = VTTUtils.getAsJSON('en', '[["Speaker1","daniel"]]', vtt_o);
            const normalize = json => JSON.stringify(JSON.parse(json));
            normalize(data('example4.json')).should.equal(normalize(json));
        });
    });

    describe('#getAsJSON_onlyOdds', () => {
        it('should return correct JSON with synthesize flag as true only in odd sentences', () => {
            const json = VTTUtils.getAsJSON('es', '[["Speaker1","ayesha"]]', data('example2.vtt'), [1,3]);
            const normalize = json => JSON.stringify(JSON.parse(json));
            normalize(data('example2_onlyodd.json')).should.equal(normalize(json));
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

    describe('#assignStyleToCue', () => {
        it('should assign "voiceful:angry" emphasis style to cue 3', () => {
            const vtt_i = data('example3.vtt');
            const vtt_o = VTTUtils.addTagToCue(vtt_i, 2, "emphasis", "level", "voiceful:angry", 2).replace(new RegExp(/\r\n/, 'g'), '\n');
            //const vtt_o = VTTUtils.assignStyleToCue(vtt_i, "angry", 2).replace(new RegExp(/\r\n/, 'g'), '\n');
            vtt_o.trim().should.equal(data('example3_cue3angry.vtt').trim());
        });
    });

    describe('#assignProsodyRangeTocue', () => {
        it('should assign "non-adapt" rate attribute to prosody to cue 3', () => {
            const vtt_i = data('example3.vtt');
            const vtt_o = VTTUtils.addTagToCue(vtt_i, 2, "prosody", "range", "voiceful:non-adapt", 2).replace(new RegExp(/\r\n/, 'g'), '\n');
            vtt_o.trim().should.equal(data('example3_cue3norangeadapt.vtt').trim());
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
