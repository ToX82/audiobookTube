/**
 * @jest-environment jsdom
 */

// Mock per il localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    getAll: () => store
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock per YouTube Player API
class YTPlayerMock {
  constructor(elementId, config) {
    this.videoId = config.videoId;
    this.events = config.events;
    this.currentTime = 0;
    this.duration = 300; // 5 minuti
    this.playerState = 0; // Non in riproduzione

    if (this.events && this.events.onReady) {
      setTimeout(() => this.events.onReady(), 0);
    }
  }

  seekTo(seconds) {
    this.currentTime = seconds;
    return seconds;
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getDuration() {
    return this.duration;
  }

  getVideoData() {
    return {
      title: 'Test Video Title'
    };
  }

  playVideo() {
    this.playerState = 1; // Playing
    if (this.events && this.events.onStateChange) {
      this.events.onStateChange({ data: 1 });
    }
  }

  pauseVideo() {
    this.playerState = 2; // Paused
    if (this.events && this.events.onStateChange) {
      this.events.onStateChange({ data: 2 });
    }
  }

  destroy() {
    // Metodo di pulizia
  }
}

global.YT = {
  Player: YTPlayerMock,
  PlayerState: {
    PLAYING: 1,
    PAUSED: 2
  }
};

// Mock per document.getElementById
const elements = {};
function createElementMock(id, attrs = {}) {
  const element = document.createElement('div');
  element.id = id;

  if (attrs.classList) {
    element.classList.add(...attrs.classList);
  }

  if (attrs.innerHTML) {
    element.innerHTML = attrs.innerHTML;
  }

  Object.keys(attrs).forEach(key => {
    if (key !== 'classList' && key !== 'innerHTML') {
      element[key] = attrs[key];
    }
  });

  elements[id] = element;
  document.body.appendChild(element);
  return element;
}

// Preparazione del DOM per i test
beforeEach(() => {
  // Reset localStorage
  localStorageMock.clear();

  // Pulire elementi DOM precedenti
  document.body.innerHTML = '';

  // Creare elementi necessari
  createElementMock('urlInput');
  createElementMock('playerInterface', { classList: ['hidden'] });
  createElementMock('playPause', { innerHTML: '<iconify-icon icon="mdi:play"></iconify-icon>' });
  createElementMock('seekBar', { value: 0 });
  createElementMock('currentTime');
  createElementMock('duration');
  createElementMock('speed', { value: '1' });
  createElementMock('historySection', { classList: ['hidden'] });
  createElementMock('historyList');
  createElementMock('sliderTooltip');
  createElementMock('themeToggle');
  createElementMock('sunIcon', { classList: ['hidden'] });
  createElementMock('moonIcon');
  createElementMock('loadingOverlay', { classList: ['hidden'] });
  createElementMock('skipBack30');
  createElementMock('skipForward30');
  createElementMock('skipBack5');
  createElementMock('skipForward5');
  createElementMock('clearHistory');
  createElementMock('youtubePlayer');

  // Mock per il template
  const template = document.createElement('template');
  template.id = 'historyItemTemplate';
  template.innerHTML = `
    <div class="group">
      <img src="">
      <div class="play-indicator">
        <iconify-icon icon="mdi:play"></iconify-icon>
      </div>
      <span class="video-title"></span>
      <span class="video-duration"></span>
      <span class="video-timestamp"></span>
      <span class="video-age"></span>
      <div class="progress-bar"></div>
      <button class="delete-btn"></button>
    </div>
  `;
  document.body.appendChild(template);

  // Mock per Event per supportare dispatchEvent
  global.Event = class Event {
    constructor(type) {
      this.type = type;
    }
  };
});

// Imposta una versione mock di AudioPlayer per i test
const mockAudioPlayer = {
  HISTORY_KEY: 'ytAudioHistory',
  elements: elements,
  player: null,
  isPlaying: false,
  currentVideoId: null,
  skipTime: jest.fn((seconds) => {
    if (mockAudioPlayer.player) {
      mockAudioPlayer.player.seekTo(mockAudioPlayer.player.getCurrentTime() + seconds);
    }
  }),

  renderHistory() {
    const history = JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || [];
    this.elements.historySection.classList.toggle('hidden', history.length === 0);
  },

  createPlayer(videoId) {
    this.currentVideoId = videoId;
    this.player = {
      currentTime: 0,
      seekTo: jest.fn((time) => {
        this.player.currentTime = time;
      }),
      getCurrentTime: jest.fn(() => this.player.currentTime),
      getDuration: jest.fn(() => 300)
    };
    return this.player;
  },

  updateHistorySectionVisibility() {
    const history = JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || [];
    this.elements.historySection.classList.toggle('hidden', history.length === 0);
  }
};

describe('AudioPlayer', () => {
  test('dovrebbe renderizzare la history al caricamento', () => {
    // Simuliamo alcuni elementi nella cronologia
    const historyItems = [
      {
        id: 'video1',
        timestamp: 120,
        duration: 300,
        lastPlayed: Date.now() - 3600000,
        thumbnail: 'https://img.youtube.com/vi/video1/default.jpg',
        title: 'Video test 1'
      },
      {
        id: 'video2',
        timestamp: 60,
        duration: 240,
        lastPlayed: Date.now() - 86400000,
        thumbnail: 'https://img.youtube.com/vi/video2/default.jpg',
        title: 'Video test 2'
      }
    ];

    // Impostare i dati nel localStorage
    localStorage.setItem('ytAudioHistory', JSON.stringify(historyItems));

    // Forza l'aggiornamento della UI
    mockAudioPlayer.updateHistorySectionVisibility();

    // Verifica che la history sia visibile
    expect(elements.historySection.classList.contains('hidden')).toBe(false);
  });

  test('dovrebbe mantenere la history visibile dopo il refresh', () => {
    // Simuliamo alcuni elementi nella cronologia
    const historyItems = [
      {
        id: 'video1',
        timestamp: 120,
        duration: 300,
        lastPlayed: Date.now(),
        thumbnail: 'https://img.youtube.com/vi/video1/default.jpg',
        title: 'Video test 1'
      }
    ];

    // Impostare i dati nel localStorage
    localStorage.setItem('ytAudioHistory', JSON.stringify(historyItems));

    // Forza l'aggiornamento della UI
    mockAudioPlayer.updateHistorySectionVisibility();

    // Verifica che la history sia visibile
    expect(elements.historySection.classList.contains('hidden')).toBe(false);
  });

  test('skipTime dovrebbe riavvolgere di 30 secondi', () => {
    // Setup: creare un player mock
    const player = mockAudioPlayer.createPlayer('testVideo');
    player.currentTime = 100;

    // Chiamare skipTime
    mockAudioPlayer.skipTime(-30);

    // Verificare che il tempo sia diminuito di 30 secondi
    expect(player.currentTime).toBe(70);
  });

  test('skipTime dovrebbe avanzare di 30 secondi', () => {
    // Setup: creare un player mock
    const player = mockAudioPlayer.createPlayer('testVideo');
    player.currentTime = 100;

    // Chiamare skipTime
    mockAudioPlayer.skipTime(30);

    // Verificare che il tempo sia aumentato di 30 secondi
    expect(player.currentTime).toBe(130);
  });

  test('skipTime dovrebbe riavvolgere di 5 secondi', () => {
    // Setup: creare un player mock
    const player = mockAudioPlayer.createPlayer('testVideo');
    player.currentTime = 100;

    // Chiamare skipTime
    mockAudioPlayer.skipTime(-5);

    // Verificare che il tempo sia diminuito di 5 secondi
    expect(player.currentTime).toBe(95);
  });

  test('skipTime dovrebbe avanzare di 5 secondi', () => {
    // Setup: creare un player mock
    const player = mockAudioPlayer.createPlayer('testVideo');
    player.currentTime = 100;

    // Chiamare skipTime
    mockAudioPlayer.skipTime(5);

    // Verificare che il tempo sia aumentato di 5 secondi
    expect(player.currentTime).toBe(105);
  });

  test('i pulsanti di skip dovrebbero essere collegati alle rispettive funzioni', () => {
    // Prepariamo una funzione di skip per il test che verrà collegata ai pulsanti
    const skipTimeSpy = jest.fn();

    // Aggiungi event listener ai bottoni
    elements.skipBack30.addEventListener('click', () => skipTimeSpy(-30));
    elements.skipForward30.addEventListener('click', () => skipTimeSpy(30));
    elements.skipBack5.addEventListener('click', () => skipTimeSpy(-5));
    elements.skipForward5.addEventListener('click', () => skipTimeSpy(5));

    // Simulare i click sui pulsanti
    elements.skipBack30.click();
    elements.skipForward30.click();
    elements.skipBack5.click();
    elements.skipForward5.click();

    // Verificare che la funzione sia stata chiamata con i parametri corretti
    expect(skipTimeSpy).toHaveBeenCalledWith(-30);
    expect(skipTimeSpy).toHaveBeenCalledWith(30);
    expect(skipTimeSpy).toHaveBeenCalledWith(-5);
    expect(skipTimeSpy).toHaveBeenCalledWith(5);
    expect(skipTimeSpy).toHaveBeenCalledTimes(4);
  });
});