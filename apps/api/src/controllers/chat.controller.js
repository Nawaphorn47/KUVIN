const asyncHandler = require("../utils/asyncHandler");
const chat = require("../services/chat.service");

exports.list = asyncHandler(async (req, res) => {
  res.json(await chat.listMessages(req.params.id, req.auth, { markRead: req.query.peek !== "1" }));
});

exports.send = asyncHandler(async (req, res) => {
  res.status(201).json(await chat.sendMessage(req.params.id, req.auth, req.body, req.app.get("io")));
});
