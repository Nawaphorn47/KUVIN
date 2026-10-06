const asyncHandler = require("../utils/asyncHandler");
const adminService = require("../services/admin.service");
const sosService = require("../services/sos.service");
const landmarkService = require("../services/landmark.service");
const areaService = require("../services/area.service");
const adminAccountService = require("../services/adminAccount.service");

const io = (req) => req.app.get("io");
const scope = (req) => req.adminScope;

exports.pendingDrivers = asyncHandler(async (req, res) => {
  res.json(await adminService.listPendingDrivers(scope(req)));
});

exports.approveDriver = asyncHandler(async (req, res) => {
  res.json(await adminService.approveDriver(scope(req), req.params.id, io(req)));
});

exports.rejectDriver = asyncHandler(async (req, res) => {
  res.json(await adminService.rejectDriver(scope(req), req.params.id, req.body.reason, io(req)));
});

exports.trips = asyncHandler(async (req, res) => {
  res.json(await adminService.listTrips(scope(req), { status: req.query.status }));
});

exports.resolveDispute = asyncHandler(async (req, res) => {
  res.json(await adminService.resolveDispute(scope(req), req.params.id));
});

exports.stats = asyncHandler(async (req, res) => {
  res.json(await adminService.getStats(scope(req)));
});

exports.sosList = asyncHandler(async (req, res) => {
  res.json(await sosService.listAlerts(scope(req), { status: req.query.status }));
});

exports.resolveSos = asyncHandler(async (req, res) => {
  res.json(await sosService.resolveAlert(scope(req), req.params.id, req.body.resolvedNote));
});

exports.landmarks = asyncHandler(async (req, res) => {
  res.json(await landmarkService.listForAdmin(scope(req)));
});

exports.createLandmark = asyncHandler(async (req, res) => {
  res.status(201).json(await landmarkService.createLandmark(scope(req), req.body));
});

exports.updateLandmark = asyncHandler(async (req, res) => {
  res.json(await landmarkService.updateLandmark(scope(req), req.params.id, req.body));
});

exports.deleteLandmark = asyncHandler(async (req, res) => {
  await landmarkService.deleteLandmark(scope(req), req.params.id);
  res.status(204).end();
});

exports.users = asyncHandler(async (req, res) => {
  res.json(await adminService.listUsers(scope(req), { q: req.query.q, status: req.query.status }));
});

exports.userDetail = asyncHandler(async (req, res) => {
  res.json(await adminService.getUserDetail(scope(req), req.params.id));
});

exports.suspendUser = asyncHandler(async (req, res) => {
  res.json(await adminService.suspendAccount(scope(req), "user", req.params.id, req.body.reason, io(req)));
});

exports.unsuspendUser = asyncHandler(async (req, res) => {
  res.json(await adminService.unsuspendAccount(scope(req), "user", req.params.id));
});

exports.drivers = asyncHandler(async (req, res) => {
  res.json(await adminService.listDrivers(scope(req), { q: req.query.q, status: req.query.status }));
});

exports.driverDetail = asyncHandler(async (req, res) => {
  res.json(await adminService.getDriverDetail(scope(req), req.params.id));
});

exports.suspendDriver = asyncHandler(async (req, res) => {
  res.json(await adminService.suspendAccount(scope(req), "driver", req.params.id, req.body.reason, io(req)));
});

exports.unsuspendDriver = asyncHandler(async (req, res) => {
  res.json(await adminService.unsuspendAccount(scope(req), "driver", req.params.id));
});

// ---- พื้นที่ให้บริการ ----
exports.areas = asyncHandler(async (req, res) => {
  res.json(await areaService.listAreas(scope(req)));
});

exports.area = asyncHandler(async (req, res) => {
  res.json(await areaService.getArea(scope(req), req.params.id));
});

exports.createArea = asyncHandler(async (req, res) => {
  res.status(201).json(await areaService.createArea(req.body));
});

exports.updateArea = asyncHandler(async (req, res) => {
  res.json(await areaService.updateArea(scope(req), req.params.id, req.body));
});

// ---- บัญชีแอดมิน (super เท่านั้น) ----
exports.admins = asyncHandler(async (req, res) => {
  res.json(await adminAccountService.listAdmins());
});

exports.createAdmin = asyncHandler(async (req, res) => {
  res.status(201).json(await adminAccountService.createAdmin(req.body));
});

exports.updateAdmin = asyncHandler(async (req, res) => {
  res.json(await adminAccountService.updateAdmin(scope(req).adminId, req.params.id, req.body));
});

exports.deleteAdmin = asyncHandler(async (req, res) => {
  await adminAccountService.deleteAdmin(scope(req).adminId, req.params.id);
  res.status(204).end();
});
