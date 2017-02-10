importScripts('./util.js');
const FLUSH_LIMIT = 100000;
const COORDINATE_PRECISION = 7;
let sequence;
let result = [];
let count = 0;

onmessage = function(e) {
  if (e.data.event !== 'load') {
    return;
  }
  flush(e.data.data);
  postMessage({action: 'end'});
};

function flush(transferable) {
  // decode binary data
  let decoded = parseData(transferable);

  postMessage({
    action: 'add',
    data: decoded,
    meta: {type: 'binary'}
  });
  result = [];
}

function parseData(buffer) {
  let bufferData = new Uint16Array(buffer);
  let hours = 72;
  let components = 3;
  let l = bufferData.length / (hours * components);
  let hourlyData = Array(hours);

  for (let i = 0; i < hours; ++i) {
    hourlyData[i] = createHourlyData(bufferData, i, l, hours, components);
  }
  
  return hourlyData;
}

function createHourlyData(bufferData, i, l, hours, components) {
  let len = bufferData.length;
  let array = Array(l);

  for (let j = i * components, count = 0; count < l; j += (hours * components)) {
    array[count++] = new Float32Array([bufferData[j    ],
                                       bufferData[j + 1],
                                       bufferData[j + 2]]);
  }

  return array;
}