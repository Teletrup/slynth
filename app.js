import * as Vsmth from './vsmth.js'

function viewKnob(draw, knob) {
  const knobRef = {};
  const param = knob.param;
  const angle = knob.p2r(param.val);
  function lock() {
    knobRef.current.requestPointerLock();
    model.locked = true;
    //updating model without re-rendering. That's cool
  }
  function turn(e) {
    if (model.locked) {
      param.val = knob.r2p(angle - e.movementY)
      //wouldn't referencing the model be nicer?
      //or even param as a key? like that: model[param]
      draw();
    }
  }
  function unlock() {
    document.exitPointerLock();
    model.locked = false;
  }
  const events = {onmousedown: lock, onmouseup: unlock, onmousemove: turn};
  return (
      ['div', {className: 'knob'},
        ['span', {style: 'margin-bottom: 0.1em'}, knob.title],
        ['svg', {style: 'width: 40px; height: 40px;'},
          ['g', {transform: `rotate(${angle}, 20, 20)`, ...events}, //using a function wouldn't be so pretty here
            ['circle', {ref: knobRef, cx: 20, cy: 20, r: 20}],
            ['rect', {x: 20-1.5, y: 2, width: 3, height: `30%`, fill: 'white'}],
          ],
        ],
        knob.show(param.val),
      ]
  );
}

//abstracting
//wave name
//drawing expression
function waveButtonView(draw, wf, picture) {
  return ['svg', {style: 'width: 30px; height: 20px', onclick: () => {waveform = wf; draw()}},
    ['rect', {width: '100%', height: '100%', fill: ((waveform === wf) ? 'black' : '#eee')}],
    ['svg', {x: 0.15*30, y: 0.15*20, width: 0.7*30, height: 0.7*20, stroke: (waveform === wf) ? 'white' : 'black'},
      picture, //TODO use a group with scaling? //what's a viewbox?
    ],
  ];
}

const a = 0.2;
const d = 0.2;
const s = 0.6;
const r = 0.3;

let waveform = 'sawtooth';

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// create Oscillator node
const input = audioCtx.createGain();
input.gain.value = 50;
//^^

const master = audioCtx.createDynamicsCompressor();
master.threshold.value = -50;

//master.gain.setValueAtTime(1, audioCtx.currentTime);


const lop = audioCtx.createBiquadFilter();
lop.type = 'lowpass';
lop.frequency.value = 1000;
//lop.Q.value = 50;


input.connect(lop);
lop.connect(master);
master.connect(audioCtx.destination);



let octave = 3;

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteKeys = 'zsxdcvgbhnjm,l.;/q2w3e4rt6y7ui9o0p-[]'
const keyFlags = Object.fromEntries([...noteKeys].map(x => [x, false]));

const notes = Array.from(Array(128), (x, i) => ({
  name: getNoteName(i),
  osc: undefined,
}));

function getNoteName(n) {
  return `${noteNames[n % 12]}${Math.floor(n / 12) - 2}`;
  //return n;
}

function view(draw) {
  document.body.onkeypress = e => {
    if (e.key == '<') {
      octave--;
      draw();
    } else if (e.key == '>') {
      octave++;
      draw();
    }
  }
  document.body.onkeydown = e => {
    const relIdx = noteKeys.indexOf(e.key);
    if (relIdx === -1 || keyFlags[relIdx]) return
    keyFlags[relIdx] = true;
    const noteIdx = relIdx + (octave + 2) * 12;
    const osc = audioCtx.createOscillator();
    osc.type = waveform;
    osc.frequency.setValueAtTime(440 * 2**((noteIdx - 69)/12), audioCtx.currentTime); // value in hertz
    osc.connect(input);
    osc.start();
    notes[noteIdx].osc = osc;
    draw();
  }
  document.body.onkeyup = e => {
    const relIdx = noteKeys.indexOf(e.key);
    if (relIdx === -1) return
    keyFlags[relIdx] = false;
    const noteIdx = relIdx + octave * 12 + 24;
    notes[noteIdx].osc.stop();
    notes[noteIdx].osc.disconnect(input);
    notes[noteIdx].osc = undefined;
    draw();
  }
  return ['div',
    `octave: ${octave}`,
    ['br'],
    `notes: ${notes.filter(x => x.osc !== undefined).map(x => x.name).join(', ')}`,
    //store names in array?
    //'a\na\n', //no nl-s in text nodes?
    ['br'],
    waveButtonView(draw, 'sine',
      ['g',
        /*TODO*/
        ['line', {x1: '0%', y1: '50%', x2: '25%', y2: '0%'}],
        ['line', {x1: '25%', y1: '0%', x2: '75%', y2: '100%'}],
        ['line', {x1: '75%', y1: '100%', x2: '100%', y2: '50%'}],
      ]
    ),
    waveButtonView(draw, 'triangle',
      ['g',
        ['line', {x1: '0%', y1: '50%', x2: '25%', y2: '0%'}],
        ['line', {x1: '25%', y1: '0%', x2: '75%', y2: '100%'}],
        ['line', {x1: '75%', y1: '100%', x2: '100%', y2: '50%'}],
      ]
    ),
    waveButtonView(draw, 'square',
      ['g',
        ['line', {x1: '0%', y1: '50%', x2: '0%', y2: '100%'}],
        ['line', {x1: '0%', y1: '100%', x2: '50%', y2: '100%'}],
        ['line', {x1: '50%', y1: '100%', x2: '50%', y2: '0%'}],
        ['line', {x1: '50%', y1: '0%', x2: '100%', y2: '0%'}],
        ['line', {x1: '100%', y1: '0%', x2: '100%', y2: '50%'}],
      ]
    ),
    waveButtonView(draw, 'sawtooth',
      ['g',
        ['line', {x1: '0%', y1: '50%', x2: '50%', y2: '0%'}],
        ['line', {x1: '50%', y1: '0%', x2: '50%', y2: '100%'}],
        ['line', {x1: '50%', y1: '100%', x2: '100%', y2: '50%'}],
      ]
    ),
  ];
}

Vsmth.init(view, document.body);

