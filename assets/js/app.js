/* ── Audio helpers (module-level to keep out of Alpine reactivity) ── */
let _audioCtx = null;

function _ensureAudio() {
	if (!_audioCtx) {
		const AC = window.AudioContext || window.webkitAudioContext;
		if (AC) _audioCtx = new AC();
	}
	if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
	return _audioCtx;
}

function _tone(freq, dur, muted) {
	if (muted) return;
	const ctx = _ensureAudio();
	if (!ctx) return;
	const t = ctx.currentTime;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = 'sine';
	osc.frequency.value = freq;
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	osc.connect(gain).connect(ctx.destination);
	osc.start(t);
	osc.stop(t + dur + 0.03);
}

function _buzz(muted) {
	if (muted) return;
	const ctx = _ensureAudio();
	if (!ctx) return;
	const t = ctx.currentTime;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = 'sawtooth';
	osc.frequency.setValueAtTime(170, t);
	osc.frequency.exponentialRampToValueAtTime(70, t + 0.5);
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
	osc.connect(gain).connect(ctx.destination);
	osc.start(t);
	osc.stop(t + 0.6);
}

function _win(muted) {
	if (muted) return;
	const ctx = _ensureAudio();
	if (!ctx) return;
	[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
		const t = ctx.currentTime + i * 0.12;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'triangle';
		osc.frequency.value = f;
		gain.gain.setValueAtTime(0.0001, t);
		gain.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
		gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
		osc.connect(gain).connect(ctx.destination);
		osc.start(t);
		osc.stop(t + 0.3);
	});
}

/* Runs fn after ms, unless component._gen has moved on (e.g. the game was stopped) in the meantime. */
function _guardedDelay(component, ms, fn) {
	const gen = component._gen;
	setTimeout(() => { if (component._gen === gen) fn(); }, ms);
}

/* 0=red(TL)  1=blue(TR)  2=yellow(BL)  3=cyan(BR) */
const QUADS = [
	{ freq: 329.63 },
	{ freq: 261.63 },
	{ freq: 392.00 },
	{ freq: 523.25 },
];

const HS_KEY = 'memorygames.best';
const SEQ_SCORES_KEY = 'memorygames.sequence.scores';
const MAX_SCORES = 3;

const DIFF_LEVELS_BEST_KEY   = 'memorygames.difference.levels.best';
const DIFF_LEVELS_SCORES_KEY = 'memorygames.difference.levels.scores';
const DIFF_TIMER_BEST_KEY    = 'memorygames.difference.timer.best';
const DIFF_TIMER_SCORES_KEY  = 'memorygames.difference.timer.scores';
const DIFF_FASTEST_BEST_KEY   = 'memorygames.difference.fastest.best';
const DIFF_FASTEST_SCORES_KEY = 'memorygames.difference.fastest.scores';

const MATCH_TIMER_BEST_KEY     = 'memorygames.match.timer.best';
const MATCH_TIMER_SCORES_KEY   = 'memorygames.match.timer.scores';
const MATCH_FASTEST_BEST_KEY   = 'memorygames.match.fastest.best';
const MATCH_FASTEST_SCORES_KEY = 'memorygames.match.fastest.scores';
const MATCH_STREAK_BEST_KEY    = 'memorygames.match.streak.best';
const MATCH_STREAK_SCORES_KEY  = 'memorygames.match.streak.scores';

const TRAY_CLASSIC_BEST_KEY    = 'memorygames.tray.classic.best';
const TRAY_CLASSIC_SCORES_KEY  = 'memorygames.tray.classic.scores';
const TRAY_FASTEST_BEST_KEY    = 'memorygames.tray.fastest.best';
const TRAY_FASTEST_SCORES_KEY  = 'memorygames.tray.fastest.scores';
const TRAY_STREAK_BEST_KEY     = 'memorygames.tray.streak.best';
const TRAY_STREAK_SCORES_KEY   = 'memorygames.tray.streak.scores';

/* ── Shared score store ──────────────────────────────────────── */
document.addEventListener('alpine:init', () => {
	Alpine.store('scores', {
		sequenceBest:   Alpine.$persist(0).as(HS_KEY),
		sequenceScores: Alpine.$persist([]).as(SEQ_SCORES_KEY),

		differenceLevelsBest:   Alpine.$persist(0).as(DIFF_LEVELS_BEST_KEY),
		differenceLevelsScores: Alpine.$persist([]).as(DIFF_LEVELS_SCORES_KEY),
		differenceTimerBest:    Alpine.$persist(0).as(DIFF_TIMER_BEST_KEY),
		differenceTimerScores:  Alpine.$persist([]).as(DIFF_TIMER_SCORES_KEY),
		differenceFastestBest:   Alpine.$persist(0).as(DIFF_FASTEST_BEST_KEY), // seconds; 0 = no record yet
		differenceFastestScores: Alpine.$persist([]).as(DIFF_FASTEST_SCORES_KEY),

		matchTimerBest:   Alpine.$persist(0).as(MATCH_TIMER_BEST_KEY),
		matchTimerScores: Alpine.$persist([]).as(MATCH_TIMER_SCORES_KEY),
		matchFastestBest:   Alpine.$persist(0).as(MATCH_FASTEST_BEST_KEY), // seconds; 0 = no record yet
		matchFastestScores: Alpine.$persist([]).as(MATCH_FASTEST_SCORES_KEY),
		matchStreakBest:   Alpine.$persist(0).as(MATCH_STREAK_BEST_KEY),
		matchStreakScores: Alpine.$persist([]).as(MATCH_STREAK_SCORES_KEY),

		trayClassicBest:   Alpine.$persist({}).as(TRAY_CLASSIC_BEST_KEY),   // { "6": 12, "8": 20, ... } keyed by object count
		trayClassicScores: Alpine.$persist([]).as(TRAY_CLASSIC_SCORES_KEY),
		trayFastestBest:   Alpine.$persist({}).as(TRAY_FASTEST_BEST_KEY),   // { "6": 4.2, ... } seconds, keyed by object count
		trayFastestScores: Alpine.$persist([]).as(TRAY_FASTEST_SCORES_KEY),
		trayStreakBest:    Alpine.$persist(0).as(TRAY_STREAK_BEST_KEY),
		trayStreakScores:  Alpine.$persist([]).as(TRAY_STREAK_SCORES_KEY),
	});
});

