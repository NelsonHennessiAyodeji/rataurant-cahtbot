const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chat.Controller");

router.post("/message", chatController.handleMessage);
router.get("/history/:sessionId", chatController.getOrderHistory);
router.post("/payment/initialize", chatController.initializePayment);
router.get("/payment/verify", chatController.verifyPayment);
router.post("/schedule", chatController.scheduleOrder);

module.exports = router;
