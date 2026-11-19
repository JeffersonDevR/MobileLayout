#!/usr/bin/env node
import readline from 'readline';
import { MCP_TOOLS_DEFINITIONS } from './tools';

const SERVER_URL = process.env.MOBILE_LAYOUT_URL || 'http://localhost:3300';

function sendJsonRpc(obj: any) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function forwardToMobileLayoutServer(msg: any): Promise<any> {
  try {
    const res = await fetch(`${SERVER_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });
    if (!res.ok) {
      throw new Error(`MobileLayout server responded with HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    process.stderr.write(`[MCP Warning] Forward to ${SERVER_URL} failed: ${err.message}\n`);
    throw err;
  }
}

async function handleMessage(msg: any) {
  if (!msg || typeof msg !== 'object') return;
  const { id, method, params } = msg;

  if (method === 'initialize') {
    sendJsonRpc({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'mobile-layout-mcp',
          version: '1.0.0'
        }
      }
    });
    return;
  }

  if (method === 'notifications/initialized') {
    process.stderr.write('[MCP] Client initialized successfully.\n');
    return;
  }

  if (method === 'ping') {
    sendJsonRpc({ jsonrpc: '2.0', id, result: {} });
    return;
  }

  if (method === 'tools/list') {
    sendJsonRpc({
      jsonrpc: '2.0',
      id,
      result: {
        tools: MCP_TOOLS_DEFINITIONS
      }
    });
    return;
  }

  if (method === 'tools/call') {
    try {
      // Forward directly to running MobileLayout server
      const serverResponse = await forwardToMobileLayoutServer(msg);
      sendJsonRpc(serverResponse);
    } catch (err: any) {
      // Return gracefully with error content if server is not reachable
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: `MobileLayout Server is not reachable at ${SERVER_URL}. Please ensure "npm run dev:server" is running.\nError details: ${err.message}`
            }
          ],
          isError: true
        }
      });
    }
    return;
  }

  // Fallback for unsupported methods
  sendJsonRpc({
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method not supported: ${method}`
    }
  });
}

let activeRequests = 0;
let isClosed = false;

function checkExit() {
  if (isClosed && activeRequests === 0) {
    process.stderr.write('[MCP] Stdio stream closed and all requests handled. Exiting.\n');
    process.exit(0);
  }
}

function start() {
  process.stderr.write('[MCP] MobileLayout MCP Server starting over stdio...\n');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed);
      activeRequests++;
      handleMessage(msg)
        .catch((err) => {
          process.stderr.write(`[MCP Error] Processing failed: ${err.message}\n`);
        })
        .finally(() => {
          activeRequests--;
          checkExit();
        });
    } catch (e: any) {
      process.stderr.write(`[MCP Parse Error] Invalid JSON: ${e.message}\n`);
    }
  });

  rl.on('close', () => {
    isClosed = true;
    checkExit();
  });
}

start();
