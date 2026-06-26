import { Injectable, Logger } from '@nestjs/common';

// Econt's Nomenclatures API is PUBLIC (no auth) and returns the full BG office/Econtomat list.
// We fetch once and cache in memory (the list changes rarely), then filter server-side.
const OFFICES_URL =
  'https://ee.econt.com/services/Nomenclatures/NomenclaturesService.getOffices.json';
const TTL_MS = 1000 * 60 * 60 * 24; // 24h

export interface EcontOffice {
  code: string; // Econt office code (used on the shipment label)
  name: string;
  city: string;
  postCode: string;
  address: string;
  isAPS: boolean; // true = Econtomat (automated parcel machine)
}

export interface EcontCity {
  name: string;
  postCode: string;
}

interface RawOffice {
  code?: string | number;
  name?: string;
  isAPS?: boolean;
  address?: { fullAddress?: string; city?: { name?: string; postCode?: string } };
}

@Injectable()
export class EcontService {
  private readonly logger = new Logger(EcontService.name);
  private cache: { offices: EcontOffice[]; at: number } | null = null;
  private inflight: Promise<EcontOffice[]> | null = null;

  private async load(): Promise<EcontOffice[]> {
    if (this.cache && Date.now() - this.cache.at < TTL_MS) return this.cache.offices;
    if (this.inflight) return this.inflight;
    this.inflight = (async () => {
      const res = await fetch(OFFICES_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ countryCode: 'BGR' }),
      });
      if (!res.ok) throw new Error(`Econt nomenclatures responded ${res.status}`);
      const data = (await res.json()) as { offices?: RawOffice[] };
      const offices: EcontOffice[] = (data.offices ?? []).map((o) => ({
        code: String(o.code ?? ''),
        name: o.name ?? '',
        city: o.address?.city?.name ?? '',
        postCode: o.address?.city?.postCode ?? '',
        address: (o.address?.fullAddress ?? '').trim(),
        isAPS: Boolean(o.isAPS),
      }));
      this.cache = { offices, at: Date.now() };
      this.logger.log(`cached ${offices.length} Econt offices`);
      return offices;
    })();
    try {
      return await this.inflight;
    } finally {
      this.inflight = null;
    }
  }

  /** Unique cities that have at least one Econt office, sorted (BG collation). */
  async cities(): Promise<EcontCity[]> {
    const offices = await this.load();
    const map = new Map<string, EcontCity>();
    for (const o of offices) {
      if (o.city && !map.has(o.city)) map.set(o.city, { name: o.city, postCode: o.postCode });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'bg'));
  }

  /** Offices for a city (exact, case-insensitive). Empty `city` returns the full list. */
  async offices(city?: string): Promise<EcontOffice[]> {
    const offices = await this.load();
    if (!city?.trim()) return offices;
    const c = city.trim().toLowerCase();
    return offices.filter((o) => o.city.toLowerCase() === c);
  }
}
