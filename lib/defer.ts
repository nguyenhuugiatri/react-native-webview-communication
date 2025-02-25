type Resolver<T> = (value: T | PromiseLike<T>) => void;
type Rejector = (error?: unknown) => void;

export class Deferred<T = any> {
  readonly promise: Promise<T>;
  private _state: 'unresolved' | 'resolved' | 'rejected' = 'unresolved';
  private _resolve!: Resolver<T>;
  private _reject!: Rejector;
  private timeoutId?: NodeJS.Timeout;

  constructor(timeoutMs?: number) {
    this.promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    if (timeoutMs) {
      this.timeoutId = setTimeout(() => {
        if (this._state === 'unresolved') {
          this.reject(
            new Error(`Deferred promise timed out after ${timeoutMs}ms`)
          );
        }
      }, timeoutMs);
    }
  }

  get state(): 'unresolved' | 'resolved' | 'rejected' {
    return this._state;
  }

  resolve(value: T | PromiseLike<T>): void {
    if (this._state !== 'unresolved') return;
    this._state = 'resolved';
    this._resolve(value);
    this.clearTimeout();
  }

  reject(error?: unknown): void {
    if (this._state !== 'unresolved') return;
    this._state = 'rejected';
    this._reject(error);
    this.clearTimeout();
  }

  resetTimeout(timeoutMs: number): void {
    this.clearTimeout();
    this.timeoutId = setTimeout(() => {
      if (this._state === 'unresolved') {
        this.reject(
          new Error(`Deferred promise timed out after ${timeoutMs}ms`)
        );
      }
    }, timeoutMs);
  }

  clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  dispose(): void {
    if (this._state === 'unresolved') {
      this.reject(new Error('Deferred disposed'));
    }
    this.clearTimeout();
  }
}
