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
					const seq = this.sequence;
					setTimeout(() => this._nextRound(seq), 1700);
				} else {
					this.phase = 'watch';
					this.hint  = 'Nice! Next sequence…';
					const seq = this.sequence;
					setTimeout(() => this._nextRound(seq), 700);
				}
			}
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
					setTimeout(() => {
						this.stage = nextStage;
						this._loadRound(this._pickScene(this._lastSceneId), DIFF_LEVEL_COUNTS[lvl - 1]);
						this.phase = 'playing';
					}, 900);
				} else if (this.level < DIFF_MAX_LEVEL) {
					_win(this.muted);
					this.phase = 'levelup';
					const nextLevel = this.level + 1;
					setTimeout(() => {
						this.level = nextLevel;
						this.stage = 1;
						this._loadRound(this._pickScene(this._lastSceneId), DIFF_LEVEL_COUNTS[nextLevel - 1]);
						this.phase = 'playing';
					}, 1700);
				} else {
					_win(this.muted);
					this._recordScore();
					this.phase = 'complete';
				}
			} else if (this.mode === 'timer') {
				this._commitBest();
				this.phase = 'roundclear';
				setTimeout(() => {
					this._loadRound(this._pickScene(this._lastSceneId), this.diffCount);
					this._startCountdown();
					this.phase = 'playing';
				}, 700);
			} else {
				this._clearTimer();
				this.timerRunning = false;
				this._commitFastest(this.elapsed);
				this.phase = 'roundclear';
				setTimeout(() => {
					this._loadRound(this._pickScene(this._lastSceneId), this.diffCount);
					this.elapsed = 0;
					this.phase = 'playing';
				}, 900);
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

		formatDate(iso) {
			return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
		},
	};
}
