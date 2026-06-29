"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtp = exports.requestOtp = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_repository_1 = require("../repositories/user.repository");
const otp_repository_1 = require("../repositories/otp.repository");
const jwt_1 = require("../utils/jwt");
const OTP_EXP_MINUTES = 5;
const requestOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (typeof email !== "string" || email.length === 0) {
            return res.status(400).json({ error: "INVALID_EMAIL" });
        }
        const user = await user_repository_1.userRepository.findByEmail(email);
        if (!user || user.role !== "VOTER") {
            // Do not leak which emails exist
            return res.json({ message: "OTP generated if user exists" });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = await bcryptjs_1.default.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);
        await otp_repository_1.otpRepository.createToken(user.id, codeHash, expiresAt);
        // For now, log OTP to console
        // eslint-disable-next-line no-console
        console.log(`[OTP] For user ${email}: ${otp}`);
        return res.json({ message: "OTP generated if user exists" });
    }
    catch (err) {
        next(err);
    }
};
exports.requestOtp = requestOtp;
const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (typeof email !== "string" ||
            typeof otp !== "string" ||
            otp.length === 0) {
            return res.status(400).json({ error: "INVALID_PAYLOAD" });
        }
        const user = await user_repository_1.userRepository.findByEmail(email);
        if (!user || user.role !== "VOTER") {
            return res.status(401).json({ error: "INVALID_CREDENTIALS" });
        }
        const tokenRecord = await otp_repository_1.otpRepository.findActiveTokenByUser(user.id);
        if (!tokenRecord) {
            return res.status(401).json({ error: "OTP_INVALID_OR_EXPIRED" });
        }
        const match = await bcryptjs_1.default.compare(otp, tokenRecord.codeHash);
        if (!match) {
            return res.status(401).json({ error: "OTP_INVALID_OR_EXPIRED" });
        }
        await otp_repository_1.otpRepository.markUsed(tokenRecord.id);
        const jwt = (0, jwt_1.signToken)({ sub: user.id, role: user.role });
        return res.json({
            accessToken: jwt,
            tokenType: "Bearer",
            expiresIn: Number(process.env.JWT_EXPIRES_IN || 3600),
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.verifyOtp = verifyOtp;
