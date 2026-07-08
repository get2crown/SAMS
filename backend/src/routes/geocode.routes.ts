import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { GeocodeController } from '../controllers/geocode.controller';

const router = Router();

// Public (needed during registration, before a token exists) but rate
// limited — both to respect Nominatim's ~1 req/sec usage policy and to
// prevent this becoming an open proxy for abuse.
const geocodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', geocodeLimiter, GeocodeController.lookup);

export default router;
