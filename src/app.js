import * as Vsmth from '../lib/vsmth.js'
import * as Util from './util.js'


const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const mix = audioCtx.createGain();
mix.gain.value = Util.fromDb(-12);
const master = audioCtx.createDynamicsCompressor();
master.threshold.value = 0;

const lop = audioCtx.createBiquadFilter();
lop.type = 'lowpass';
lop.frequency.value = 1000;
//lop.Q.value = 50;


mix.connect(lop);
lop.connect(master);
master.connect(audioCtx.destination);

const noteKeys = 'zsxdcvgbhnjm,l.;/q2w3e4rt6y7ui9o0p-[]';

//flags for ignoring autorepeats
const keyFlags = Object.fromEntries([...noteKeys].map(x => [x, false]));
 

//^^ voices?

let locked = false;


let zz1 = {
  octave: 3,
  //^yeet to fooboard
  a: 0.3,
  d: 0.3,
  s: 1,
  r: 0.3,
  waveform: 'sawtooth',
  voices: Array(128),
  noteDown: function(noteIdx) {
    const osc = audioCtx.createOscillator();
    osc.type = this.waveform;
    osc.frequency.setValueAtTime(440 * 2**((noteIdx - 69)/12), audioCtx.currentTime); 
    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0, audioCtx.currentTime); //replace with just assignment?
    env.gain.linearRampToValueAtTime(1, audioCtx.currentTime + this.a);
    env.gain.linearRampToValueAtTime(this.s, audioCtx.currentTime + this.a + this.d);
    osc.connect(env);
    env.connect(mix);
    osc.start();
    const voice = {
      name: Util.getNoteName(noteIdx),
      osc: osc,
      env: env,
    };
    this.voices[noteIdx] = voice;
  },
  noteUp: function(noteIdx) {
    const voice = this.voices[noteIdx];
    voice.env.gain.linearRampToValueAtTime(0, audioCtx.currentTime + this.r);
    voice.osc.stop(audioCtx.currentTime + this.r);
    this.voices[noteIdx] = undefined;
  },
} //TODO instantiation



const synth = zz1;



function knobView(draw, {title, toReading, fromReading, show}) {
  const knobRef = {};
  const angle = toReading(); //rename as toSetting?
  function lock() {
    knobRef.current.requestPointerLock();
    locked = true;
    //updating model without re-rendering. That's cool
  }
  function turn(e) {
    if (locked) {
      fromReading(angle - e.movementY) //rename readingUpdate or smth?
      draw();
    }
  }
  function unlock() {
    document.exitPointerLock();
    locked = false;
  }
  const events = {onmousedown: lock, onmouseup: unlock, onmousemove: turn};
  return (
      ['div', {className: 'knob'},
        ['span', {style: 'margin-bottom: 0.1em'}, title],
        ['svg', {style: 'width: 40px; height: 40px;'},
          ['g', {transform: `rotate(${angle}, 20, 20)`, ...events}, //using a function wouldn't be so pretty here
            ['circle', {ref: knobRef, cx: 20, cy: 20, r: 20}],
            ['rect', {x: 20-1.5, y: 2, width: 3, height: `30%`, fill: 'white'}], //TODO color palette, contexts for VSMTH
          ],
        ],
        show(),
      ]
  );
}

//abstracting
//  decoupling from "synth"
//wave name
//drawing expression
function waveButtonView(draw, synth, waveform, picture) {
  const isSelected = synth.waveform === waveform;
  return ['svg', {style: 'width: 30px; height: 20px', onclick: () => {synth.waveform = waveform; draw()}},
    ['rect', {width: '100%', height: '100%', fill: ((synth.waveform === waveform) ? 'black' : '#eee')}],
    ['svg', {x: 0.15*30, y: 0.15*20, width: 0.7*30, height: 0.7*20, stroke: (synth.waveform === waveform) ? 'white' : 'black'},
      picture, //TODO use a group with scaling? //what's a viewbox?
    ],
  ];
}


/*
const master = audioCtx.createGain();
master.gain.setValueAtTime(1, audioCtx.currentTime);
*/