/* ── Alpine component ────────────────────────────────────────── */
function memoryGame() {
	return {
		phase:      'idle', // idle | watch | input | gameover | levelup
		sequence:   [],
		level:      1,
		score:      0,
		roundCount: 0,
		lit:        null,
		hint:       'Press Start, then repeat the sequence of lights.',
		shake:      false,
		scorePop:   false,
		muted:      false,
		LEVEL_LEN:  5,

		_runId:    0,
		_inputIdx: 0,

		init() {
			this.$watch('page', (value) => { if (value !== 'sequence') this.stopGame(); });
		},

		get best() {
			return Alpine.store('scores').sequenceBest;
		},
		set best(v) {
			Alpine.store('scores').sequenceBest = v;
		},

		get litLen() {
			return this.sequence.length === 0
				? 0
				: ((this.sequence.length - 1) % this.LEVEL_LEN) + 1;
		},

		_sleep(ms) {
			return new Promise(r => setTimeout(r, ms));
		},

		async _lightUp(idx, onDur, offDur) {
			this.lit = idx;
			_tone(QUADS[idx].freq, Math.min(0.4, onDur / 1000), this.muted);
			await this._sleep(onDur);
			this.lit = null;
			await this._sleep(offDur);
		},

		async _playBack(seq) {
			const myRun = ++this._runId;
			this.phase = 'watch';
			this.hint  = 'Watch carefully…';
			const onDur  = Math.max(230, 560 - (this.level - 1) * 70);
			const offDur = Math.max(120, 250 - (this.level - 1) * 30);
			await this._sleep(560);
			for (let i = 0; i < seq.length; i++) {
				if (this._runId !== myRun) return;
				await this._lightUp(seq[i], onDur, offDur);
			}
			if (this._runId !== myRun) return;
			this._inputIdx  = 0;
			this.roundCount = 0;
			this.phase = 'input';
			this.hint  = 'Your turn — repeat it!';
		},

		async _nextRound(prevSeq) {
			const next = [...prevSeq, Math.floor(Math.random() * 4)];
			this.level    = Math.floor((next.length - 1) / this.LEVEL_LEN) + 1;
			this.sequence = next;
			await this._playBack(next);
		},

		async startGame() {
			_ensureAudio();
			this._runId++;
			this.score      = 0;
			this.roundCount = 0;
			this.level      = 1;
			this.sequence   = [];
			this._inputIdx  = 0;
			this.hint       = '';
			await this._nextRound([]);
		},

		_commitBest(s) {
			if (s > this.best) this.best = s;
		},

		_recordScore(score, level) {
			const store = Alpine.store('scores');
			store.sequenceScores = [...store.sequenceScores, { score, level, date: new Date().toISOString() }]
				.sort((a, b) => b.score - a.score)
				.slice(0, MAX_SCORES);
		},

		handlePress(idx) {
			if (this.phase !== 'input') return;

			this.lit = idx;
			_tone(QUADS[idx].freq, 0.28, this.muted);
			setTimeout(() => { if (this.lit === idx) this.lit = null; }, 200);

			const expected = this.sequence[this._inputIdx];

			if (idx !== expected) {
				this._runId++;
				_buzz(this.muted);
				if (this.roundCount > 0) this.score += this.roundCount;
				this._commitBest(this.score);
				this._recordScore(this.score, this.level);
				this.shake = true;
				setTimeout(() => { this.shake = false; }, 520);
				this.phase = 'gameover';
				this.hint  = 'Wrong button! Press Start to try again.';
				return;
			}

			this._inputIdx++;
			this.roundCount++;

			if (this._inputIdx >= this.sequence.length) {
				const earned = this.roundCount;
				this.score += earned;
				this._commitBest(this.score);
				this.scorePop = true;
				setTimeout(() => { this.scorePop = false; }, 340);

				if (this.sequence.length % this.LEVEL_LEN === 0) {
					_win(this.muted);
					const doneLevel = this.sequence.length / this.LEVEL_LEN;
					this.phase = 'levelup';
					this.hint  = `Level ${doneLevel} complete! The sequence keeps growing…`;
					const seq = this.sequence, myRun = this._runId;
					setTimeout(() => { if (this._runId === myRun) this._nextRound(seq); }, 1700);
				} else {
					this.phase = 'watch';
					this.hint  = 'Nice! Next sequence…';
					const seq = this.sequence, myRun = this._runId;
					setTimeout(() => { if (this._runId === myRun) this._nextRound(seq); }, 700);
				}
			}
		},

		stopGame() {
			if (this.phase === 'idle' || this.phase === 'gameover') return;
			this._runId++;
			if (this.phase === 'input' && this.roundCount > 0) this.score += this.roundCount;
			if (this.score > 0) {
				this._commitBest(this.score);
				this._recordScore(this.score, this.level);
			}
			this.phase = 'idle';
			this.hint  = 'Press Start, then repeat the sequence of lights.';
			this.lit   = null;
		},

		handleKey(e) {
			const keyMap = {
				q: 0, w: 1, a: 2, s: 3,
				arrowleft: 0, arrowup: 1, arrowdown: 2, arrowright: 3,
			};
			const k = e.key.toLowerCase();
			if (k === ' ' || k === 'enter') {
				if (this.phase === 'idle' || this.phase === 'gameover') {
					e.preventDefault();
					this.startGame();
				}
				return;
			}
			if (k in keyMap) { e.preventDefault(); this.handlePress(keyMap[k]); }
		},
	};
}

/* ── Spot the Difference ─────────────────────────────────────── */
const DIFF_LEVEL_COUNTS     = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
const DIFF_STAGES_PER_LEVEL = 5;
const DIFF_MAX_LEVEL        = DIFF_LEVEL_COUNTS.length;
const DIFF_POINTS_PER_FIND  = 2;
const DIFF_TIMER_SECONDS    = 60;
const DIFF_MAX_SCORES       = 3;
const DIFF_MARK_RADIUS      = 24;

