import fs from 'fs';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
const candidateProtoPaths = [
    path.resolve(process.cwd(), 'apps/protos/inventory.proto'),
    path.resolve(process.cwd(), 'protos/inventory.proto'),
    path.resolve('/app/apps/protos/inventory.proto'),
    path.resolve('/app/protos/inventory.proto'),
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
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const inventoryPackage = protoDescriptor.fairdeal.inventory;
const inventoryUrl = process.env.INVENTORY_GRPC_URL || process.env.INVENTORY_SERVICE_GRPC_URL || 'localhost:7001';
const client = new inventoryPackage.InventoryService(inventoryUrl, grpc.credentials.createInsecure());
export async function reserveInventory(orderId, items) {
    console.log('\n[grpc] Calling ReserveInventory', { orderId, items });
    return new Promise((resolve, reject) => {
        client.ReserveInventory({ orderId, items }, (err, response) => {
            if (err) {
                console.error('[grpc] ReserveInventory failed', { orderId, error: err.message || err });
                return reject(err);
            }
            if (!response.success) {
                console.error('[grpc] ReserveInventory returned failure', { orderId, response });
                return reject(new Error(response.error || 'Reservation failed'));
            }
            console.log('[grpc] ReserveInventory succeeded', { orderId, response });
            resolve(response);
        });
    });
}
export async function releaseInventoryReservation(orderId) {
    console.log('\n[grpc] Calling ReleaseReservation', { orderId });
    return new Promise((resolve, reject) => {
        client.ReleaseReservation({ orderId }, (err, response) => {
            if (err) {
                console.error('[grpc] ReleaseReservation failed', { orderId, error: err.message || err });
                return reject(err);
            }
            if (!response.success) {
                console.error('[grpc] ReleaseReservation returned failure', { orderId, response });
                return reject(new Error(response.error || 'Release failed'));
            }
            console.log('[grpc] ReleaseReservation succeeded', { orderId, response });
            resolve(response);
        });
    });
}
export async function finalizeInventoryReservation(orderId) {
    console.log('\n[grpc] Calling FinalizeReservation', { orderId });
    return new Promise((resolve, reject) => {
        client.FinalizeReservation({ orderId }, (err, response) => {
            if (err) {
                console.error('[grpc] FinalizeReservation failed', { orderId, error: err.message || err });
                return reject(err);
            }
            if (!response.success) {
                console.error('[grpc] FinalizeReservation returned failure', { orderId, response });
                return reject(new Error(response.error || 'Finalize failed'));
            }
            console.log('[grpc] FinalizeReservation succeeded', { orderId, response });
            resolve(response);
        });
    });
}
