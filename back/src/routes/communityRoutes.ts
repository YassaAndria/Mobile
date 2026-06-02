import { Router } from "express";
import { protect } from "../middlewares/auth.middleware";
import { restrictTo } from "../middlewares/authorize.middleware";
import {
  listCommunities,
  searchCommunities,
  getCommunity,
  createCommunity,
  joinCommunity,
  manageJoinRequest,
  leaveCommunity,
  addCommunityMember,
  acceptCommunityInvite,
  declineCommunityInvite,
  deleteCommunity,
  getCommunityFeed,
  getCommunityChat,
  generateInviteLink,
  previewInviteGroup,
  joinGroupViaInviteLink,
} from "../controllers/community.controller";

const router = Router();

router.use(protect);

router.get("/", listCommunities);
router.get("/search", searchCommunities);
router.post("/", createCommunity);
router.get("/invite/:token", previewInviteGroup);
router.post("/invite/:token/join", joinGroupViaInviteLink);
router.get("/:id", getCommunity);
router.post("/:id/invite-link", generateInviteLink);
router.post("/:id/join", joinCommunity);
router.post("/:id/leave", leaveCommunity);
router.post("/:id/members", addCommunityMember);
router.post("/:id/invite/accept", acceptCommunityInvite);
router.post("/:id/invite/decline", declineCommunityInvite);
router.put("/:id/requests/:userId", manageJoinRequest);
router.delete("/:id", deleteCommunity);
router.get("/:id/feed", getCommunityFeed);
router.get("/:id/chat", getCommunityChat);

export default router;