function differenceGame() {
	return {
		mode:       'levels', // levels | timer | fastest
		diffCount:  8,        // timer/fastest setup pick, 4..12
		diffOptions: [4, 5, 6, 7, 8, 9, 10, 11, 12],
		STAGES_PER_LEVEL: DIFF_STAGES_PER_LEVEL,
		MAX_LEVEL: DIFF_MAX_LEVEL,

		phase: 'setup', // setup | playing | stageclear | levelup | complete | roundclear | timeup

		level: 1,
		stage: 1,
		score: 0,
		found: new Set(),
		active: new Set(),
		scene: null,
		baseSvgInner: '',
		modSvgInner:  '',
		hint: '',
		muted: false,

		timeLeft: DIFF_TIMER_SECONDS, // timer mode countdown, seconds
		elapsed:  0,                  // fastest mode stopwatch, seconds
		timerRunning: false,

		_interval:  null,
		_startTs:   0,
		_deadline:  0,
		_lastSceneId: null,
		_gen: 0,

		init() {
			this.$watch('page', (value) => { if (value !== 'difference') this.backToSetup(); });
		},

		get levelsBest() { return Alpine.store('scores').differenceLevelsBest; },
		set levelsBest(v) { Alpine.store('scores').differenceLevelsBest = v; },
		get timerBest() { return Alpine.store('scores').differenceTimerBest; },
		set timerBest(v) { Alpine.store('scores').differenceTimerBest = v; },
		get fastestBest() { return Alpine.store('scores').differenceFastestBest; },
		set fastestBest(v) { Alpine.store('scores').differenceFastestBest = v; },

		get fastestBestLabel() {
			return this.fastestBest > 0 ? this.fastestBest.toFixed(1) + 's' : '—';
		},
		get elapsedLabel() {
			return this.elapsed.toFixed(1) + 's';
		},
		get timeLeftLabel() {
			const s = Math.max(0, Math.ceil(this.timeLeft));
			return `0:${String(s).padStart(2, '0')}`;
		},

		get currentDiffCount() {
			return this.mode === 'levels' ? DIFF_LEVEL_COUNTS[this.level - 1] : this.diffCount;
		},
		get foundCount() { return this.found.size; },
		get totalCount()  { return this.active.size; },
		get stagesDone() {
			return this.phase === 'playing' ? this.stage - 1 : this.stage;
		},
		get statsBest() {
			return this.mode === 'levels' ? this.levelsBest : this.mode === 'timer' ? this.timerBest : this.fastestBestLabel;
		},

		get modeLabel() {
			return this.mode === 'levels' ? 'Levels' : this.mode === 'timer' ? 'Against Timer' : 'Fastest Time';
		},
		get modeDescription() {
			if (this.mode === 'levels')  return 'Clear 5 stages per level to advance. Differences per stage grow from 4 up to 22 across 10 levels.';
			if (this.mode === 'timer')   return 'Find every difference before the 60 second clock runs out. Keep clearing rounds to build your score.';
			return 'Timing starts on your first find and stops on your last. Keep playing rounds to beat your best time.';
		},

		/* ---- setup / lifecycle ---- */
		startGame() {
			_ensureAudio();
			this._clearTimer();
			this.score = 0;
			this.hint  = '';
			if (this.mode === 'levels') {
				this.level = 1;
				this.stage = 1;
				this._loadRound(this._pickScene(), DIFF_LEVEL_COUNTS[0]);
			} else if (this.mode === 'timer') {
				this._loadRound(this._pickScene(), this.diffCount);
				this._startCountdown();
			} else {
				this._loadRound(this._pickScene(), this.diffCount);
				this.elapsed = 0;
				this.timerRunning = false;
			}
			this.phase = 'playing';
		},

		backToSetup() {
			this._clearTimer();
			this._gen++;
			if (this.phase === 'playing' && this.score > 0 && this.mode !== 'fastest') {
				this._commitBest();
				this._recordScore();
			}
			this.phase = 'setup';
		},

		/* ---- round / scene management ---- */
		_pickScene(excludeId) {
			const scenes = window.SpotDiff.SCENES;
			const pool = excludeId ? scenes.filter(s => s.id !== excludeId) : scenes;
			const list = pool.length ? pool : scenes;
			return list[Math.floor(Math.random() * list.length)];
		},

		_loadRound(scene, diffCount) {
			this.scene = scene;
			this._lastSceneId = scene.id;
			const seed = Math.floor(Math.random() * 1e9);
			this.active = window.SpotDiff.pickRound(scene, diffCount, seed);
			this.found  = new Set();
			this._renderPanels();
		},

		_renderPanels() {
			const { renderBase, renderModified } = window.SpotDiff;
			this.baseSvgInner = renderBase(this.scene);
			this.modSvgInner  = renderModified(this.scene, this.active) + this._foundMarkersSvg();
		},

		_foundMarkersSvg() {
			if (this.found.size === 0) return '';
			return window.SpotDiff.getActiveDiffs(this.scene, this.active)
				.filter(d => this.found.has(d.id))
				.map(d => `<circle cx="${d.x}" cy="${d.y}" r="16" fill="none" stroke="#fff" stroke-width="3"/><circle cx="${d.x}" cy="${d.y}" r="16" fill="none" stroke="hsl(189,59%,53%)" stroke-width="1.5" opacity="0.9"/>`)
				.join('');
		},

		/* ---- input ---- */
		handlePanelClick(evt) {
			if (this.phase !== 'playing' || !this.scene) return;
			const svg  = evt.currentTarget;
			const rect = svg.getBoundingClientRect();
			const [W, H] = this.scene.vb;
			const x = (evt.clientX - rect.left) / rect.width  * W;
			const y = (evt.clientY - rect.top)  / rect.height * H;
			const hit = window.SpotDiff.hitTest(this.scene, this.active, x, y, DIFF_MARK_RADIUS);
			if (!hit || this.found.has(hit.id)) return;

			this.found.add(hit.id);
			this.found = new Set(this.found);
			this.score += DIFF_POINTS_PER_FIND;
			_tone(660 + this.found.size * 12, 0.16, this.muted);
			this._renderPanels();

			if (this.mode === 'fastest' && !this.timerRunning && this.found.size === 1) {
				this._startStopwatch();
			}

			if (this.found.size >= this.active.size) this._onRoundComplete();
		},

		/* ---- timers ---- */
		_clearTimer() {
			if (this._interval) { clearInterval(this._interval); this._interval = null; }
		},

		_startCountdown() {
			this._clearTimer();
			this.timeLeft  = DIFF_TIMER_SECONDS;
			this._deadline = Date.now() + DIFF_TIMER_SECONDS * 1000;
			this._interval = setInterval(() => {
				const remain = (this._deadline - Date.now()) / 1000;
				this.timeLeft = Math.max(0, remain);
				if (remain <= 0) { this._clearTimer(); this._onTimeUp(); }
			}, 100);
		},

		_startStopwatch() {
			this._clearTimer();
			this._startTs = Date.now();
			this.timerRunning = true;
			this._interval = setInterval(() => {
				this.elapsed = (Date.now() - this._startTs) / 1000;
			}, 100);
		},

		_onTimeUp() {
			_buzz(this.muted);
			this._commitBest();
			this._recordScore();
			this.phase = 'timeup';
		},

		/* ---- round/level progression ---- */
		_onRoundComplete() {
			if (this.mode === 'levels') {
				this._commitBest();
				if (this.stage < DIFF_STAGES_PER_LEVEL) {
					this.phase = 'stageclear';
					this.hint  = `Stage ${this.stage} of ${DIFF_STAGES_PER_LEVEL} clear!`;
					const nextStage = this.stage + 1, lvl = this.level;
					_guardedDelay(this, 900, () => {
						this.stage = nextStage;
						this._loadRound(this._pickScene(this._lastSceneId), DIFF_LEVEL_COUNTS[lvl - 1]);
						this.phase = 'playing';
					});
				} else if (this.level < DIFF_MAX_LEVEL) {
					_win(this.muted);
					this.phase = 'levelup';
					const nextLevel = this.level + 1;
					_guardedDelay(this, 1700, () => {
						this.level = nextLevel;
						this.stage = 1;
						this._loadRound(this._pickScene(this._lastSceneId), DIFF_LEVEL_COUNTS[nextLevel - 1]);
						this.phase = 'playing';
					});
				} else {
					_win(this.muted);
					this._recordScore();
					this.phase = 'complete';
				}
			} else if (this.mode === 'timer') {
				this._commitBest();
				this.phase = 'roundclear';
				_guardedDelay(this, 700, () => {
					this._loadRound(this._pickScene(this._lastSceneId), this.diffCount);
					this._startCountdown();
					this.phase = 'playing';
				});
			} else {
				this._clearTimer();
				this.timerRunning = false;
				this._commitFastest(this.elapsed);
				this.phase = 'roundclear';
				_guardedDelay(this, 900, () => {
					this._loadRound(this._pickScene(this._lastSceneId), this.diffCount);
					this.elapsed = 0;
					this.phase = 'playing';
				});
			}
		},

		/* ---- persistence ---- */
		_commitBest() {
			const key = this.mode === 'levels' ? 'levelsBest' : 'timerBest';
			if (this.score > this[key]) this[key] = this.score;
		},

		_commitFastest(time) {
			if (this.fastestBest === 0 || time < this.fastestBest) this.fastestBest = time;
			const store = Alpine.store('scores');
			store.differenceFastestScores = [...store.differenceFastestScores, { time, diffCount: this.diffCount, date: new Date().toISOString() }]
				.sort((a, b) => a.time - b.time)
				.slice(0, DIFF_MAX_SCORES);
		},

		_recordScore() {
			const store = Alpine.store('scores');
			const key = this.mode === 'levels' ? 'differenceLevelsScores' : 'differenceTimerScores';
			const entry = this.mode === 'levels'
				? { score: this.score, level: this.level, date: new Date().toISOString() }
				: { score: this.score, diffCount: this.diffCount, date: new Date().toISOString() };
			store[key] = [...store[key], entry]
				.sort((a, b) => b.score - a.score)
				.slice(0, DIFF_MAX_SCORES);
		},
	};
}

