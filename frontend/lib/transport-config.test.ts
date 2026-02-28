import { describe, it, expect } from 'vitest';
import { TRANSPORT_CONFIG } from './transport-config';

describe('TRANSPORT_CONFIG', () => {
  it('has an entry for every transport type', () => {
    const types = ['flight', 'train', 'bus', 'drive', 'ferry', 'other'];
    types.forEach(t => {
      expect(TRANSPORT_CONFIG[t], `missing config for "${t}"`).toBeDefined();
    });
  });

  it('drive hides carrier, reference, and overnight', () => {
    const cfg = TRANSPORT_CONFIG['drive'];
    expect(cfg.showCarrier).toBe(false);
    expect(cfg.showReference).toBe(false);
    expect(cfg.overnightSupported).toBe(false);
  });

  it('drive shows distance and tolls', () => {
    const cfg = TRANSPORT_CONFIG['drive'];
    expect(cfg.showDistance).toBe(true);
    expect(cfg.showTolls).toBe(true);
  });

  it('flight has adaptive carrier label "Airline"', () => {
    const cfg = TRANSPORT_CONFIG['flight'];
    expect(cfg.showCarrier).toBe(true);
    expect(cfg.carrierLabel).toBe('Airline');
    expect(cfg.carrierPlaceholder).toBe('Emirates');
  });

  it('flight has adaptive reference label "Flight number"', () => {
    const cfg = TRANSPORT_CONFIG['flight'];
    expect(cfg.showReference).toBe(true);
    expect(cfg.referenceLabel).toBe('Flight number');
    expect(cfg.referencePlaceholder).toBe('EK415');
  });

  it('train has reference label "Train code"', () => {
    const cfg = TRANSPORT_CONFIG['train'];
    expect(cfg.referenceLabel).toBe('Train code');
    expect(cfg.referencePlaceholder).toBe('AVE 3041');
  });

  it('flight supports overnight', () => {
    expect(TRANSPORT_CONFIG['flight'].overnightSupported).toBe(true);
  });

  it('ferry shows distance', () => {
    expect(TRANSPORT_CONFIG['ferry'].showDistance).toBe(true);
  });

  it('train and bus show frequency', () => {
    expect(TRANSPORT_CONFIG['train'].showFrequency).toBe(true);
    expect(TRANSPORT_CONFIG['bus'].showFrequency).toBe(true);
  });
});
