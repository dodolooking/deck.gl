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
  const lines = JSON.parse(e.data.text);
  result.push.apply(result, lines);
  flush();
  postMessage({action: 'end'});
};

function flush() {
  postMessage({
    action: 'add',
    data: result,
    meta: {size: result.length}
  });
  result = [];
}