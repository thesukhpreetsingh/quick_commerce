# FairDeal Market - Microservices Architecture

This project is a microservices-based e-commerce marketplace designed for high scalability and reliability.

## 🚀 Service Endpoints

Below are the available services and their access points when running via Docker Compose:

| Service | Host Port | Internal Port | Description | Key Endpoints |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | `http://localhost:8080` | `80` | React-based User Interface | Main Storefront |
| **Backend (Product)** | `http://localhost:5000` | `5000` | Product Catalog & Management | `/api/products` |
| **Order Service** | `http://localhost:6001` | `6000` | Order Orchestration & Lifecycle | `/api/orders`, `/health` |
| **Payment Service** | `http://localhost:5002` | `5000` | Payment Processing Simulator | `/api/payments` |
| **Inventory Service** | `http://localhost:7000` | `7000` | Stock Management (gRPC/REST) | `/api/inventory` |
| **pgAdmin** | `http://localhost:5050` | `80` | Database Management Tool | Admin Panel |

---

## 📚 API Documentation

All services expose Swagger UI when the stack is running:

- Backend API: http://localhost:5000/api/docs
- Order Service: http://localhost:6001/api/docs
- Payment Service: http://localhost:5002/api/docs
- Inventory Service: http://localhost:7000/api/docs

The frontend also includes a Docs button in the header that opens the Swagger docs for each service.

## 🧹 Full Docker Cleanup

To stop all containers, remove volumes, and delete all related images for a complete reset:

```bash
docker compose down --volumes --rmi all
```

Use this when you want a clean slate for Docker-based development.

## ⚙️ System Workflow

The system follows an event-driven architecture to ensure consistency and decoupling between services.

### 🛒 Order Placement Flow
1. **Order Creation**: The Frontend sends a request to the `Order Service`.
2. **Inventory Reservation**: The `Order Service` communicates with the `Inventory Service` (via gRPC/REST) to reserve the requested items.
3. **Order Persistence**: Once inventory is reserved, the order is saved in PostgreSQL with a status of `PENDING_PAYMENT`.
4. **Payment Initiation**: The Frontend redirects the user to the `Payment Service` mock gateway.

### 💳 Payment & Fulfillment Flow
1. **Payment Processing**: The `Payment Service` simulates a transaction. It validates the amount based on the selected currency (USD/INR).
2. **Event Publishing**: Upon success or failure, the `Payment Service` publishes a result event to a **Redis Queue** (`payment-results`).
3. **Order Update**: The `Order Service` (via `paymentListener`) consumes the event from Redis and:
   - **If Success**: Updates order status to `PAID` and tells the `Inventory Service` to finalize the stock deduction.
   - **If Failure**: Updates order status to `PAYMENT_FAILED` and tells the `Inventory Service` to release the reserved stock.
4. **Timeout Handling**: A background worker in the `Order Service` monitors unpaid orders and automatically cancels them if payment is not received within 60 seconds.

---

## 🛠️ Tech Stack
- **Frontend**: React, Vite, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Relational data), Redis (Caching & Message Queue)
- **Communication**: REST API, gRPC (Internal), BullMQ (Eventing)
- **Infrastructure**: Docker, Docker Compose, Nginx
