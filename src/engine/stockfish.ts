// Stockfish kjører i en Web Worker i nettleseren. Én motor deles av hele appen.
export interface EngineLine { move: string; pv: string[]; cp: number | null; mate: number | null }
export interface GoOptions { depth?: number; movetime?: number; multipv?: number; skill?: number; searchmoves?: string[] }

class StockfishEngine {
  private worker: Worker | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private handler: ((line: string) => void) | null = null;
  private rejectCurrent: ((e: Error) => void) | null = null;
  failed = false;
  private readyPromise: Promise<void> | null = null;

  private send(cmd: string) { this.worker!.postMessage(cmd); }

  private wait(cmd: string, done: (l: string) => boolean, timeoutMs = 30000): Promise<string[]> {
    return new Promise((res, rej) => {
      if (this.failed) { rej(new Error('Sjakkmotoren kunne ikke starte')); return; }
      const lines: string[] = [];
      const t = setTimeout(() => { this.handler = null; this.rejectCurrent = null; rej(new Error('Sjakkmotoren svarte ikke')); }, timeoutMs);
      this.rejectCurrent = (e) => { clearTimeout(t); this.handler = null; rej(e); };
      this.handler = (l) => { lines.push(l); if (done(l)) { clearTimeout(t); this.handler = null; this.rejectCurrent = null; res(lines); } };
      this.send(cmd);
    });
  }

  ready(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = (async () => {
        this.worker = new Worker('/stockfish/stockfish-19-lite-single.js');
        this.worker.onmessage = (e) => { const l = typeof e.data === 'string' ? e.data : String(e.data); this.handler?.(l); };
        this.worker.onerror = () => { this.failed = true; this.rejectCurrent?.(new Error('Sjakkmotoren kunne ikke starte')); };
        await this.wait('uci', (l) => l === 'uciok');
        this.send('setoption name Hash value 16');
        await this.wait('isready', (l) => l === 'readyok');
      })();
    }
    return this.readyPromise;
  }

  go(fen: string, opts: GoOptions = {}): Promise<EngineLine[]> {
    const run = async () => {
      await this.ready();
      this.send(`setoption name Skill Level value ${opts.skill ?? 20}`);
      this.send(`setoption name MultiPV value ${opts.multipv ?? 1}`);
      this.send('position fen ' + fen);
      const goCmd = (opts.movetime ? `go movetime ${opts.movetime}` : `go depth ${opts.depth ?? 10}`) + (opts.searchmoves?.length ? ' searchmoves ' + opts.searchmoves.join(' ') : '');
      const lines = await this.wait(goCmd, (l) => l.startsWith('bestmove'));
      const best: Record<number, EngineLine> = {};
      for (const l of lines) {
        if (!l.startsWith('info') || !l.includes(' pv ') || l.includes('bound')) continue;
        const mpv = +(l.match(/ multipv (\d+)/)?.[1] ?? 1);
        const cp = l.match(/ score cp (-?\d+)/); const mate = l.match(/ score mate (-?\d+)/);
        const pv = l.split(' pv ')[1].trim().split(' ');
        best[mpv] = { move: pv[0], pv, cp: cp ? +cp[1] : null, mate: mate ? +mate[1] : null };
      }
      const bm = lines[lines.length - 1].split(' ')[1];
      const out = Object.keys(best).map(Number).sort((a, b) => a - b).map((k) => best[k]);
      // Med lav Skill Level kan bestmove avvike fra linje 1 – bestmove er det motoren faktisk spiller.
      if (bm && bm !== '(none)' && (!out.length || out[0].move !== bm)) out.unshift({ move: bm, pv: [bm], cp: out[0]?.cp ?? null, mate: out[0]?.mate ?? null });
      return out;
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => undefined);
    return p;
  }
}

export const engine = new StockfishEngine();
// Egen motor for analyse (stillingsmåler, sjekk av oppgavetrekk), så boten ikke må vente.
export const analyser = new StockfishEngine();

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('tidsavbrudd')), ms))]);
}

// Score sett fra den som er i trekket, som ett tall i centibonder (matt = ±10000)
export function scoreOf(l: EngineLine | undefined): number {
  if (!l) return 0;
  if (l.mate !== null) return l.mate > 0 ? 10000 - l.mate * 10 : -10000 - l.mate * 10;
  return l.cp ?? 0;
}
