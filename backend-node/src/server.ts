import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import fs from 'fs';
import authRouter from './routes/auth.router.js';
import adminRouter from './routes/admin.router.js';
import productRouter from './routes/product.router.js';
import orderRouter from './routes/order.router.js';
import discountRouter from './routes/discount.router.js';
import cartRouter from './routes/cart.router.js';
import paymentRouter from './routes/payment.router.js';
import purchaseRouter from './routes/purchase.router.js';
import { errorHandler } from './middleware/error.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

dotenv.config();

const app = express();
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
const appName = process.env.APP_NAME || 'AMB-DMP-2026-NODE';
const appEnv = process.env.APP_ENV || 'development';
const apiPrefix = process.env.API_V1_PREFIX || '/api/v1';

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());

// Serve uploads dynamically from the database
app.get('/uploads/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const result: any = await db.execute(sql`
      SELECT mime_type, binary_data FROM uploaded_files WHERE filename = ${filename}
    `);
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    
    const row = result.rows[0];
    res.setHeader('Content-Type', row.mime_type);
    res.send(row.binary_data);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve image' });
  }
});

// ── Health Check (P1-05) ────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    app: appName,
    env: appEnv,
  });
});

// ── Register Routers ────────────────────────────────────────
app.use(apiPrefix, authRouter);
app.use(apiPrefix + '/admin', adminRouter);
app.use(apiPrefix, productRouter);
app.use(apiPrefix, orderRouter);
app.use(apiPrefix, discountRouter);
app.use(apiPrefix, cartRouter);
app.use(apiPrefix, paymentRouter);
app.use(apiPrefix, purchaseRouter);

// ── 404 Not Found Fallback ──────────────────────────────────
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Not found',
    error_code: 'NOT_FOUND',
    data: null,
  });
});

// ── Global Error Handler Middleware ─────────────────────────
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────────
if (process.env.APP_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(port, host, () => {
    console.log(`[INFO] Server running at http://${host}:${port}`);
    console.log(`[INFO] Environment: ${appEnv}`);
    console.log(`[INFO] API Prefix: ${apiPrefix}`);
  });
}

export default app;
