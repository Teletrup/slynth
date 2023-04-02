import * as Vsmth from '../lib/vsmth.js'


const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const input = audioCtx.createGain();
input.gain.value = fromDb(-12);
const master = audioCtx.createDynamicsCompressor();
master.threshold.value = 0;

const lop = audioCtx.createBiquadFilter();
lop.type = 'lowpass';
lop.frequency.value = 1000;
//lop.Q.value = 50;


input.connect(lop);
lop.connect(master);
master.connect(audioCtx.destination);

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteKeys = 'zsxdcvgbhnjm,l.;/q2w3e4rt6y7ui9o0p-[]'
const keyFlags = Object.fromEntries([...noteKeys].map(x => [x, false]));
 
const notes = Array.from(Array(128), (x, i) => ({
  name: getNoteName(i),
  osc: undefined,
  env: undefined,
}));

let locked = false

let synth = {
  octave: 3,
  a: 0.3,
  d: 0.3,
  s: 1,
  r: 0.3,
  waveform: 'sawtooth',
}



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
            ['rect', {x: 20-1.5, y: 2, width: 3, height: `30%`, fill: 'white'}],
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


function getNoteName(n) {
  return `${noteNames[n % 12]}${Math.floor(n / 12) - 1}`;
}



function limit(min, max, val) {
  return Math.max(min, Math.min(max, val)); //TODO explain counterintuitive weirdness
}

function toDb(x) {
  return  20*Math.log(x)/Math.log(10);
}
function fromDb(x) {
  return 10**(x / 20)
}

function view(draw) {
  document.body.onkeypress = e => {
    if (e.key == 'F') {
      synth.octave--;
      draw();
    } else if (e.key == 'K') {
      synth.octave++;
      draw();
    }
  }
  document.body.onkeydown = e => {
    const relIdx = noteKeys.indexOf(e.key);
    if (relIdx === -1 || keyFlags[relIdx]) return
    keyFlags[relIdx] = true;
    const noteIdx = relIdx + (synth.octave + 1) * 12;
    const osc = audioCtx.createOscillator();
    osc.type = synth.waveform;
    osc.frequency.setValueAtTime(440 * 2**((noteIdx - 69)/12), audioCtx.currentTime); 
    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0, audioCtx.currentTime); // just assignment?
    env.gain.linearRampToValueAtTime(1, audioCtx.currentTime + synth.a);
    env.gain.linearRampToValueAtTime(synth.s, audioCtx.currentTime + synth.a + synth.d);
    osc.connect(env);
    env.connect(input);
    osc.start();
    notes[noteIdx].osc = osc;
    notes[noteIdx].env = env;
    draw();
  }
  document.body.onkeyup = e => {
    const relIdx = noteKeys.indexOf(e.key);
    if (relIdx === -1) return
    keyFlags[relIdx] = false;
    const noteIdx = relIdx + (synth.octave + 1) * 12;
    const osc = notes[noteIdx].osc;
    const env = notes[noteIdx].env;
    env.gain.linearRampToValueAtTime(0, audioCtx.currentTime + synth.r);
    osc.stop(audioCtx.currentTime + synth.r);
    /*
    setTimeout(() => {
      osc.stop();
      env.disconnect(input);
    }, synth.r * 1000); //does increasing this cause weird artifacts?
    */
    notes[noteIdx].osc = undefined;
    notes[noteIdx].env = undefined;
    draw();
  }
  const lspan = Math.log(20000) / Math.log(440) - 1;
  return ['div',
    `octave: ${synth.octave}`,
    ['br'],
    `notes: ${notes.filter(x => x.osc !== undefined).map(x => x.name).join(', ')}`,
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
        fromReading: angle => {lop.frequency.value = limit(9, 20000, 440**(1 + angle/130*lspan))}, //TODO implement log freq
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
        toReading: () => (toDb(input.gain.value) + 60) / 60 * 260 - 130,
        fromReading: angle => {input.gain.value = fromDb(limit(-60, 0, (angle + 130) / 260 * 60 - 60))},
        show: () => `${Math.round(20*Math.log(input.gain.value)/Math.log(10) * 100) / 100}` //in Db?
      }),
      knobView(draw, {
        title: 'attack',
        toReading: () => synth.a / 2 * 260 - 130,
        fromReading: angle => {synth.a = limit(0, 2, (angle + 130) / 260 * 2)},
        /*
        toReading: () => Math.log(a)/Math.log(10)*130,
        fromReading: angle => {a = limit(0.1, 10, 10**(angle/130))},
        */
        show: () => `${Math.round(synth.a * 100) / 100} s`
      }),
      knobView(draw, {
        title: 'decay',
        toReading: () => synth.d / 2 * 260 - 130,
        fromReading: angle => {synth.d = limit(0, 2, (angle + 130) / 260 * 2)},
        show: () => `${Math.round(synth.d * 100) / 100} s`
      }),
      knobView(draw, {
        title: 'sustain',
        toReading: () => synth.s * 260 - 130,
        fromReading: angle => {synth.s = limit(0, 1, (angle + 130) / 260)},
        show: () => `${Math.round(synth.s * 100) / 100}` //in Db?
      }),
      knobView(draw, {
        title: 'release',
        toReading: () => synth.r / 2 * 260 - 130,
        fromReading: angle => {synth.r = limit(0, 2, (angle + 130) / 260 * 2)},
        show: () => `${Math.round(synth.r * 100) / 100} s`
      }),
    ],
	['br'],
	['br'],
	['div', {style: 'display: inline-flex'},
      knobView(draw, {
        title: 'threshold',
        toReading: () => master.threshold.value / 30 * 130,
        fromReading: angle => {master.threshold.value = limit(-30, 30, angle / 130 * 30)},
        /*
        toReading: () => Math.log(a)/Math.log(10)*130,
        fromReading: angle => {a = limit(0.1, 10, 10**(angle/130))},
        */
        show: () => `${Math.round(master.threshold.value * 100) / 100} dB`
      }),
      /*
      knobView(draw, { //TODO l8r
        title: 'knee',
        toReading: () => d / 2 * 260 - 130,
        fromReading: angle => {d = limit(0, 2, (angle + 130) / 260 * 2)},
        show: () => `co?`
      }),
      */
      knobView(draw, {
        title: 'ratio',
        toReading: () => Math.log(master.ratio.value)/Math.log(10)*130,
        fromReading: angle => {master.ratio.value = limit(1/20, 20, 10**(angle/130))}, //TODO fix range
        show: () => `${Math.round(master.ratio.value * 100) / 100}` //in Db?
      }),
      knobView(draw, {
        title: 'attack',
        toReading: () => master.attack.value / 2 * 260 - 130,
        fromReading: angle => {master.attack.value = limit(0, 2, (angle + 130) / 260 * 2)},
        show: () => `${Math.round(master.attack.value * 100) / 100} s`
      }),
      knobView(draw, {
        title: 'release',
        toReading: () => master.release.value / 2 * 260 - 130,
        fromReading: angle => {master.release.value = limit(0, 2, (angle + 130) / 260 * 2)},
        show: () => `${Math.round(master.release.value * 100) / 100} s`
      }),
    ],
	
  ];
}

Vsmth.init(view, document.body);

