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

const a = 0.2;
const d = 0.2;
const s = 0.6;
const r = 0.3;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// create Oscillator node
const oscillator = audioCtx.createOscillator();
const master = audioCtx.createGain();
master.gain.setValueAtTime(0.5, audioCtx.currentTime);

oscillator.type = "sawtooth";
master.connect(audioCtx.destination);
oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // value in hertz

let started = false;
const play = () => {
  if (!started) {
    oscillator.start();
    started = true;
  }
  oscillator.connect(master);
}
const stop = () => oscillator.disconnect(master);

/*
document.body.onkeydown = play;
document.body.onkeyup = stop;
*/

let octave = 4;

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteKeys = 'zsxdcvgbhnjm,l.;/q2w3e4rt6y7ui9o0p-'

let note;

function getNoteName(n) {
  return `${noteNames[n % 12]}${Math.floor(n / 12)}`;
}

function view(draw) {
  document.body.onkeypress = e => {
    if (e.key == '[') {
      octave--;
      draw();
    } else if (e.key == ']') {
      octave++;
      draw();
    }
  }
  document.body.onkeydown = e => {
    const noteIdx = noteKeys.indexOf(e.key);
    if (noteIdx === -1) return;
    note = noteIdx + octave * 12;
    draw();
  }
  return ['div',
    `octave: ${octave}`,
    ['br'],
    `note: ${getNoteName(note)}`,
    //'a\na\n', //no nl-s in text nodes?
    
  ];
}

Vsmth.init(view, document.body);

