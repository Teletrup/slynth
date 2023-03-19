import * as Vsmth from './vsmth.js'

let locked = false

function knobView(draw, title, toReading, fromReading, show) {
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

let waveform = 'sawtooth';

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const input = audioCtx.createGain();

const master = audioCtx.createDynamicsCompressor();
master.threshold.value = -30;

/*
const master = audioCtx.createGain();
master.gain.setValueAtTime(1, audioCtx.currentTime);
*/


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
  env: undefined,
}));

function getNoteName(n) {
  return `${noteNames[n % 12]}${Math.floor(n / 12) - 2}`;
  //return n;
}

let a = 0.3;
let d = 0.3;
let s = 1;
let r = 0.3;


function limit(min, max, val) {
  return Math.max(min, Math.min(max, val)); //TODO explain counterintuitive weirdness
}

function view(draw) {
  document.body.onkeypress = e => {
    if (e.key == 'F') {
      octave--;
      draw();
    } else if (e.key == 'K') {
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
    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0, audioCtx.currentTime); // just assignment?
    env.gain.linearRampToValueAtTime(1, audioCtx.currentTime + a);
    env.gain.linearRampToValueAtTime(s, audioCtx.currentTime + a + d);
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
    const noteIdx = relIdx + octave * 12 + 24;
    const osc = notes[noteIdx].osc;
    const env = notes[noteIdx].env;
    env.gain.linearRampToValueAtTime(0, audioCtx.currentTime + r);
    setTimeout(() => {
      osc.stop();
      env.disconnect(input);
    }, r * 1000);
    notes[noteIdx].osc = undefined;
    notes[noteIdx].env = undefined;
    draw();
  }
  const lspan = Math.log(20000) / Math.log(440) - 1;
  return ['div',
    `octave: ${octave}`,
    ['br'],
    `notes: ${notes.filter(x => x.osc !== undefined).map(x => x.name).join(', ')}`,
    //store names in array?
    //'a\na\n', //no nl-s in text nodes?
    ['br'],
    waveButtonView(draw, 'sine',
      ['g',
        ...[...Array(10).keys()].map(i => ['line', {
          x1: `${i*10}%`,
          y1: `${50 - 50*Math.sin(i/10*2*Math.PI)}%`,
          x2: `${(i+1)*10}%`,
          y2: `${50 - 50*Math.sin((i+1)/10*2*Math.PI)}%`
        }]),
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
        ['line', {x1: '0%', y1: '50%', x2: '0%', y2: '0%'}],
        ['line', {x1: '0%', y1: '0%', x2: '50%', y2: '0%'}],
        ['line', {x1: '50%', y1: '0%', x2: '50%', y2: '100%'}],
        ['line', {x1: '50%', y1: '100%', x2: '100%', y2: '100%'}],
        ['line', {x1: '100%', y1: '100%', x2: '100%', y2: '50%'}],
      ]
    ),
    waveButtonView(draw, 'sawtooth',
      ['g',
        ['line', {x1: '0%', y1: '50%', x2: '50%', y2: '0%'}],
        ['line', {x1: '50%', y1: '0%', x2: '50%', y2: '100%'}],
        ['line', {x1: '50%', y1: '100%', x2: '100%', y2: '50%'}],
      ]
    ),
    ['br'],
    ['div', {style: 'display: flex'},
      knobView(
        draw,
        'cutoff', //named parameters? 
        //() => lop.frequency.value/20000*(2*130)-130,
        //angle => {lop.frequency.value = (angle + 130)/(2*130)*20000},
        () => (Math.log(lop.frequency.value) / Math.log(440) - 1)/lspan*130,
        angle => {lop.frequency.value = limit(9, 20000, 440**(1 + angle/130*lspan))}, //TODO implement log freq
        () => `${Math.floor(lop.frequency.value)} Hz`
      ),
      knobView(
        draw,
        'resonance', //named parameters? 
        //() => lop.frequency.value/20000*(2*130)-130,
        //angle => {lop.frequency.value = (angle + 130)/(2*130)*20000},
        () => lop.Q.value / 100 * 260 - 130,
        angle => {lop.Q.value = 100 * (angle + 130) / 260},
        () => `${Math.floor(lop.Q.value)}`
      ),
    ],
    ['div', {style: 'display: inline-flex'},
      knobView(
        draw,
        'attack',
        () => Math.log(a)/Math.log(10)*130,
        angle => {a = limit(0.1, 10, 10**(angle/130))}, //TODO ranges in parameter, not reading
        () => `${Math.round(a * 100) / 100} s`
      ),
      knobView(
        draw,
        'decay',
        () => Math.log(d)/Math.log(10)*130,
        angle => {d = limit(0.1, 10, 10**(angle/130))},
        () => `${Math.round(d * 100) / 100} s`
      ),
      knobView(
        draw,
        'sustain',
        () => s * 260 - 130,
        angle => {s = limit(0, 1, (angle + 130) / 260)},
        () => `${Math.round(s * 100) / 100}` //in Db?
      ),
      knobView(
        draw,
        'release',
        () => Math.log(r)/Math.log(10)*130,
        angle => {r = limit(0.1, 10, 10**(angle/130))},
        () => `${Math.round(r * 100) / 100} s`
      ),
    ],
  ];
}

Vsmth.init(view, document.body);

