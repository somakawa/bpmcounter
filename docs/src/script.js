let cur_taptime;
let pre_taptime;
let first_flg = true;
let log_message;
let bpm;
let bpms = [];
let ave_bpm;

let bpm_text = document.getElementById('bpm-text');
let count_text = document.getElementById('count-txt');
let logs = document.getElementById('logs');
let tap_button = document.getElementById('tap');
let reset_button = document.getElementById('reset');

const clkTapButton = (e) => {
  e.preventDefault();
  cur_taptime = performance.now() / 1000

  if (first_flg) {
    ave_bpm = 0
    log_message = '### START ###';
    pre_taptime = cur_taptime;
    first_flg = false;
  } else {
    bpm = 60 / (cur_taptime - pre_taptime)
    bpms.push(bpm);
    ave_bpm = average(bpms);
    log_message = `BPM = ${bpm}`;
    pre_taptime = cur_taptime;
  }

  bpm_text.innerHTML = (Math.round(ave_bpm * 10) / 10);
  count_text.innerHTML = (bpms.length);
  logs.innerHTML = `<div>${log_message}</div>` + logs.innerHTML;
  e.stopPropagation();
};

const average = (arr, fn) => {
  return sum(arr, fn) / arr.length;
};

const sum = (arr, fn) => {
  if (fn) {
    return sum(arr.map(fn));
  } else {
    return arr.reduce((prev, current, i, arr) => {
      return prev + current;
    });
  }
};

const clkResetButton = () => {
  init();
}

const keyPressEvent = (e) => {
  console.log(e.keyCode);
  if ([32, 13].includes(e.keyCode)) {
    clkTapButton(e);
  }
  if ([67,82,27,8].includes(e.keyCode)) {
    clkResetButton();
  }
}

const init = () => {
  cur_taptime = NaN;
  pre_taptime = NaN;
  first_flg = true;
  log_message = NaN;
  bpm = NaN;
  bpms = [];
  ave_bpm = NaN;

  bpm_text.innerHTML = '###';
  count_text.innerHTML = '###';
  logs.innerHTML = '';
}

init();
tap_button.addEventListener('click', clkTapButton);
reset_button.addEventListener('click', clkResetButton);
document.addEventListener('keydown', keyPressEvent);