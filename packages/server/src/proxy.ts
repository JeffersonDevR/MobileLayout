import express, { Express } from 'express';
import http from 'http';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';

export class DevProxyManager {
  private proxyServer: http.Server | null = null;
  private currentTarget: string = 'http://localhost:8100';
  private proxyPort: number = 3301;
  private bridgeScriptUrl: string = 'http://localhost:3300/_mobile_layout/bridge.js';

  constructor(proxyPort: number = 3301, bridgeScriptUrl: string = 'http://localhost:3300/_mobile_layout/bridge.js') {
    this.proxyPort = proxyPort;
    this.bridgeScriptUrl = bridgeScriptUrl;
  }

  public start(targetUrl: string = 'http://localhost:8100'): Promise<number> {
    this.currentTarget = targetUrl;

    if (this.proxyServer) {
      this.stop();
    }

    const app: Express = express();

    const proxyMiddleware = createProxyMiddleware({
      target: this.currentTarget,
      changeOrigin: true,
      ws: true,
      selfHandleResponse: true,
      on: {
        proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
          // Remove frame blocking headers
          res.removeHeader('x-frame-options');
          res.removeHeader('content-security-policy');
          res.removeHeader('X-Frame-Options');
          res.removeHeader('Content-Security-Policy');

          const contentType = proxyRes.headers['content-type'] || '';
          if (typeof contentType === 'string' && contentType.includes('text/html')) {
            const html = responseBuffer.toString('utf8');
            const injection = `\n<!-- MobileLayout Studio Injected Inspector -->\n<script src="${this.bridgeScriptUrl}"></script>\n`;

            if (html.includes('</body>')) {
              return html.replace('</body>', `${injection}</body>`);
            } else if (html.includes('</head>')) {
              return html.replace('</head>', `${injection}</head>`);
            }
            return html + injection;
          }

          return responseBuffer;
        }),
        error: (err, req, res) => {
          console.error(`[DevProxy Error] Connecting to ${this.currentTarget}:`, err.message);
          if (res && 'writeHead' in res && !(res as any).headersSent) {
            (res as any).writeHead(502, { 'Content-Type': 'text/html' });
            (res as any).end(`
              <div style="font-family: sans-serif; padding: 40px; text-align: center; color: #475569;">
                <h2 style="color: #ef4444;">Target Project Not Reachable</h2>
                <p>Could not connect to target dev server at <code>${this.currentTarget}</code>.</p>
                <p>Make sure your Angular/Ionic project is running (e.g. <code>ionic serve</code> or <code>ng serve</code>).</p>
              </div>
            `);
          }
        }
      }
    });

    app.use(proxyMiddleware);

    return new Promise((resolve, reject) => {
      this.proxyServer = http.createServer(app);
      this.proxyServer.listen(this.proxyPort, () => {
        console.log(`[MobileLayout Proxy] Running on http://localhost:${this.proxyPort} -> ${this.currentTarget}`);
        resolve(this.proxyPort);
      });
      this.proxyServer.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[MobileLayout Proxy] Port ${this.proxyPort} in use, trying ${this.proxyPort + 1}...`);
          this.proxyPort++;
          this.proxyServer?.listen(this.proxyPort);
        } else {
          reject(err);
        }
      });
    });
  }

  public updateTarget(newTargetUrl: string) {
    console.log(`[MobileLayout Proxy] Switching target to ${newTargetUrl}`);
    return this.start(newTargetUrl);
  }

  public getStatus() {
    return {
      running: !!this.proxyServer,
      port: this.proxyPort,
      targetUrl: this.currentTarget,
      previewUrl: `http://localhost:${this.proxyPort}`
    };
  }

  public stop() {
    if (this.proxyServer) {
      this.proxyServer.close();
      this.proxyServer = null;
    }
  }
}
