import { jest } from '@jest/globals';
import { NwsClient } from '../../src/services/nws-client.js';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('API Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('NWS API Requests', () => {
    test('handles successful API response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          features: [
            {
              properties: {
                event: 'Test Alert',
                areaDesc: 'Test Area',
                severity: 'Minor',
                status: 'Actual',
                headline: 'Test Headline',
              },
            },
          ],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await NwsClient.fetch('https://api.weather.gov/test');

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual({
        features: [
          {
            properties: {
              event: 'Test Alert',
              areaDesc: 'Test Area',
              severity: 'Minor',
              status: 'Actual',
              headline: 'Test Headline',
            },
          },
        ],
      });
    });

    test('handles API error response without endless retries', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ error: 'Not Found' }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await NwsClient.fetch('https://api.weather.gov/test');
      expect(result).toBeNull();
    });
  });
});
