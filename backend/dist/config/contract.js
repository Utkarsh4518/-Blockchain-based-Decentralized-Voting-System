"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadContractConfig = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let cachedConfig = null;
const loadContractConfig = () => {
    if (cachedConfig) {
        return cachedConfig;
    }
    const network = process.env.CONTRACT_NETWORK && process.env.CONTRACT_NETWORK.length > 0
        ? process.env.CONTRACT_NETWORK
        : "local";
    const filename = `${network}.json`;
    const deploymentsPath = path.join(__dirname, "..", "..", "contracts", "deployments", filename);
    if (!fs.existsSync(deploymentsPath)) {
        throw new Error(`Contract deployment file not found for network "${network}". Expected at: ${deploymentsPath}. ` +
            `Please deploy the contract with Hardhat and ensure deployments/${filename} exists.`);
    }
    const raw = fs.readFileSync(deploymentsPath, "utf-8");
    const data = JSON.parse(raw);
    if (!data.address || !data.abi) {
        throw new Error(`Invalid deployment file format for network "${network}" at ${deploymentsPath}.`);
    }
    cachedConfig = {
        address: data.address,
        abi: data.abi,
        chainId: data.chainId,
    };
    return cachedConfig;
};
exports.loadContractConfig = loadContractConfig;
