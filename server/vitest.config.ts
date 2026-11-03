import { defineConfig } from 'vitest/config';
import os from 'node:os';
import path from 'node:path';
// test files boot a real game server each: run them one after another (one port, one data file)
export default defineConfig({ test: { fileParallelism: false, env: { PW_DATA: path.join(os.tmpdir(), `pw-test-${Date.now()}.json`) } } });