//function fooboardView(draw, destination, view) //with fn
function fooboardView(draw, destination, gui) { //with expr
  
  return gui;
}

function view(draw) {
  //wrapprer object for events and spread?
  const keypress = e => { //sort that keypress/keydown thing out
    if (e.key == 'F') {
      synth.octave--;
      draw();
    } else if (e.key == 'K') {
      synth.octave++;
      draw();
    }
  }
  const keydown = e => { //TODO change to local events, focus first on load
    const relIdx = noteKeys.indexOf(e.key);
    if (relIdx === -1 || keyFlags[relIdx]) return
    keyFlags[relIdx] = true;
    const noteIdx = relIdx + (synth.octave + 1) * 12;
    synth.noteDown(noteIdx);
    draw();
  }
  const keyup = e => {
    const relIdx = noteKeys.indexOf(e.key); //factor out?
    if (relIdx === -1) return
    keyFlags[relIdx] = false;
    const noteIdx = relIdx + (synth.octave + 1) * 12;
    synth.noteUp(noteIdx);
    draw();
  }
  const lspan = Math.log(20000) / Math.log(440) - 1;
  return ['div', {className: 'fooboard', tabIndex: 0, onkeydown: keydown, onkeyup: keyup, onkeypress: keypress},
    `octave: ${synth.octave}`,
    ['br'],
    `notes: ${synth.voices.filter(x => x !== undefined).map(x => x.name).join(', ')}`,
    //store names in array?
    //'a\na\n', //no nl-s in text nodes?
    ['br'],
    waveButtonView(draw, synth, 'sine',
      ['g',
        ...[...Array(10).keys()].map(i => ['line', {
          x1: `${i*10}%`,
          y1: `${50 - 50*Math.sin(i/10*2*Math.PI)}%`,
          x2: `${(i+1)*10}%`,
          y2: `${50 - 50*Math.sin((i+1)/10*2*Math.PI)}%`
        }]),
      ]
    ),
    waveButtonView(draw, synth, 'triangle',
      ['g',
        ['line', {x1: '0%', y1: '50%', x2: '25%', y2: '0%'}],
        ['line', {x1: '25%', y1: '0%', x2: '75%', y2: '100%'}],
        ['line', {x1: '75%', y1: '100%', x2: '100%', y2: '50%'}],
      ]
    ),
    waveButtonView(draw, synth, 'square',
      ['g',
        ['line', {x1: '0%', y1: '50%', x2: '0%', y2: '0%'}],
        ['line', {x1: '0%', y1: '0%', x2: '50%', y2: '0%'}],
        ['line', {x1: '50%', y1: '0%', x2: '50%', y2: '100%'}],
        ['line', {x1: '50%', y1: '100%', x2: '100%', y2: '100%'}],
        ['line', {x1: '100%', y1: '100%', x2: '100%', y2: '50%'}],
      ]
    ),
    waveButtonView(draw, synth, 'sawtooth',
      ['g',
        ['line', {x1: '0%', y1: '50%', x2: '50%', y2: '0%'}],
        ['line', {x1: '50%', y1: '0%', x2: '50%', y2: '100%'}],
        ['line', {x1: '50%', y1: '100%', x2: '100%', y2: '50%'}],
      ]
    ),
    ['br'],
    ['div', {style: 'display: flex'},
      knobView(draw, {
        title: 'cutoff', //named parameters? 
        //toReading: () => lop.frequency.value/20000*(2*130)-130,
        //fromReading: angle => {lop.frequency.value = (angle + 130)/(2*130)*20000},
        toReading: () => (Math.log(lop.frequency.value) / Math.log(440) - 1)/lspan*130,
        fromReading: angle => {lop.frequency.value = Util.limit(9, 20000, 440**(1 + angle/130*lspan))}, //TODO implement log freq
        show: () => `${Math.floor(lop.frequency.value)} Hz`
      }),
      knobView(draw, {
        title: 'resonance', //named parameters? 
        //toReading: () => lop.frequency.value/20000*(2*130)-130,
        //fromReading: angle => {lop.frequency.value = (angle + 130)/(2*130)*20000},
        toReading: () => lop.Q.value / 100 * 260 - 130,
        fromReading: angle => {lop.Q.value = 100 * (angle + 130) / 260},
        show: () => `${Math.floor(lop.Q.value)}`
      }),
    ],
    ['div', {style: 'display: inline-flex'},
      knobView(draw, {
        title: 'gain',
        toReading: () => (Util.toDb(mix.gain.value) + 60) / 60 * 260 - 130,
        fromReading: angle => {mix.gain.value = Util.fromDb(Util.limit(-60, 0, (angle + 130) / 260 * 60 - 60))},
        show: () => `${Math.round(20*Math.log(mix.gain.value)/Math.log(10) * 100) / 100}` //in Db?
      }),
      knobView(draw, {
        title: 'attack',
        toReading: () => synth.a / 2 * 260 - 130,
        fromReading: angle => {synth.a = Util.limit(0, 2, (angle + 130) / 260 * 2)},
        /*
        toReading: () => Math.log(a)/Math.log(10)*130,
        fromReading: angle => {a = Util.limit(0.1, 10, 10**(angle/130))},
        */
        show: () => `${Math.round(synth.a * 100) / 100} s`
      }),
      knobView(draw, {
        title: 'decay',
        toReading: () => synth.d / 2 * 260 - 130,
        fromReading: angle => {synth.d = Util.limit(0, 2, (angle + 130) / 260 * 2)},
        show: () => `${Math.round(synth.d * 100) / 100} s`
      }),
      knobView(draw, {
        title: 'sustain',
        toReading: () => synth.s * 260 - 130,
        fromReading: angle => {synth.s = Util.limit(0, 1, (angle + 130) / 260)},
        show: () => `${Math.round(synth.s * 100) / 100}` //in Db?
      }),
      knobView(draw, {
        title: 'release',
        toReading: () => synth.r / 2 * 260 - 130,
        fromReading: angle => {synth.r = Util.limit(0, 2, (angle + 130) / 260 * 2)},
        show: () => `${Math.round(synth.r * 100) / 100} s`
      }),
    ],
	['br'],
	['br'],
	['div', {style: 'display: inline-flex'},
      knobView(draw, {
        title: 'threshold',
        toReading: () => master.threshold.value / 30 * 130,
        fromReading: angle => {master.threshold.value = Util.limit(-30, 30, angle / 130 * 30)},
        /*
        toReading: () => Math.log(a)/Math.log(10)*130,
        fromReading: angle => {a = Util.limit(0.1, 10, 10**(angle/130))},
        */
        show: () => `${Math.round(master.threshold.value * 100) / 100} dB`
      }),
      /*
      knobView(draw, { //TODO l8r
        title: 'knee',
        toReading: () => d / 2 * 260 - 130,
        fromReading: angle => {d = Util.limit(0, 2, (angle + 130) / 260 * 2)},
        show: () => `co?`
      }),
      */
      knobView(draw, {
        title: 'ratio',
        toReading: () => Math.log(master.ratio.value)/Math.log(10)*130,
        fromReading: angle => {master.ratio.value = Util.limit(1/20, 20, 10**(angle/130))}, //TODO fix range
        show: () => `${Math.round(master.ratio.value * 100) / 100}` //in Db?
      }),
      knobView(draw, {
        title: 'attack',
        toReading: () => master.attack.value / 2 * 260 - 130,
        fromReading: angle => {master.attack.value = Util.limit(0, 2, (angle + 130) / 260 * 2)},
        show: () => `${Math.round(master.attack.value * 100) / 100} s`
      }),
      knobView(draw, {
        title: 'release',
        toReading: () => master.release.value / 2 * 260 - 130,
        fromReading: angle => {master.release.value = Util.limit(0, 2, (angle + 130) / 260 * 2)},
        show: () => `${Math.round(master.release.value * 100) / 100} s`
      }),
    ],
	
  ];
}

Vsmth.init(view, document.body);

document.querySelector('.fooboard').focus();

