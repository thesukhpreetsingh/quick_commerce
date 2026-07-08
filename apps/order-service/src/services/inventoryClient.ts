import http from 'http';
import https from 'https';

const inventoryUrl = process.env.INVENTORY_SERVICE_URL;

function request(path: string, method: string, payload: any) {
  const url = new URL(path, inventoryUrl);
  const body = JSON.stringify(payload);
  const client = url.protocol === 'https:' ? https : http;

  return new Promise<any>((resolve, reject) => {
    const req = client.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            return resolve(data ? JSON.parse(data) : null);
          }
          const message = data || res.statusMessage;
          return reject(new Error(`Inventory service error (${res.statusCode}): ${message}`));
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export async function finalizeInventoryReservation(orderId: string) {
  return request('/api/inventory/finalize', 'POST', { orderId });
}

export async function releaseInventoryReservation(orderId: string) {
  return request('/api/inventory/release', 'POST', { orderId });
}
