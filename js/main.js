/* eslint no-use-before-define: ["error", { "functions": false }] */
/* eslint no-param-reassign: ["error", { "props": false }] */
/* eslint no-global-assign: "warn" */
/* eslint-env browser */

import resetHeader, { showMsg, showErr } from './header';

const document = window.document;
const log = window.console.log;

window.addEventListener('load', () => {
  const actionBtn = document.querySelector('button');
  const gamesList = document.querySelector('.games');
  const battlefield = document.querySelector('.battlefield');

  const BASE_URL = 'xo.t.javascript.ninja';
  const HTTP = 'http';
  const GAMES = buildUrl('ws', BASE_URL, 'games');
  const NEW_GAME = buildUrl(HTTP, BASE_URL, 'newGame');
  const GAME_READY = buildUrl(HTTP, BASE_URL, 'gameReady');
  const MOVE = buildUrl(HTTP, BASE_URL, 'move');
  const GIVE_UP = buildUrl(HTTP, BASE_URL, 'surrender');
  const ws = new WebSocket(GAMES);

  gamesList.innerHTML = '';
  let currentState = resetCurrentState();

  const GAME_ACTION = {
    ADD: 'add',
    REMOVE: 'remove',
    START_GAME: 'startGame',
    ERROR: 'error',
  };

  const ACTION_BTN = {
    CREATE_GAME: 'Создать игру',
    GIVE_UP: 'Сдаться',
    NEW_GAME: 'Новая игра',
  };

  /**
   * Wait response from other gamer (a.k.a. longPooling)
   */
  function waitResponse() {
    if (currentState.playerMove) {
      return;
    }
    const lp = sendReq(MOVE, {
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json; charset=utf-8',
        'Game-ID': currentState.gameId,
        'Player-ID': currentState.playerId,
        mode: 'cors',
        cache: 'no-cache',
      },
      method: 'GET',
    });

    lp.then(response => {
      if (response.win) {
        stopGame(showMsg, `${response.win}`);
        return;
      }
      const cell = battlefield.querySelector(`div[data-idx='${response.move}']`);
      if (!cell) {
        throw Error(`Not found: div[data-idx='${response.move}']`);
      }
      cell.classList.add(`${currentState.competitorSide}`);
      cell.dataset.isfree = false;
      currentState.playerMove = true;
      showMsg(`Игрок "${currentState.playerSide}" твой ход`);
    }).catch(err => {
      if (err && err.status.toString().startsWith('5')) {
        waitResponse();
      } else {
        throw err.json().then(e => {
          let errM = 'waitResponse: Неизвестная ошибка';
          if (e.message) {
            errM = e.message;
          }
          stopGame(showErr, errM);
        });
      }
    });
  }

  /**
   * Update list with games
   * @param {Object} obj
   */
  function updateGames(obj) {
    const action = obj.action;
    const id = obj.id;

    switch (action) {
      case GAME_ACTION.ADD: {
        currentState.gameId = id;
        gamesList.appendChild(addGame(id).firstChild);
      }
        break;
      case GAME_ACTION.REMOVE: {
        const el = gamesList.querySelector(`li[data-id='${id}']`);
        if (!el) {
          throw Error(`Not found game with id: ${id}`);
        }
        gamesList.removeChild(el);
      }
        break;
      case GAME_ACTION.START_GAME: {
        currentState.playerId = id;
        showMsg('Ожидаем начала игры...');
        actionBtn.disabled = true;
        const resp = sendReq(GAME_READY, {
          body: JSON.stringify({ player: currentState.playerId, game: currentState.gameId }),
          headers: {
            Accept: '*/*',
            'Content-Type': 'application/json; charset=utf-8',
            mode: 'cors',
          },
          method: 'POST',
        });
        resp.then(response => {
          currentState.playerSide = response.side;
          hideLobby();
          if (currentState.playerSide === 'x') {
            showMsg(`Игрок "${currentState.playerSide}" твой ход`);
            currentState.competitorSide = 'o';
            currentState.playerMove = true;
          } else {
            showMsg(`Игрок "${currentState.playerSide}" ожидайте ход противника`);
            currentState.competitorSide = 'x';
            waitResponse();
          }
        }).catch(err => {
          const errMsg =
            `START_GAME failed: ${GAME_READY} ${err.status} (${err.statusText})`;
          log(errMsg);
          let msg = 'startGame: Неизвестная ошибка старта игры';
          if (err.status === 410) {
            msg = 'startGame: Ошибка старта игры: другой игрок не ответил';
          }
          stopGame(showErr, msg);
        });
      }
        break;
      default:
        log(`Unexpected action type: ${action}`);
        stopGame(showErr, 'startGame: Неизвестная ошибка старта игры');
        break;
    }
  }

  battlefield.addEventListener('click', (event) => {
    event.preventDefault();
    const cell = event.target;
    if (!cell.classList.contains('cell') || !currentState.playerMove
      || !cell.dataset.isfree) {
      return;
    }
    const bodyReq = JSON.stringify({ move: cell.dataset.idx });
    const resp = sendReq(MOVE, {
      body: bodyReq,
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json; charset=utf-8',
        'Game-ID': currentState.gameId,
        'Player-ID': currentState.playerId,
        mode: 'cors',
        cache: 'no-cache',
      },
      method: 'POST',
    });
    resp.then(response => {
      cell.classList.add(`${currentState.playerSide}`);
      cell.dataset.isfree = false;
      currentState.playerMove = false;
      if (response.win) {
        stopGame(showMsg, `${response.win}`);
      } else {
        showMsg(`Игрок "${currentState.playerSide}" ожидайте ход противника`);
        waitResponse();
      }
    }).catch(err => {
      const errMsg = `${GAME_READY} ${err.status} (${err.statusText})`;
      log(errMsg);
      throw err.json().then(e => {
        let msg = 'battlefield: Неизвестная ошибка';
        if (e.message) {
          msg = e.message;
          stopGame(showErr, msg);
        } else if (e.win) {
          msg = e.win;
          stopGame(showMsg, msg);
        } else {
          stopGame(showErr, msg);
        }
      });
    });
  });

  /**
   * Action button click handler
   */
  actionBtn.addEventListener('click', (event) => {
    event.preventDefault();
    if (event.target !== actionBtn) {
      return;
    }
    switch (event.target.innerHTML) {
      case ACTION_BTN.CREATE_GAME: {
        actionBtn.disabled = true;
        const resp = sendReq(NEW_GAME, { method: 'POST' });
        resp.then(res => res.yourId)
          .then(id => {
            ws.send(JSON.stringify({ register: id }));
          })
          .catch(err => {
            log(`Unexpected error: ${err}`);
            stopGame(showErr, 'Ошибка создания игры');
          });
      }
        break;
      case ACTION_BTN.GIVE_UP: {
        const resp = sendReq(GIVE_UP, {
          headers: {
            Accept: '*/*',
            'Content-Type': 'application/json; charset=utf-8',
            'Game-ID': currentState.gameId,
            'Player-ID': currentState.playerId,
            mode: 'cors',
            cache: 'default',
          },
          method: 'PUT',
        });
        resp.then(response => {
          if (response.success) {
            showLobby();
          }
        }).catch(err => {
          const errMsg = `${GAME_READY} ${err.status} (${err.statusText})`;
          log(errMsg);
          throw err.json().then(e => {
            let errM = 'actionBtn: Неизвестная ошибка';
            if (e.message) {
              errM = e.message;
            }
            stopGame(showErr, errM);
          });
        });
      }
        break;
      case ACTION_BTN.NEW_GAME:
        showLobby();
        break;
      default:
        log(`Unexpected action type: ${event.target}`);
        break;
    }
  });

  /**
   * List with games, click handler
   */
  gamesList.addEventListener('click', (event) => {
    event.preventDefault();
    if (event.target.dataset.id && event.target.dataset.id !== currentState.gameId) {
      ws.send(JSON.stringify({ register: event.target.dataset.id }));
    }
  });

  /**
   * WebSocket message handler
   */
  ws.addEventListener('message', (event) => {
    event.preventDefault();
    const eventObj = JSON.parse(event.data);
    if (eventObj.error === GAME_ACTION.ERROR) {
      log(`WebSocket failed with: ${event.data}`);
    }
    updateGames(eventObj);
  });

  /**
   * Send request
   * @param {String} url
   * @param {Object} init
   * @returns {Promise.<T>}
   */
  function sendReq(url, init) {
    return fetch(url, init).then(response => {
      if (!response.ok) {
        const errMsg =
          `sendReq: ${init.method} ${url} ${response.status} (${response.statusText})`;
        log(errMsg);
        throw response;
      }
      return response.json();
    });
  }

  /**
   * Build request's URL
   * @param {String} protocol
   * @param {String} base
   * @param {String} action
   * @returns {String}
   */
  function buildUrl(protocol, base, action) {
    return `${protocol}://${base}/${action}`;
  }

  /**
   * Reset current game status
   */
  function resetCurrentState() {
    return {
      gameId: '',
      playerId: '',
      playerSide: '',
      competitorSide: '',
      playerMove: false,
    };
  }

  /**
   * Add new game to list in lobby
   * @param {String} id
   * @returns {Element}
   */
  function addGame(id) {
    const div = document.createElement('div');
    div.innerHTML =
      `<li class="item" title="Присоединиться к игре: ${id}" data-id="${id}">game: ${id}</li>`;
    return div;
  }

  /**
   * Generate game field
   * @param {HTMLElement} el
   * @param {Object} d
   */
  function generateBattleField(el, d) {
    let counter = 1;
    const element = el;
    let div = document.createElement('div');
    div.innerHTML = '';
    for (let i = 0; i < d.x; i++) {
      // div.innerHTML += '<div class="row">';
      for (let j = 0; j < d.y; j++) {
        div.innerHTML += `<div class="cell" data-idx="${counter++}" data-isfree="true"></div>`;
      }
      // div.innerHTML += '</div>';
    }
    [...div.children].forEach(item => element.appendChild(item));
    div = undefined;
  }

  /**
   * Stop game
   * @param {Function} fn
   * @param {String} errMsg
   */
  function stopGame(fn, errMsg) {
    fn(errMsg);
    updateBtn(actionBtn, ACTION_BTN.NEW_GAME);
    currentState = resetCurrentState();
  }

  /**
   * Hide battlefield and show lobby
   */
  function showLobby() {
    battlefield.innerHTML = '';
    gamesList.classList.remove('hidden');
    updateBtn(actionBtn, ACTION_BTN.CREATE_GAME);
    resetHeader();
  }

  /**
   * Hide lobby and show battlefield
   */
  function hideLobby() {
    gamesList.classList.add('hidden');
    generateBattleField(battlefield, { x: 10, y: 10 });
    updateBtn(actionBtn, ACTION_BTN.GIVE_UP);
  }

  /**
   * Update button
   * @param {HTMLElement} el
   * @param {String} btn
   */
  function updateBtn(el, btn) {
    const actBtn = el;
    actBtn.disabled = false;
    actBtn.title = btn;
    actBtn.innerHTML = btn;
  }
});
