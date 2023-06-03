import * as Vsmth from '../lib/vsmth.js'
import * as Util from './util.js'

class Param { 
  constructor(val, hooks) {
    this.hooks = hooks;
    this.setVal(val);
  }
  setVal(val) {
    this.val = val;
    this.hooks?.map(f => f(val));
  }
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const mix = audioCtx.createGain();
const gain = new Param(-12, [
  val => mix.gain.value = Util.fromDb(val)
])

const master = audioCtx.createDynamicsCompressor();
const threshold = new Param(0, [
  val => master.threshold.value = val,
])
/*
const knee = new Param(-12, [ //what's the default?
  val => mix.knee.value = val,
])
*/
const ratio = new Param(12, [
  val => master.threshold.value = val,
])
const attack = new Param(0, [
  val => master.attack.value = val,
])
const release = new Param(0.25, [
  val => master.release.value = val,
])

const lop = audioCtx.createBiquadFilter();
lop.type = 'lowpass';
lop.frequency.value = 1000;
const cutoff = new Param(1000, [
  val => lop.frequency.value = val,
]);
const resonance = new Param(0, [
val => lop.Q.value = val
])
//lop.Q.value = 50;


mix.connect(lop);
lop.connect(master);
master.connect(audioCtx.destination);

const noteKeys = 'zsxdcvgbhnjm,l.;/q2w3e4rt6y7ui9o0p-[]';

//flags for ignoring autorepeats
const keyFlags = Object.fromEntries([...noteKeys].map(x => [x, false]));
 

//^^ voices?



let zz1 = {
  fooboardOctave: 3,
  //^yeet to fooboard?
  a: new Param(0.3),
  d: new Param(0.3),
  s: new Param(1),
  r: new Param(0.3),
  waveform: 'sawtooth',
  voices: Array(128),
  noteDown: function(noteIdx) {
    const osc = audioCtx.createOscillator();
    osc.type = this.waveform;
    osc.frequency.setValueAtTime(440 * 2**((noteIdx - 69)/12), audioCtx.currentTime); 
    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0, audioCtx.currentTime); //replace with just assignment?
    env.gain.linearRampToValueAtTime(1, audioCtx.currentTime + this.a.val);
    env.gain.linearRampToValueAtTime(this.s.val, audioCtx.currentTime + this.a.val + this.d.val);
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
    voice.env.gain.linearRampToValueAtTime(0, audioCtx.currentTime + this.r.val);
    voice.osc.stop(audioCtx.currentTime + this.r.val);
    setTimeout(() => voice.env.disconnect(mix), 1000*this.r.val);
    //^^ fixes the weird unresponsive knob bug
    //^^why stopping osc with timeout made pops?
    //doesn't the same thing happen with compressor?
    this.voices[noteIdx] = undefined;
  },
} //TODO instantiation

const synth = zz1;


let cursorLocked = false;

function knobView(draw, param, {title, unit, scale='lin', rounding=0, paramRange, readingRange=[-130, 130]}) {
  const knobRef = {};
  let toReading;
  let fromReading;
  if (scale === 'lin') { //TODO refactor
    const a = (paramRange[1] - paramRange[0]) / (readingRange[1] - readingRange[0]);
    const b = paramRange[0] - a*readingRange[0];
    fromReading = r => Math.min(paramRange[1], Math.max(paramRange[0], a * r + b));
    toReading = p => (p - b) / a;
  } else if (scale === 'log') {
    const a = (Math.log(paramRange[1]) - Math.log(paramRange[0])) / (readingRange[1] - readingRange[0]);
    const b = Math.log(paramRange[0]) - a*readingRange[0];
    fromReading = r => Math.min(paramRange[1], Math.max(paramRange[0], Math.exp(a * r + b)));
    toReading = p => (Math.log(p) - b) / a;
  }
  const angle = toReading(param.val);
  function lock() {
    knobRef.current.requestPointerLock();
    cursorLocked = true;
    //updating model without re-rendering. That's cool
  }
  function turn(e) {
    if (cursorLocked) {
      param.setVal(fromReading(angle - e.movementY)) //rename readingUpdate or smth?
      draw();
    }
  }
  function unlock() {
    document.exitPointerLock();
    cursorLocked = false;
  }
  const roundval = Math.floor(param.val * 10**rounding)/10**rounding;
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
         unit ? `${roundval} ${unit}` : roundval,
      ]
  );
}


function waveButtonView(draw, callback, selected, waveform, picture) { //TODO better arg names?
  const isSelected = selected === waveform;
  return ['svg', {style: 'width: 30px; height: 20px', onclick: () => {callback(waveform); draw()}},
    ['rect', {width: '100%', height: '100%', fill: (isSelected ? 'black' : '#eee')}],
    ['svg', {x: 0.15*30, y: 0.15*20, width: 0.7*30, height: 0.7*20, stroke: isSelected ? 'white' : 'black'},
      picture, //TODO use a group with scaling? //what's a viewbox?
    ],
  ];
}

