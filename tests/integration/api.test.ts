import { jest } from '@jest/globals';

// Mock fetch before importing the module
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('API Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('NWS API Requests', () => {
    test('should handle successful API response', async () => {
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
                headline: 'Test Headline'
              }
            }
          ]
        })
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      // Import the function after mocking
      const { makeNWSRequest } = await import('../../src/index');
      
      const result = await makeNWSRequest('https://api.weather.gov/test');
      
      expect(mockFetch).toHaveBeenCalledWith('https://api.weather.gov/test', {
        headers: {
          'User-Agent': 'weather-app/2.0',
          'Accept': 'application/geo+json'
        }
      });
      expect(result).toEqual({
        features: [
          {
            properties: {
              event: 'Test Alert',
              areaDesc: 'Test Area',
              severity: 'Minor',
              status: 'Actual',
              headline: 'Test Headline'
            }
          }
        ]
      });
    });

    test('should handle API error response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Internal Server Error' })
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const { makeNWSRequest } = await import('../../src/index');
      
      const result = await makeNWSRequest('https://api.weather.gov/test');
      
      expect(result).toBeNull();
    });

    test('should retry on server errors', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Internal Server Error' })
      };

      const successResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true })
      };

      mockFetch
        .mockResolvedValueOnce(errorResponse as any)
        .mockResolvedValueOnce(successResponse as any);

      const { makeNWSRequest } = await import('../../src/index');
      
      const result = await makeNWSRequest('https://api.weather.gov/test');
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    test('should handle network timeout', async () => {
      // Mock a timeout by making fetch never resolve
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { makeNWSRequest } = await import('../../src/index');
      
      const result = await makeNWSRequest('https://api.weather.gov/test');
      
      expect(result).toBeNull();
    }, 15000); // Increase timeout for this test
  });

  describe('Error Handling', () => {
    test('should handle fetch rejection', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { makeNWSRequest } = await import('../../src/index');
      
      const result = await makeNWSRequest('https://api.weather.gov/test');
      
      expect(result).toBeNull();
    });

    test('should handle JSON parsing error', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const { makeNWSRequest } = await import('../../src/index');
      
      const result = await makeNWSRequest('https://api.weather.gov/test');
      
      expect(result).toBeNull();
    });
  });
});
