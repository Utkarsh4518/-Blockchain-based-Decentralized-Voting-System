import { Router } from "express";
import { register, requestOtp, verifyOtp, requestChallenge, verifyChallenge } from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/otp/request", requestOtp);
router.post("/otp/verify", verifyOtp);
router.post("/passkey/challenge", requestChallenge);
router.post("/passkey/verify", verifyChallenge);

export default router;
