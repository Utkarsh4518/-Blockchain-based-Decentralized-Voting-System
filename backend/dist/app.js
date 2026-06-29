"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const voter_routes_1 = __importDefault(require("./routes/voter.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
dotenv_1.default.config();
const createApp = () => {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use("/auth", auth_routes_1.default);
    app.use("/admin", admin_routes_1.default);
    app.use("/voter", voter_routes_1.default);
    app.get("/health", (_req, res) => {
        res.json({ status: "ok" });
    });
    app.use(error_middleware_1.errorMiddleware);
    return app;
};
exports.createApp = createApp;
