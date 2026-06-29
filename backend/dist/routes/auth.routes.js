"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
router.post("/request-otp", auth_controller_1.requestOtp);
router.post("/verify-otp", auth_controller_1.verifyOtp);
exports.default = router;
