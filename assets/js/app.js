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

/* ── Shared score store ──────────────────────────────────────── */
document.addEventListener('alpine:init', () => {
	Alpine.store('scores', {
		sequenceBest:   Alpine.$persist(0).as(HS_KEY),
		sequenceScores: Alpine.$persist([]).as(SEQ_SCORES_KEY),
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
	};
}

/* ── Scores page ─────────────────────────────────────────────── */
function scoresPage() {
	return {
		get sequenceScores() {
			return Alpine.store('scores').sequenceScores;
		},

		formatDate(iso) {
			return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
		},
	};
}
