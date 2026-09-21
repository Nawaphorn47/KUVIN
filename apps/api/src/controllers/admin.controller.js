const asyncHandler = require("../utils/asyncHandler");
const adminService = require("../services/admin.service");
const sosService = require("../services/sos.service");
const landmarkService = require("../services/landmark.service");

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

exports.landmarks = asyncHandler(async (req, res) => {
  res.json(await landmarkService.listLandmarks());
});

exports.createLandmark = asyncHandler(async (req, res) => {
  res.status(201).json(await landmarkService.createLandmark(req.body));
});

exports.updateLandmark = asyncHandler(async (req, res) => {
  res.json(await landmarkService.updateLandmark(req.params.id, req.body));
});

exports.deleteLandmark = asyncHandler(async (req, res) => {
  await landmarkService.deleteLandmark(req.params.id);
  res.status(204).end();
});

exports.users = asyncHandler(async (req, res) => {
  res.json(await adminService.listUsers({ q: req.query.q, status: req.query.status }));
});

exports.userDetail = asyncHandler(async (req, res) => {
  res.json(await adminService.getUserDetail(req.params.id));
});

exports.suspendUser = asyncHandler(async (req, res) => {
  res.json(await adminService.suspendAccount("user", req.params.id, req.body.reason, io(req)));
});

exports.unsuspendUser = asyncHandler(async (req, res) => {
  res.json(await adminService.unsuspendAccount("user", req.params.id));
});

exports.drivers = asyncHandler(async (req, res) => {
  res.json(await adminService.listDrivers({ q: req.query.q, status: req.query.status }));
});

exports.driverDetail = asyncHandler(async (req, res) => {
  res.json(await adminService.getDriverDetail(req.params.id));
});

exports.suspendDriver = asyncHandler(async (req, res) => {
  res.json(await adminService.suspendAccount("driver", req.params.id, req.body.reason, io(req)));
});

exports.unsuspendDriver = asyncHandler(async (req, res) => {
  res.json(await adminService.unsuspendAccount("driver", req.params.id));
});
