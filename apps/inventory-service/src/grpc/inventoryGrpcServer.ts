import fs from 'fs';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { finalizeReservation, releaseInventory, reserveInventory } from '../services/inventoryService.js';

const candidateProtoPaths = [
  path.resolve(process.cwd(), 'apps/protos/inventory.proto'),
  path.resolve(process.cwd(), 'protos/inventory.proto'),
  path.resolve('/app/apps/protos/inventory.proto'),
  path.resolve('/app/protos/inventory.proto'),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../apps/protos/inventory.proto'),
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../protos/inventory.proto'),
];

const PROTO_PATH = candidateProtoPaths.find((candidate) => fs.existsSync(candidate)) || candidateProtoPaths[0];
console.log(`[grpc] Using proto file: ${PROTO_PATH}`);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const inventoryPackage = protoDescriptor.fairdeal.inventory;

const grpcHost = process.env.INVENTORY_GRPC_HOST || '0.0.0.0';
const grpcPort = process.env.INVENTORY_GRPC_PORT || '7001';

const server = new grpc.Server();

function toInventoryItems(items: Array<{ productId: number; quantity: number }>) {
  return (items || []).map((item) => ({ productId: item.productId, quantity: item.quantity }));
}

async function handleReserveInventory(call: any, callback: any) {
  console.log('\n[grpc] ReserveInventory request received', { orderId: call.request.orderId, items: call.request.items || [] });
  try {
    const result = await reserveInventory(call.request.orderId, toInventoryItems(call.request.items || []));
    console.log('[grpc] ReserveInventory success', { orderId: call.request.orderId, reserved: result.reserved || [] });
    callback(null, {
      success: true,
      reservedItems: result.reserved || [],
    });
  } catch (error: any) {
    console.error('[grpc] ReserveInventory failed', { orderId: call.request.orderId, error: error.message || error });
    callback(null, {
      success: false,
      error: error.message || 'Reservation failed',
    });
  }
}

async function handleReleaseReservation(call: any, callback: any) {
  console.log('\n[grpc] ReleaseReservation request received', { orderId: call.request.orderId });
  try {
    const result = await releaseInventory(call.request.orderId);
    console.log('[grpc] ReleaseReservation success', { orderId: call.request.orderId, released: result.released || [] });
    callback(null, {
      success: true,
      items: (result.released || []).map((item: any) => ({ productId: item.productId, quantity: item.quantity })),
    });
  } catch (error: any) {
    console.error('[grpc] ReleaseReservation failed', { orderId: call.request.orderId, error: error.message || error });
    callback(null, {
      success: false,
      error: error.message || 'Release failed',
    });
  }
}

async function handleFinalizeReservation(call: any, callback: any) {
  console.log('\n[grpc] FinalizeReservation request received', { orderId: call.request.orderId });
  try {
    const result = await finalizeReservation(call.request.orderId);
    const finalizedItems = Array.isArray(result.finalized) ? result.finalized : [];
    console.log('[grpc] FinalizeReservation success', { orderId: call.request.orderId, finalized: finalizedItems });
    callback(null, {
      success: true,
      items: finalizedItems.map((item: any) => ({ productId: item.productId, quantity: item.quantity })),
    });
  } catch (error: any) {
    console.error('[grpc] FinalizeReservation failed', { orderId: call.request.orderId, error: error.message || error });
    callback(null, {
      success: false,
      error: error.message || 'Finalize failed',
    });
  }
}

server.addService(inventoryPackage.InventoryService.service, {
  ReserveInventory: handleReserveInventory,
  ReleaseReservation: handleReleaseReservation,
  FinalizeReservation: handleFinalizeReservation,
});

export function startInventoryGrpcServer() {
  return new Promise<void>((resolve, reject) => {
    server.bindAsync(`${grpcHost}:${grpcPort}`, grpc.ServerCredentials.createInsecure(), (err: Error | null, port: number) => {
      if (err) {
        reject(err);
        return;
      }

      server.start();
      console.log(`\n==================================================`);
      console.log(`[grpc] Inventory gRPC server listening on ${grpcHost}:${port}`);
      console.log(`==================================================\n`);
      resolve();
    });
  });
}
