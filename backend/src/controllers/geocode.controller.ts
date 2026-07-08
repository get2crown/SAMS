import { Request, Response } from 'express';
import { GeolocationService } from '../services/geolocation.service';

export class GeocodeController {
  static async lookup(req: Request, res: Response): Promise<void> {
    try {
      const address = (req.query.address as string || '').trim();
      if (!address) {
        res.status(400).json({ error: 'address query parameter is required' });
        return;
      }

      const result = await GeolocationService.getCoordinatesFromAddress(address);
      if (!result) {
        res.status(404).json({ error: 'Could not find that address. Try being more specific.' });
        return;
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
