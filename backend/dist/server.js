"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const dotenv_1 = __importDefault(require("dotenv"));
const blockchainEvents_service_1 = require("./services/blockchainEvents.service");
dotenv_1.default.config();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const app = (0, app_1.createApp)();
(async () => {
    await blockchainEvents_service_1.blockchainEventListener.start();
    app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`Backend listening on http://localhost:${PORT}`);
    });
})().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err);
    process.exit(1);
});
