const asyncHandler = require("../utils/asyncHandler");
const notificationService = require("../services/notification.service");

exports.list = asyncHandler(async (req, res) => {
  const notifications = await notificationService.listForRecipient({
    recipientType: req.auth.role.toUpperCase(),
    recipientId: req.auth.id,
  });
  res.json(notifications);
});

exports.markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.params.id, {
    recipientType: req.auth.role.toUpperCase(),
    recipientId: req.auth.id,
  });
  res.json(notification);
});
