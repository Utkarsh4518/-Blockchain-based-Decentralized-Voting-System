import { Router } from "express";
import { getElections, getElection, castVote } from "../controllers/voter.controller";
import { requireVoter } from "../middleware/auth.middleware";

const router = Router();

router.get("/elections", requireVoter, getElections);
router.get("/elections/:id", requireVoter, getElection);
router.post("/elections/:id/vote", requireVoter, castVote);

export default router;