/* ── Match ────────────────────────────────────────────────────── */
const MATCH_FRONT_FILES = [
	'01-quarters.svg', '02-rings.svg', '03-four-dots.svg', '04-chevrons.svg',
	'05-pinwheel.svg', '06-cross.svg', '07-bars.svg', '08-waves.svg',
	'09-flower.svg', '10-star.svg', '11-squares.svg', '12-arches.svg',
	'13-stripes.svg', '14-corners.svg', '15-peaks.svg', '16-confetti.svg',
	'17-overlap.svg', '18-zigzag.svg', '19-tiles.svg', '20-rays.svg',
	'21-diamonds.svg', '22-spokes.svg', '23-spiral.svg', '24-grid.svg',
];
const MATCH_CARD_COUNTS = [12, 16, 20, 24, 28, 32, 36, 40, 44, 48];
const MATCH_TIMER_SECONDS = 60;
const MATCH_POINTS_PER_PAIR = 2;
const MATCH_MAX_SCORES = 3;

const MATCH_STREAK_LEVELS = [
	{ cards: [8, 10, 12, 14, 16], preview: 10 },
	{ cards: [18, 20, 22, 24, 26], preview: 15 },
	{ cards: [28, 30, 32, 34, 36], preview: 20 },
	{ cards: [38, 40, 42, 44, 48], preview: 25 },
];
const MATCH_STREAK_STAGES_PER_LEVEL = 5;
const MATCH_STREAK_MAX_LEVEL = MATCH_STREAK_LEVELS.length;

