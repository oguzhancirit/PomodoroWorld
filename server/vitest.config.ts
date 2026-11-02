import { defineConfig } from 'vitest/config';
import os from 'node:os';
import path from 'node:path';
export default defineConfig({ test: { env: { PW_DATA: path.join(os.tmpdir(), `pw-test-${Date.now()}.json`) } } });
