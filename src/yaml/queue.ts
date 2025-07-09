export class Mutex {
  private promise : Promise<any> = Promise.resolve()
  
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.promise.then(fn)
    this.promise = result.catch(() => {}) // Don't break chain on errors
    return result
  }
}

// Single instance for file operations
export const fileMutex = new Mutex()