function matchGame() {
	return {
		mode: 'timer', // timer | fastest | streak
		cardCount: 12, // timer/fastest setup pick, 12..48
		cardCountOptions: MATCH_CARD_COUNTS,
		STREAK_STAGES_PER_LEVEL: MATCH_STREAK_STAGES_PER_LEVEL,
		STREAK_MAX_LEVEL: MATCH_STREAK_MAX_LEVEL,

		phase: 'setup', // setup | preview | playing | stageclear | levelup | complete | roundclear | timeup

		level: 1,
		stage: 1,
		score: 0,
		cards: [],
		selected: [],
		lock: false,
		hint: '',
		muted: false,

		timeLeft: MATCH_TIMER_SECONDS, // timer mode countdown, seconds
		elapsed: 0,                    // fastest mode stopwatch, seconds
		timerRunning: false,
		previewTime: 0,                // streak mode memorize countdown, seconds

		_interval: null,
		_startTs:  0,
		_deadline: 0,
		_gen: 0,

		init() {
			this.$watch('page', (value) => { if (value !== 'match') this.backToSetup(); });
		},

		get timerBest() { return Alpine.store('scores').matchTimerBest; },
		set timerBest(v) { Alpine.store('scores').matchTimerBest = v; },
		get fastestBest() { return Alpine.store('scores').matchFastestBest; },
		set fastestBest(v) { Alpine.store('scores').matchFastestBest = v; },
		get streakBest() { return Alpine.store('scores').matchStreakBest; },
		set streakBest(v) { Alpine.store('scores').matchStreakBest = v; },

		get fastestBestLabel() {
			return this.fastestBest > 0 ? this.fastestBest.toFixed(1) + 's' : '—';
		},
		get elapsedLabel() {
			return this.elapsed.toFixed(1) + 's';
		},
		get timeLeftLabel() {
			const s = Math.max(0, Math.ceil(this.timeLeft));
			return `0:${String(s).padStart(2, '0')}`;
		},

		get statsBest() {
			return this.mode === 'timer' ? this.timerBest : this.mode === 'fastest' ? this.fastestBestLabel : this.streakBest;
		},

		get modeDescription() {
			if (this.mode === 'timer')   return 'Find every pair before the 60 second clock runs out. Clear a set and a new one appears — keep going to build your score.';
			if (this.mode === 'fastest') return 'Timing starts on your first flip and stops on your last pair. Keep clearing sets to beat your best time.';
			return 'Memorize the cards during the preview, then find every pair from memory. One wrong pair ends the run. 4 levels, 5 stages each — clear the level 4 stage 5 boss stage to win.';
		},

		get currentCardCount() {
			return this.mode === 'streak' ? MATCH_STREAK_LEVELS[this.level - 1].cards[this.stage - 1] : this.cardCount;
		},
		get pairCount() { return this.cards.length / 2; },
		get matchedCount() { return this.cards.filter(c => c.matched).length / 2; },
		get stagesDone() { return this.phase === 'playing' || this.phase === 'preview' ? this.stage - 1 : this.stage; },
		get isFinalStreakStage() {
			return this.mode === 'streak' && this.level === MATCH_STREAK_MAX_LEVEL && this.stage === MATCH_STREAK_STAGES_PER_LEVEL;
		},

		get cardMinPx() {
			const n = this.currentCardCount;
			if (n <= 16) return 92;
			if (n <= 24) return 78;
			if (n <= 32) return 66;
			if (n <= 40) return 56;
			return 48;
		},

		/* ---- setup / lifecycle ---- */
		startGame() {
			_ensureAudio();
			this._clearTimer();
			this.score  = 0;
			this.hint   = '';
			this.selected = [];
			this.lock   = false;
			if (this.mode === 'timer') {
				this._dealRound(this.cardCount);
				this.phase = 'playing';
				this._startCountdown();
			} else if (this.mode === 'fastest') {
				this._dealRound(this.cardCount);
				this.elapsed = 0;
				this.timerRunning = false;
				this.phase = 'playing';
			} else {
				this.level = 1;
				this.stage = 1;
				this._startStreakStage();
			}
		},

		backToSetup() {
			this._clearTimer();
			this._gen++;
			if (!['setup', 'complete', 'streakover'].includes(this.phase) && this.score > 0) {
				if (this.mode === 'timer') { this._commitTimerBest(); this._recordTimerScore(); }
				else if (this.mode === 'streak') { this._commitStreakBest(); this._recordStreakScore(); }
			}
			this.phase = 'setup';
		},

		/* ---- deck building ---- */
		_shuffle(arr) {
			const a = [...arr];
			for (let i = a.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[a[i], a[j]] = [a[j], a[i]];
			}
			return a;
		},

		_dealRound(cardCount) {
			const pairCount = cardCount / 2;
			const fronts = this._shuffle(Array.from({ length: MATCH_FRONT_FILES.length }, (_, i) => i + 1)).slice(0, pairCount);
			const deck   = this._shuffle([...fronts, ...fronts]);
			this.cards   = deck.map((frontId, uid) => ({ uid, frontId, flipped: false, matched: false }));
			this.selected = [];
			this.lock = false;
		},

		frontSrc(frontId) {
			return `assets/images/card_fronts/${MATCH_FRONT_FILES[frontId - 1]}`;
		},

		/* ---- streak stage flow ---- */
		_startStreakStage() {
			const cfg = MATCH_STREAK_LEVELS[this.level - 1];
			this._dealRound(cfg.cards[this.stage - 1]);
			this.cards.forEach(c => c.flipped = true);
			this.previewTime = cfg.preview;
			this.phase = 'preview';
			this._clearTimer();
			this._deadline = Date.now() + cfg.preview * 1000;
			this._interval = setInterval(() => {
				const remain = (this._deadline - Date.now()) / 1000;
				this.previewTime = Math.max(0, remain);
				if (remain <= 0) {
					this._clearTimer();
					this.cards.forEach(c => c.flipped = false);
					this.phase = 'playing';
				}
			}, 100);
		},

		/* ---- input ---- */
		handleCardClick(card) {
			if (this.phase !== 'playing' || this.lock) return;
			if (card.flipped || card.matched) return;

			if (this.mode === 'fastest' && !this.timerRunning) this._startStopwatch();

			card.flipped = true;
			_tone(520, 0.08, this.muted);
			this.selected.push(card);

			if (this.selected.length < 2) return;

			this.lock = true;
			const [a, b] = this.selected;
			if (a.frontId === b.frontId) {
				_guardedDelay(this, 380, () => {
					a.matched = true;
					b.matched = true;
					this.selected = [];
					this.lock = false;
					this.score += MATCH_POINTS_PER_PAIR;
					_tone(700, 0.16, this.muted);
					if (this.matchedCount >= this.pairCount) this._onRoundComplete();
				});
			} else if (this.mode === 'streak') {
				_guardedDelay(this, 750, () => {
					_buzz(this.muted);
					this._commitStreakBest();
					this._recordStreakScore();
					this.phase = 'streakover';
				});
			} else {
				_guardedDelay(this, 750, () => {
					a.flipped = false;
					b.flipped = false;
					this.selected = [];
					this.lock = false;
					_buzz(this.muted);
				});
			}
		},

		/* ---- timers ---- */
		_clearTimer() {
			if (this._interval) { clearInterval(this._interval); this._interval = null; }
		},

		_startCountdown() {
			this._clearTimer();
			this.timeLeft  = MATCH_TIMER_SECONDS;
			this._deadline = Date.now() + MATCH_TIMER_SECONDS * 1000;
			this._interval = setInterval(() => {
				const remain = (this._deadline - Date.now()) / 1000;
				this.timeLeft = Math.max(0, remain);
				if (remain <= 0) { this._clearTimer(); this._onTimeUp(); }
			}, 100);
		},

		_startStopwatch() {
			this._clearTimer();
			this._startTs = Date.now();
			this.timerRunning = true;
			this._interval = setInterval(() => {
				this.elapsed = (Date.now() - this._startTs) / 1000;
			}, 100);
		},

		_onTimeUp() {
			_buzz(this.muted);
			this._commitTimerBest();
			this._recordTimerScore();
			this.phase = 'timeup';
		},

		/* ---- round/level progression ---- */
		_onRoundComplete() {
			if (this.mode === 'timer') {
				this._commitTimerBest();
				this.phase = 'roundclear';
				_guardedDelay(this, 700, () => {
					this._dealRound(this.cardCount);
					this.phase = 'playing';
				});
			} else if (this.mode === 'fastest') {
				this._clearTimer();
				this.timerRunning = false;
				this._commitFastest(this.elapsed);
				this.phase = 'roundclear';
				_guardedDelay(this, 900, () => {
					this._dealRound(this.cardCount);
					this.elapsed = 0;
					this.timerRunning = false;
					this.phase = 'playing';
				});
			} else {
				this._commitStreakBest();
				const level = this.level, stage = this.stage;
				if (stage < MATCH_STREAK_STAGES_PER_LEVEL) {
					this.phase = 'stageclear';
					_guardedDelay(this, 900, () => {
						this.stage = stage + 1;
						this._startStreakStage();
					});
				} else if (level < MATCH_STREAK_MAX_LEVEL) {
					_win(this.muted);
					this.phase = 'levelup';
					_guardedDelay(this, 1700, () => {
						this.level = level + 1;
						this.stage = 1;
						this._startStreakStage();
					});
				} else {
					_win(this.muted);
					this._recordStreakScore();
					this.phase = 'complete';
				}
			}
		},

		/* ---- persistence ---- */
		_commitTimerBest() {
			if (this.score > this.timerBest) this.timerBest = this.score;
		},
		_recordTimerScore() {
			const store = Alpine.store('scores');
			store.matchTimerScores = [...store.matchTimerScores, { score: this.score, cardCount: this.cardCount, date: new Date().toISOString() }]
				.sort((a, b) => b.score - a.score)
				.slice(0, MATCH_MAX_SCORES);
		},

		_commitFastest(time) {
			if (this.fastestBest === 0 || time < this.fastestBest) this.fastestBest = time;
			const store = Alpine.store('scores');
			store.matchFastestScores = [...store.matchFastestScores, { time, cardCount: this.cardCount, date: new Date().toISOString() }]
				.sort((a, b) => a.time - b.time)
				.slice(0, MATCH_MAX_SCORES);
		},

		_commitStreakBest() {
			if (this.score > this.streakBest) this.streakBest = this.score;
		},
		_recordStreakScore() {
			const store = Alpine.store('scores');
			store.matchStreakScores = [...store.matchStreakScores, { score: this.score, level: this.level, date: new Date().toISOString() }]
				.sort((a, b) => b.score - a.score)
				.slice(0, MATCH_MAX_SCORES);
		},
	};
}

