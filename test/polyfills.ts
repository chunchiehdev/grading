/**
 * Polyfills for File API functionality in jsdom test environment
 */

// Polyfill File.prototype.arrayBuffer if it doesn't exist
if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = function() {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      reader.readAsArrayBuffer(this);
    });
  };
}

// Polyfill Blob.prototype.arrayBuffer if it doesn't exist  
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function() {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      reader.readAsArrayBuffer(this);
    });
  };
}

// Create a custom File constructor that allows size override
class TestFile extends File {
  private _size: number;

  constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag & { size?: number }) {
    super(fileBits, fileName, options);
    this._size = options?.size ?? super.size;
  }

  get size(): number {
    return this._size;
  }
}

// Make TestFile available globally for tests
(globalThis as any).TestFile = TestFile;

export {}; // Make this a module