import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { API_BODY_LIMIT, OAUTH_CALLBACK_RATE_RULE, applyNoStoreForApi, applySecurityHeaders, createFixedRateLimitMiddleware, createTrpcRateLimitMiddleware } from "../security";
import { getServiceHealth } from "../health";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(applySecurityHeaders);
  // The largest supported upload is a 10 MB verification document encoded as
  // base64; 16 MB leaves envelope overhead without accepting unbounded bodies.
  app.use(express.json({ limit: API_BODY_LIMIT }));
  app.use(express.urlencoded({ limit: API_BODY_LIMIT, extended: true }));
  app.use("/api", applyNoStoreForApi);
  app.get("/api/healthz", (_req, res) => {
    res.status(200).json(getServiceHealth());
  });
  registerStorageProxy(app);
  app.use("/api/oauth/callback", createFixedRateLimitMiddleware(OAUTH_CALLBACK_RATE_RULE));
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createTrpcRateLimitMiddleware(),
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
