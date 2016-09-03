/* eslint no-use-before-define: ["error", { "functions": false }] */
/* eslint no-global-assign: "warn" */
/* eslint-env browser */

const document = window.document;

const header = document.querySelector('.app-header');
const initBackground = '#eee8aa';
const errBackground = '#ffb3b3';
const msgBackground = '#b3e6b3';
const fontColor = '#ffffff';

/**
 * Reset header to initial state
 */
export default function resetHeader() {
  updateHeader(header);
}

/**
 * Show msg in header element
 * @param {String} msg
 */
export function showMsg(msg) {
  updateHeader(header, msg, msgBackground);
}

/**
 * Show err msg in header element
 * @param {String} msg
 */
export function showErr(msg) {
  updateHeader(header, msg, errBackground);
}

/**
 * Update element with provided msg and styles
 * @param {HTMLElement} el
 * @param {String} msg
 * @param {String} bgColor
 * @param {String} fntColor
 */
function updateHeader(el, msg, bgColor, fntColor) {
  const element = el;
  const p = document.createElement('p');

  element.innerHTML = '';
  element.style.backgroundColor = bgColor || initBackground;
  element.style.color = fntColor || fontColor;

  p.innerHTML = msg || '';
  p.classList.add('msg');

  element.appendChild(p);
}