/* ── Tray ─────────────────────────────────────────────────────── */
const TRAY_OBJECT_IDS = [
	'alarmclock', 'anchor', 'balloon', 'bell', 'book', 'button', 'camera', 'candle', 'cap', 'clock',
	'coin', 'comb', 'dice', 'envelope', 'feather', 'flower', 'fork', 'glasses', 'hammer', 'handbag',
	'jar', 'key', 'knife', 'knight', 'lamp', 'lightbulb', 'mirror', 'mug', 'needle', 'padlock',
	'paperclip', 'pencil', 'racket', 'ring', 'sailboat', 'scissors', 'screwdriver', 'shirt', 'shoe', 'sockpair',
	'spool', 'teapot', 'teddy', 'toycar', 'trophy', 'umbrella', 'watch', 'wrench',
];
const TRAY_LEVEL_COUNTS            = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
const TRAY_STREAK_STAGES_PER_LEVEL = 5;
const TRAY_STREAK_MAX_LEVEL        = TRAY_LEVEL_COUNTS.length;
const TRAY_STUDY_SECONDS           = 60;
const TRAY_ANSWER_SECONDS          = 180;
const TRAY_FASTEST_MAX_ATTEMPTS    = 3;
const TRAY_POINTS_PER_CORRECT      = 2;
const TRAY_PENALTY_PER_WRONG       = 1;
const TRAY_MAX_SCORES              = 3;