function waveSelectionView(draw, callback, selected) {
  return ['div',
      waveButtonView(draw, callback, selected, 'sine',
        ['g',
          ...[...Array(10).keys()].map(i => ['line', {
            x1: `${i*10}%`,
            y1: `${50 - 50*Math.sin(i/10*2*Math.PI)}%`,
            x2: `${(i+1)*10}%`,
            y2: `${50 - 50*Math.sin((i+1)/10*2*Math.PI)}%`
          }]),
        ]
      ),
      waveButtonView(draw, callback, selected, 'triangle',
        ['g',
          ['line', {x1: '0%', y1: '50%', x2: '25%', y2: '0%'}],
          ['line', {x1: '25%', y1: '0%', x2: '75%', y2: '100%'}],
          ['line', {x1: '75%', y1: '100%', x2: '100%', y2: '50%'}],
        ]
      ),
      waveButtonView(draw, callback, selected, 'square',
        ['g',
          ['line', {x1: '0%', y1: '50%', x2: '0%', y2: '0%'}],
          ['line', {x1: '0%', y1: '0%', x2: '50%', y2: '0%'}],
          ['line', {x1: '50%', y1: '0%', x2: '50%', y2: '100%'}],
          ['line', {x1: '50%', y1: '100%', x2: '100%', y2: '100%'}],
          ['line', {x1: '100%', y1: '100%', x2: '100%', y2: '50%'}],
        ]
      ),
      waveButtonView(draw, callback, selected, 'sawtooth',
        ['g',
          ['line', {x1: '0%', y1: '50%', x2: '50%', y2: '0%'}],
          ['line', {x1: '50%', y1: '0%', x2: '50%', y2: '100%'}],
          ['line', {x1: '50%', y1: '100%', x2: '100%', y2: '50%'}],
        ]
      ),
  ];
}



function fooboardView(draw, receiver, gui) { //with expr
  const keypress = e => { //sort that keypress/keydown thing out
    if (e.key == 'F') {
      receiver.fooboardOctave--;
      draw();
    } else if (e.key == 'K') {
      receiver.fooboardOctave++;
      draw();
    }
  }
  const keydown = e => { //TODO change to local events, focus first on load
    const relIdx = noteKeys.indexOf(e.key);
    if (relIdx === -1 || keyFlags[relIdx]) return
    keyFlags[relIdx] = true;
    const noteIdx = relIdx + (receiver.fooboardOctave + 1) * 12;
    receiver.noteDown(noteIdx);
    draw();
  }
  const keyup = e => {
    const relIdx = noteKeys.indexOf(e.key); //factor out?
    if (relIdx === -1) return
    keyFlags[relIdx] = false;
    const noteIdx = relIdx + (receiver.fooboardOctave + 1) * 12;
    receiver.noteUp(noteIdx);
    draw();
  }
  return ['div', {className: 'fooboard', tabIndex: 0, onkeydown: keydown, onkeyup: keyup, onkeypress: keypress}, 
    gui,
  ]
}


function synthView(draw, synth) {
  //wrapprer object for events and spread?
  const lspan = Math.log(20000) / Math.log(440) - 1;
  const setWf = wf => synth.waveform = wf;
  //const setWf = wf => synth.wf = wf; //that's what typescript is for
  return fooboardView(draw, synth,
    ['div',
      `octave: ${synth.fooboardOctave}`,
      ['br'],
      `notes: ${synth.voices.filter(x => x !== undefined).map(x => x.name).join(', ')}`,
      ['br'],
      waveSelectionView(draw, setWf, synth.waveform),
      ['div', {style: 'display: flex'},
        knobView(draw, cutoff, {
          title: 'cutoff', //named parameters? 
          paramRange: [9, 20000],
          scale: 'log',
          unit: 'Hz',
        }),
        knobView(draw, resonance, {
          title: 'resonance', //named parameters? 
          paramRange: [-50, 50],
        }),
      ],
      ['div', {style: 'display: inline-flex'},
        knobView(draw, gain, {
          title: 'gain',
          paramRange: [-60, 0],
          unit: 'dB',
        }),
        knobView(draw, synth.a, {
          title: 'attack',
          paramRange: [0, 2],
          rounding: 2,
          unit: 's',
        }),
        knobView(draw, synth.d, {
          title: 'decay',
          paramRange: [0, 2],
          rounding: 2,
          unit: 's',
        }),
        knobView(draw, synth.s, {
          title: 'sustain', //db?
          rounding: 2,
          paramRange: [0, 1],
        }),
        knobView(draw, synth.r, {
          title: 'release',
          paramRange: [0, 2],
          rounding: 2,
          unit: 's',
        }),
      ]
    ]
  );
}

function mainView(draw) {
  return ['div',
    synthView(draw, synth),
    ['br'],
    ['div', {style: 'display: inline-flex'},
      knobView(draw, threshold, {
        title: 'threshold',
        paramRange: [-60, 0],
        unit: 'dB',
      }),
      /*
      knobView(draw, knee, {
      }),
      */
      knobView(draw, ratio, {
        title: 'ratio',
        paramRange: [0, 40],
      }),
      knobView(draw, attack, {
        title: 'attack',
        paramRange: [0, 1],
        rounding: 2,
        unit: 's',
      }),
      knobView(draw, release, {
        title: 'release',
        paramRange: [0, 1],
        rounding: 2,
        unit: 's',
      }),
    ],
		['br'],
		['br'],
		'keyboard bindings:',
		['br'],
		'raise octave - shift+K',
		['br'],
		'lower octave - shift+F',
		['br'],
		'Notes:',
		['br'],
		['img', {src: 'https://5minuteproducing.files.wordpress.com/2015/05/1027_1.gif'}],
  ];
}

Vsmth.init(mainView, document.body);

document.querySelector('.fooboard').focus();

