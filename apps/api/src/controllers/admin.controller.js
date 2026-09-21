const asyncHandler = require("../utils/asyncHandler");
const adminService = require("../services/admin.service");
const sosService = require("../services/sos.service");

const io = (req) => req.app.get("io");

exports.pendingDrivers = asyncHandler(async (req, res) => {
  res.json(await adminService.listPendingDrivers());
});

exports.approveDriver = asyncHandler(async (req, res) => {
  res.json(await adminService.approveDriver(req.params.id, io(req)));
});

exports.rejectDriver = asyncHandler(async (req, res) => {
  res.json(await adminService.rejectDriver(req.params.id, req.body.reason, io(req)));
});

exports.trips = asyncHandler(async (req, res) => {
  res.json(await adminService.listTrips({ status: req.query.status }));
});

exports.resolveDispute = asyncHandler(async (req, res) => {
  res.json(await adminService.resolveDispute(req.params.id));
});

exports.stats = asyncHandler(async (req, res) => {
  res.json(await adminService.getStats());
});

exports.sosList = asyncHandler(async (req, res) => {
  res.json(await sosService.listAlerts({ status: req.query.status }));
});

exports.resolveSos = asyncHandler(async (req, res) => {
  res.json(await sosService.resolveAlert(req.params.id, req.body.resolvedNote));
});
