import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
const PROTO_PATH = path.resolve('apps/protos/inventory.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const inventoryPackage = protoDescriptor.fairdeal.inventory;
const inventoryUrl = process.env.INVENTORY_SERVICE_URL || 'localhost:7000';
const client = new inventoryPackage.InventoryService(inventoryUrl, grpc.credentials.createInsecure());
export async function reserveInventory(orderId, items) {
    return new Promise((resolve, reject) => {
        client.ReserveInventory({ orderId, items }, (err, response) => {
            if (err)
                return reject(err);
            if (!response.success)
                return reject(new Error(response.error || 'Reservation failed'));
            resolve(response);
        });
    });
}
export async function releaseInventoryReservation(orderId) {
    return new Promise((resolve, reject) => {
        client.ReleaseReservation({ orderId }, (err, response) => {
            if (err)
                return reject(err);
            if (!response.success)
                return reject(new Error(response.error || 'Release failed'));
            resolve(response);
        });
    });
}
export async function finalizeInventoryReservation(orderId) {
    return new Promise((resolve, reject) => {
        client.FinalizeReservation({ orderId }, (err, response) => {
            if (err)
                return reject(err);
            if (!response.success)
                return reject(new Error(response.error || 'Finalize failed'));
            resolve(response);
        });
    });
}
