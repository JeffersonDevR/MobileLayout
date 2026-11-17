import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { DevProxyManager } from './proxy';
import { createApiRouter, AppState } from './routes';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3300', 10);
const PROXY_PORT = parseInt(process.env.PROXY_PORT || '3301', 10);

const state: AppState = {
  targetUrl: process.env.TARGET_URL || 'http://localhost:8100',
  projectPath: process.env.PROJECT_PATH || '',
  llmProvider: (process.env.LLM_PROVIDER as any) || 'gemini',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  openCodeBaseUrl: process.env.OPENCODE_BASE_URL || 'http://localhost:4096',
  openCodeApiKey: process.env.OPENCODE_API_KEY || '',
  openCodeModel: process.env.OPENCODE_MODEL || ''
};

async function bootstrap() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Initialize Target Proxy
  const proxyManager = new DevProxyManager(PROXY_PORT, `http://localhost:${PORT}/_mobile_layout/bridge.js`);
  try {
    await proxyManager.start(state.targetUrl);
  } catch (err: any) {
    console.warn(`[Proxy Notice] Dev proxy will start once target is available: ${err.message}`);
  }

  // Serve bridge script
  app.get('/_mobile_layout/bridge.js', (req, res) => {
    const bridgeDistPath = path.resolve(__dirname, '../../bridge/dist/mobile-layout-bridge.js');
    if (fs.existsSync(bridgeDistPath)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.sendFile(bridgeDistPath);
    } else {
      // Fallback: compile on the fly using esbuild if available
      try {
        const esbuild = require('esbuild');
        const bridgeSrcPath = path.resolve(__dirname, '../../bridge/src/index.ts');
        if (fs.existsSync(bridgeSrcPath)) {
          const result = esbuild.buildSync({
            entryPoints: [bridgeSrcPath],
            bundle: true,
            write: false,
            format: 'iife'
          });
          res.setHeader('Content-Type', 'application/javascript');
          return res.send(result.outputFiles[0].text);
        }
      } catch (e) {
        // ignore
      }
      res.status(404).send('console.error("MobileLayout Bridge script not compiled yet.");');
    }
  });

  // API router
  app.use('/api', createApiRouter(proxyManager, state));

  // Serve Studio UI static build if exists
  const studioDistPath = path.resolve(__dirname, '../../studio/dist');
  if (fs.existsSync(studioDistPath)) {
    app.use(express.static(studioDistPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(studioDistPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`  🚀 MobileLayout Studio Backend Ready!`);
    console.log(`  - Studio API:     http://localhost:${PORT}`);
    console.log(`  - Target Proxy:   http://localhost:${PROXY_PORT} -> ${state.targetUrl}`);
    console.log(`  - Bridge Script:  http://localhost:${PORT}/_mobile_layout/bridge.js`);
    console.log(`=================================================\n`);
  });
}

bootstrap().catch(console.error);
