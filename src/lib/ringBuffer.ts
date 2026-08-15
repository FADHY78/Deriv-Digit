/**
 * RingBuffer: Fixed-capacity circular buffer supporting O(1) insertion with oldest element eviction.
 */
export class RingBuffer<T> {
  private buffer: Array<T | undefined>;
  private capacity: number;
  private head: number = 0; // points to next write position
  private count: number = 0;

  constructor(capacity: number = 500) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  public push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  public size(): number {
    return this.count;
  }

  public getCapacity(): number {
    return this.capacity;
  }

  public clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.count = 0;
  }

  /**
   * Returns items ordered from oldest to newest.
   * If windowSize is specified, returns at most the last windowSize items.
   */
  public toArray(windowSize?: number): T[] {
    if (this.count === 0) return [];
    
    const targetSize = windowSize ? Math.min(windowSize, this.count) : this.count;
    const result: T[] = new Array(targetSize);

    // Calculate starting read index for targetSize elements
    const startIndex = (this.head - targetSize + this.capacity) % this.capacity;

    for (let i = 0; i < targetSize; i++) {
      const idx = (startIndex + i) % this.capacity;
      result[i] = this.buffer[idx] as T;
    }

    return result;
  }

  /**
   * Returns the latest inserted item, or null if empty.
   */
  public peekLatest(): T | null {
    if (this.count === 0) return null;
    const idx = (this.head - 1 + this.capacity) % this.capacity;
    return (this.buffer[idx] as T) ?? null;
  }
}
