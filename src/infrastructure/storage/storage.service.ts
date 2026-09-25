import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { Injectable } from '@nestjs/common';

/**
 * Local-disk object storage for uploaded files (STL print quotes). Files live under
 * `STORAGE_DIR` (default `./storage`, gitignored); on Railway that path is a mounted volume.
 * Keys are slash-separated, e.g. `print-quotes/<quoteId>/0-model.stl`.
 */
@Injectable()
export class StorageService {
  private readonly root = resolve(process.env.STORAGE_DIR || 'storage');

  async save(key: string, data: Buffer): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.pathFor(key));
  }

  // Keys come from the DB, but never let one escape the storage root.
  private pathFor(key: string): string {
    const path = resolve(this.root, key);
    if (!path.startsWith(this.root + sep)) throw new Error(`invalid storage key: ${key}`);
    return path;
  }
}
