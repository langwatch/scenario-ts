import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { log } from '../utils/logger';

export class CacheManager {
  private cacheDir: string;

  constructor(cacheKey?: string) {
    this.cacheDir = path.join(os.homedir(), '.scenario-ts-cache');
    if (cacheKey) {
      this.cacheDir = path.join(this.cacheDir, cacheKey);
    }
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    log(`Cache directory: ${this.cacheDir}`);
  }

  async get(key: string): Promise<any> {
    const filePath = path.join(this.cacheDir, `${key}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      log(`Cache hit for key: ${key}`);
      return JSON.parse(data);
    }
    log(`Cache miss for key: ${key}`);
    return null;
  }

  async set(key: string, value: any): Promise<void> {
    const filePath = path.join(this.cacheDir, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
    log(`Cache set for key: ${key}`);
  }
} 