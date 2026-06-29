import { Router } from "express";
import { createElection, startElection } from "../controllers/admin.controller";
import { requireAdmin } from "../middleware/auth.middleware";

const router = Router();

router.post("/elections", requireAdmin, createElection);
router.post("/elections/:id/start", requireAdmin, startElection);

export default router;


