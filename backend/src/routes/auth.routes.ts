import { Router } from "express";
import { requestOtp, verifyOtp, register } from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);

export default router;