function trayGame() {
	return {
		mode: 'classic', // classic | fastest | streak
		objectCount: 6,   // classic/fastest setup pick, 6..24 even
		objectCountOptions: TRAY_LEVEL_COUNTS,
		STREAK_STAGES_PER_LEVEL: TRAY_STREAK_STAGES_PER_LEVEL,
		STREAK_MAX_LEVEL: TRAY_STREAK_MAX_LEVEL,
		MAX_ATTEMPTS: TRAY_FASTEST_MAX_ATTEMPTS,

		phase: 'setup',
		// setup | coverout | study | coverin | picking
		// | roundclear | timeup                          (classic)
		// | success | failed                              (fastest)
		// | stageclear | levelup | complete | streakover  (streak)

		level: 1,
		stage: 1,
		score: 0,

		covered: true,
		trayObjects: [], // [{ id, x, y, rot }]
		correctIds: new Set(),
		decoyIds: new Set(),
		pickerTiles: [],  // [{ id, isCorrect, state }] state: idle | correct | wrong | selected

		studyTime: TRAY_STUDY_SECONDS,
		answerTime: TRAY_ANSWER_SECONDS,
		elapsed: 0,
		attemptsUsed: 0,
		feedback: '',
		muted: false,

		_interval: null,
		_deadline: 0,
		_startTs: 0,
		_gen: 0,

		init() {
			this.$watch('page', (value) => { if (value !== 'tray') this.backToSetup(); });
		},

		get currentObjectCount() {
			return this.mode === 'streak' ? TRAY_LEVEL_COUNTS[this.level - 1] : this.objectCount;
		},

		get trayIconPx() {
			const n = this.currentObjectCount;
			if (n <= 8)  return 64;
			if (n <= 12) return 56;
			if (n <= 16) return 48;
			if (n <= 20) return 42;
			return 36;
		},

		get trayTileMinPx() {
			const n = this.pickerTiles.length;
			if (n <= 12) return 80;
			if (n <= 20) return 68;
			if (n <= 28) return 58;
			return 50;
		},

		get classicBest() {
			return Alpine.store('scores').trayClassicBest[String(this.objectCount)] || 0;
		},
		get fastestBest() {
			return Alpine.store('scores').trayFastestBest[String(this.objectCount)];
		},
		get fastestBestLabel() {
			const t = this.fastestBest;
			return t > 0 ? t.toFixed(1) + 's' : '—';
		},
		get streakBest() {
			return Alpine.store('scores').trayStreakBest;
		},
		get statsBest() {
			return this.mode === 'classic' ? this.classicBest : this.mode === 'fastest' ? this.fastestBestLabel : this.streakBest;
		},

		get elapsedLabel() {
			return this.elapsed.toFixed(1) + 's';
		},
		get studyTimeLabel() {
			const s = Math.max(0, Math.ceil(this.studyTime));
			return `0:${String(s).padStart(2, '0')}`;
		},
		get answerTimeLabel() {
			const s = Math.max(0, Math.ceil(this.answerTime));
			const m = Math.floor(s / 60);
			return `${m}:${String(s % 60).padStart(2, '0')}`;
		},

		get correctFoundCount() {
			return this.pickerTiles.filter(t => t.isCorrect && t.state === 'correct').length;
		},
		get stagesDone() {
			// 'streakover' means the current stage attempt failed, not cleared — don't count it as done
			const notYetCleared = ['coverout', 'study', 'coverin', 'picking', 'streakover'].includes(this.phase);
			return notYetCleared ? this.stage - 1 : this.stage;
		},

		get modeDescription() {
			if (this.mode === 'classic') return 'Memorize the objects on the tray in 60 seconds, then pick them out from the silhouettes. 2 points per correct pick, -1 for a wrong one. You have 3 minutes to answer.';
			if (this.mode === 'fastest') return 'Memorize the objects, then select every one you remember and submit. Only a fully correct answer stops the clock — you get up to 3 attempts.';
			return 'Memorize a growing tray of objects each stage. One wrong pick ends the run. 10 levels, 5 stages each, 6 up to 24 objects — clear level 10 stage 5 to win.';
		},

		/* ---- asset helpers ---- */
		colorSrc(id)      { return `assets/images/tray_objects/color/${id}.svg`; },
		silhouetteSrc(id) { return `assets/images/tray_objects/silhouette/${id}.svg`; },

		_shuffle(arr) {
			const a = [...arr];
			for (let i = a.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[a[i], a[j]] = [a[j], a[i]];
			}
			return a;
		},

		/* ---- scatter / picker ---- */
		_scatterObjects() {
			const n = this.currentObjectCount;
			const iconPx = this.trayIconPx;
			const R = 168;
			const PAD = 8;
			const Ru = R - iconPx / 2 - PAD;
			const minSep = iconPx * 0.92;
			const MAX_TRIES = 60;

			const ids = this._shuffle(TRAY_OBJECT_IDS).slice(0, n);
			const placed = [];

			for (const id of ids) {
				let best = null, bestScore = -1;
				for (let t = 0; t < MAX_TRIES; t++) {
					const angle = Math.random() * Math.PI * 2;
					const dist  = Math.sqrt(Math.random()) * Ru;
					const cx = R + dist * Math.cos(angle);
					const cy = R + dist * Math.sin(angle);
					const minDistToPlaced = placed.length
						? Math.min(...placed.map(p => Math.hypot(p.cx - cx, p.cy - cy)))
						: Infinity;
					if (minDistToPlaced >= minSep) { best = { cx, cy }; break; }
					if (minDistToPlaced > bestScore) { bestScore = minDistToPlaced; best = { cx, cy }; }
				}
				placed.push(best);
			}

			this.correctIds = new Set(ids);
			this.trayObjects = ids.map((id, i) => ({
				id,
				x: placed[i].cx - iconPx / 2,
				y: placed[i].cy - iconPx / 2,
				rot: Math.random() * 16 - 8,
			}));
		},

		_buildPicker() {
			const decoyCount = Math.round(this.currentObjectCount / 2);
			const remaining  = TRAY_OBJECT_IDS.filter(id => !this.correctIds.has(id));
			const decoys     = this._shuffle(remaining).slice(0, decoyCount);
			this.decoyIds    = new Set(decoys);
			const tiles = [...this.correctIds, ...decoys].map(id => ({
				id, isCorrect: this.correctIds.has(id), state: 'idle',
			}));
			this.pickerTiles = this._shuffle(tiles);
		},

		/* ---- lifecycle ---- */
		startGame() {
			_ensureAudio();
			this._clearTimer();
			this.score = 0;
			this.feedback = '';
			this.attemptsUsed = 0;
			this.elapsed = 0;
			if (this.mode === 'streak') {
				this.level = 1;
				this.stage = 1;
			}
			this._beginRound();
		},

		backToSetup() {
			this._clearTimer();
			this._gen++;
			if (this.mode === 'streak' && !['setup', 'complete', 'streakover'].includes(this.phase) && this.score > 0) {
				this._commitStreakBest();
				this._recordStreakScore();
			}
			this.covered = true;
			this.phase = 'setup';
		},

		_beginRound() {
			this._scatterObjects();
			this.pickerTiles = [];
			this.covered = true; // mount in the resting (covered) state first
			this.phase = 'coverout';
			this.$nextTick(() => {
				requestAnimationFrame(() => { this.covered = false; }); // then flip after a real paint, so the transition actually plays
			});
		},

		onCoverTransitionEnd(e) {
			if (e.propertyName !== 'transform') return;
			if (this.phase === 'coverout' && !this.covered) {
				this.phase = 'study';
				this._startStudyCountdown();
			} else if (this.phase === 'coverin' && this.covered) {
				this._buildPicker();
				this.phase = 'picking';
				if (this.mode === 'fastest') this._startStopwatch();
				if (this.mode === 'classic') this._startAnswerCountdown();
			}
		},

		/* ---- timers ---- */
		_clearTimer() {
			if (this._interval) { clearInterval(this._interval); this._interval = null; }
		},

		_startStudyCountdown() {
			this._clearTimer();
			this.studyTime = TRAY_STUDY_SECONDS;
			this._deadline = Date.now() + TRAY_STUDY_SECONDS * 1000;
			this._interval = setInterval(() => {
				const remain = (this._deadline - Date.now()) / 1000;
				this.studyTime = Math.max(0, remain);
				if (remain <= 0) { this._clearTimer(); this._endStudyPhase(); }
			}, 100);
		},

		_endStudyPhase() {
			this.covered = true;
			this.phase = 'coverin';
		},

		skipStudy() {
			if (this.phase !== 'study') return;
			this._clearTimer();
			this._endStudyPhase();
		},

		_startAnswerCountdown() {
			this._clearTimer();
			this.answerTime = TRAY_ANSWER_SECONDS;
			this._deadline  = Date.now() + TRAY_ANSWER_SECONDS * 1000;
			this._interval = setInterval(() => {
				const remain = (this._deadline - Date.now()) / 1000;
				this.answerTime = Math.max(0, remain);
				if (remain <= 0) { this._clearTimer(); this._endRound('timeup'); }
			}, 100);
		},

		_startStopwatch() {
			this._clearTimer();
			this._startTs = Date.now();
			this._interval = setInterval(() => {
				this.elapsed = (Date.now() - this._startTs) / 1000;
			}, 100);
		},

		/* ---- classic ---- */
		handleTileClick(tile) {
			if (this.mode !== 'classic' || this.phase !== 'picking' || tile.state !== 'idle') return;
			if (tile.isCorrect) {
				tile.state = 'correct';
				this.score += TRAY_POINTS_PER_CORRECT;
				_tone(700, 0.16, this.muted);
			} else {
				tile.state = 'wrong';
				this.score = Math.max(0, this.score - TRAY_PENALTY_PER_WRONG);
				_buzz(this.muted);
			}
			const allFound = this.pickerTiles.filter(t => t.isCorrect).every(t => t.state === 'correct');
			if (allFound) this._endRound('roundclear');
		},

		_endRound(reason) {
			this._clearTimer();
			this._commitClassicBest();
			this._recordClassicScore();
			this.phase = reason;
		},

		/* ---- fastest ---- */
		toggleTile(tile) {
			if (this.mode !== 'fastest' || this.phase !== 'picking') return;
			tile.state = tile.state === 'selected' ? 'idle' : 'selected';
		},

		submit() {
			if (this.mode !== 'fastest' || this.phase !== 'picking') return;
			this.attemptsUsed++;
			const selected = this.pickerTiles.filter(t => t.state === 'selected');
			const selectedIds = new Set(selected.map(t => t.id));
			const exact = selectedIds.size === this.correctIds.size
				&& [...this.correctIds].every(id => selectedIds.has(id));

			if (exact) {
				this._clearTimer();
				_win(this.muted);
				this._commitFastestBest(this.elapsed);
				this._recordFastestScore(this.elapsed);
				this.phase = 'success';
				return;
			}

			const correctSelected = selected.filter(t => t.isCorrect).length;
			this.feedback = `${correctSelected} of ${this.correctIds.size} correct — try again`;
			_buzz(this.muted);
			this.pickerTiles.forEach(t => { t.state = 'idle'; });

			if (this.attemptsUsed >= TRAY_FASTEST_MAX_ATTEMPTS) {
				this._clearTimer();
				this.phase = 'failed';
			}
		},

		/* ---- streak ---- */
		handleStreakTileClick(tile) {
			if (this.mode !== 'streak' || this.phase !== 'picking' || tile.state !== 'idle') return;
			if (tile.isCorrect) {
				tile.state = 'correct';
				this.score += TRAY_POINTS_PER_CORRECT;
				_tone(700, 0.16, this.muted);
				const stageDone = this.pickerTiles.filter(t => t.isCorrect).every(t => t.state === 'correct');
				if (stageDone) this._onStreakStageComplete();
			} else {
				tile.state = 'wrong';
				_buzz(this.muted);
				this._commitStreakBest();
				this._recordStreakScore();
				this.phase = 'streakover';
			}
		},

		_onStreakStageComplete() {
			this._commitStreakBest();
			const level = this.level, stage = this.stage;
			if (stage < TRAY_STREAK_STAGES_PER_LEVEL) {
				this.phase = 'stageclear';
				_guardedDelay(this, 900, () => {
					this.stage = stage + 1;
					this._beginRound();
				});
			} else if (level < TRAY_STREAK_MAX_LEVEL) {
				_win(this.muted);
				this.phase = 'levelup';
				_guardedDelay(this, 1700, () => {
					this.level = level + 1;
					this.stage = 1;
					this._beginRound();
				});
			} else {
				_win(this.muted);
				this._recordStreakScore();
				this.phase = 'complete';
			}
		},

		/* ---- persistence ---- */
		_commitClassicBest() {
			const store = Alpine.store('scores');
			const key = String(this.objectCount);
			const cur = store.trayClassicBest[key] || 0;
			if (this.score > cur) store.trayClassicBest = { ...store.trayClassicBest, [key]: this.score };
		},
		_recordClassicScore() {
			const store = Alpine.store('scores');
			store.trayClassicScores = [...store.trayClassicScores, { score: this.score, objectCount: this.objectCount, date: new Date().toISOString() }]
				.sort((a, b) => b.score - a.score)
				.slice(0, TRAY_MAX_SCORES);
		},

		_commitFastestBest(time) {
			const store = Alpine.store('scores');
			const key = String(this.objectCount);
			const cur = store.trayFastestBest[key];
			if (!cur || time < cur) store.trayFastestBest = { ...store.trayFastestBest, [key]: time };
		},
		_recordFastestScore(time) {
			const store = Alpine.store('scores');
			store.trayFastestScores = [...store.trayFastestScores, { time, objectCount: this.objectCount, date: new Date().toISOString() }]
				.sort((a, b) => a.time - b.time)
				.slice(0, TRAY_MAX_SCORES);
		},

		_commitStreakBest() {
			if (this.score > this.streakBest) Alpine.store('scores').trayStreakBest = this.score;
		},
		_recordStreakScore() {
			const store = Alpine.store('scores');
			store.trayStreakScores = [...store.trayStreakScores, { score: this.score, level: this.level, date: new Date().toISOString() }]
				.sort((a, b) => b.score - a.score)
				.slice(0, TRAY_MAX_SCORES);
		},
	};
}

