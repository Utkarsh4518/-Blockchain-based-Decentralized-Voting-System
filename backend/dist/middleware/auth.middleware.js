"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireVoter = exports.requireAdmin = exports.requireUser = void 0;
const user_repository_1 = require("../repositories/user.repository");
const jwt_1 = require("../utils/jwt");
const requireUser = async (req, res, next) => {
    try {
        const authHeader = req.header("authorization") || req.header("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "UNAUTHENTICATED" });
        }
        const token = authHeader.substring("Bearer ".length).trim();
        const payload = (0, jwt_1.verifyToken)(token);
        const user = await user_repository_1.userRepository.findById(payload.sub);
        if (!user) {
            return res.status(401).json({ error: "USER_NOT_FOUND" });
        }
        req.user = user;
        return next();
    }
    catch (err) {
        return res.status(401).json({ error: "INVALID_TOKEN" });
    }
};
exports.requireUser = requireUser;
const requireAdmin = async (req, res, next) => {
    await (0, exports.requireUser)(req, res, async (err) => {
        if (err)
            return next(err);
        if (!req.user || req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "FORBIDDEN_ADMIN_ONLY" });
        }
        return next();
    });
};
exports.requireAdmin = requireAdmin;
const requireVoter = async (req, res, next) => {
    await (0, exports.requireUser)(req, res, async (err) => {
        if (err)
            return next(err);
        if (!req.user || req.user.role !== "VOTER") {
            return res.status(403).json({ error: "FORBIDDEN_VOTER_ONLY" });
        }
        return next();
    });
};
exports.requireVoter = requireVoter;
