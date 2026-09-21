const asyncHandler = require("../utils/asyncHandler");
const sosService = require("../services/sos.service");

const io = (req) => req.app.get("io");

exports.create = asyncHandler(async (req, res) => {
  const alert = await sosService.createAlert(req.auth, req.body, io(req));
  res.status(201).json(alert);
});

exports.markContacted = asyncHandler(async (req, res) => {
  const alert = await sosService.markContacted(req.params.id, req.auth, req.body.contactedEmergencyNumber);
  res.json(alert);
});

exports.cancel = asyncHandler(async (req, res) => {
  const alert = await sosService.cancelOwnAlert(req.params.id, req.auth);
  res.json(alert);
});

exports.list = asyncHandler(async (req, res) => {
  res.json(await sosService.listAlerts({ status: req.query.status }));
});

exports.resolve = asyncHandler(async (req, res) => {
  res.json(await sosService.resolveAlert(req.params.id, req.body.resolvedNote));
});