/* ── App shell ───────────────────────────────────────────────── */
function app() {
	return {
		page: 'dashboard', // dashboard | scores | sequence | match | difference | tray
	};
}

/* ── Dashboard ───────────────────────────────────────────────── */
function dashboard() {
	return {
		get sequenceBest() {
			return Alpine.store('scores').sequenceBest;
		},
		get differenceLevelsBest() {
			return Alpine.store('scores').differenceLevelsBest;
		},
		get differenceTimerBest() {
			return Alpine.store('scores').differenceTimerBest;
		},
		get differenceFastestBest() {
			return Alpine.store('scores').differenceFastestBest;
		},
		get differenceFastestBestLabel() {
			const t = this.differenceFastestBest;
			return t > 0 ? t.toFixed(1) + 's' : '';
		},
		get matchTimerBest() {
			return Alpine.store('scores').matchTimerBest;
		},
		get matchFastestBest() {
			return Alpine.store('scores').matchFastestBest;
		},
		get matchFastestBestLabel() {
			const t = this.matchFastestBest;
			return t > 0 ? t.toFixed(1) + 's' : '';
		},
		get matchStreakBest() {
			return Alpine.store('scores').matchStreakBest;
		},
		get trayClassicBest() {
			const vals = Object.values(Alpine.store('scores').trayClassicBest);
			return vals.length ? Math.max(...vals) : 0;
		},
		get trayFastestBest() {
			const vals = Object.values(Alpine.store('scores').trayFastestBest);
			return vals.length ? Math.min(...vals) : 0;
		},
		get trayFastestBestLabel() {
			const t = this.trayFastestBest;
			return t > 0 ? t.toFixed(1) + 's' : '';
		},
		get trayStreakBest() {
			return Alpine.store('scores').trayStreakBest;
		},
	};
}

/* ── Scores page ─────────────────────────────────────────────── */
function scoresPage() {
	return {
		get sequenceScores() {
			return Alpine.store('scores').sequenceScores;
		},
		get differenceLevelsScores() {
			return Alpine.store('scores').differenceLevelsScores;
		},
		get differenceTimerScores() {
			return Alpine.store('scores').differenceTimerScores;
		},
		get differenceFastestScores() {
			return Alpine.store('scores').differenceFastestScores;
		},
		get matchTimerScores() {
			return Alpine.store('scores').matchTimerScores;
		},
		get matchFastestScores() {
			return Alpine.store('scores').matchFastestScores;
		},
		get matchStreakScores() {
			return Alpine.store('scores').matchStreakScores;
		},
		get trayClassicBestEntries() {
			return Object.entries(Alpine.store('scores').trayClassicBest)
				.map(([count, score]) => ({ count: Number(count), score }))
				.sort((a, b) => a.count - b.count);
		},
		get trayFastestBestEntries() {
			return Object.entries(Alpine.store('scores').trayFastestBest)
				.map(([count, time]) => ({ count: Number(count), time }))
				.sort((a, b) => a.count - b.count);
		},
		get trayClassicScores() {
			return Alpine.store('scores').trayClassicScores;
		},
		get trayFastestScores() {
			return Alpine.store('scores').trayFastestScores;
		},
		get trayStreakScores() {
			return Alpine.store('scores').trayStreakScores;
		},

		formatDate(iso) {
			return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
		},
	};
}
