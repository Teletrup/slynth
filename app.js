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
const master = audioCtx.createGain();
master.gain.setValueAtTime(0.5, audioCtx.currentTime);



let octave = 3;

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteKeys = 'zsxdcvgbhnjm,l.;/q2w3e4rt6y7ui9o0p-'
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
    if (e.key == '[') {
      octave--;
      draw();
    } else if (e.key == ']') {
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
    osc.type = "sawtooth";
    master.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(440 * 2**((noteIdx - 69)/12), audioCtx.currentTime); // value in hertz
    osc.connect(master);
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
    notes[noteIdx].osc.disconnect(master);
    notes[noteIdx].osc = undefined;
    draw();
  }
  return ['div',
    `octave: ${octave}`,
    ['br'],
    `notes: ${notes.filter(x => x.osc !== undefined).map(x => x.name).join(', ')}`,
    //store names in array?
    //'a\na\n', //no nl-s in text nodes?
  ];
}

Vsmth.init(view, document.body);

