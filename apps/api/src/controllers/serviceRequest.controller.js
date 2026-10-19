const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const service = require("../services/serviceRequest.service");
const paymentService = require("../services/payment.service");
const safety = require("../services/tripSafety.service");
const { presentRequest } = require("../utils/tripPrivacy");

const io = (req) => req.app.get("io");

exports.estimate = asyncHandler(async (req, res) => {
  const estimate = await service.estimateFare(req.body);
  res.json(estimate);
});

exports.create = asyncHandler(async (req, res) => {
  const request = await service.createRequest(req.auth.id, req.body, io(req));
  res.status(201).json(presentRequest(request));
});

exports.accept = asyncHandler(async (req, res) => {
  const request = await service.acceptRequest(req.params.id, req.auth.id, io(req));
  res.json(presentRequest(request));
});

exports.decline = asyncHandler(async (req, res) => {
  const request = await service.declineOffer(req.params.id, req.auth.id, io(req));
  res.json(presentRequest(request));
});

exports.start = asyncHandler(async (req, res) => {
  const request = await service.startRequest(req.params.id, req.auth.id, io(req));
  res.json(presentRequest(request));
});

exports.complete = asyncHandler(async (req, res) => {
  const request = await service.completeRequest(req.params.id, req.auth.id, io(req));
  res.json(presentRequest(request));
});

exports.cancel = asyncHandler(async (req, res) => {
  const request = await service.cancelRequest(req.params.id, req.auth, io(req), req.body?.reason);
  res.json(presentRequest(request));
});

exports.setPayment = asyncHandler(async (req, res) => {
  const request = await service.setPaymentStatus(req.params.id, req.auth.id, req.body);
  res.json(presentRequest(request));
});

exports.paymentSlip = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("ต้องแนบรูปสลิปโอนเงิน (ฟิลด์ file)");
  res.json(await paymentService.submitSlip(req.params.id, req.auth.id, req.file, io(req)));
});

exports.paymentQr = asyncHandler(async (req, res) => {
  const qr = await service.getPaymentQr(req.params.id, req.auth);
  res.json(qr);
});

exports.rate = asyncHandler(async (req, res) => {
  const rating = await service.rateRequest(req.params.id, req.auth.id, req.body);
  res.status(201).json(rating);
});

exports.ratePassenger = asyncHandler(async (req, res) => {
  const rating = await service.ratePassenger(req.params.id, req.auth.id, req.body);
  res.status(201).json(rating);
});

exports.getById = asyncHandler(async (req, res) => {
  const request = await service.getById(req.params.id, req.auth);
  res.json(presentRequest(request));
});

exports.mineAsUser = asyncHandler(async (req, res) => {
  const requests = await service.listForUser(req.auth.id, { status: req.query.status });
  res.json(presentRequest(requests));
});

exports.mineAsDriver = asyncHandler(async (req, res) => {
  const requests = await service.listForDriver(req.auth.id, { status: req.query.status });
  res.json(presentRequest(requests));
});

exports.pending = asyncHandler(async (req, res) => {
  const requests = await service.listPending(req.auth.id);
  res.json(presentRequest(requests));
});

exports.queue = asyncHandler(async (req, res) => {
  const overview = await service.getQueueOverview(req.auth.id);
  res.json(overview);
});

// ---- ความปลอดภัยระหว่างทริป (ดู services/tripSafety.service.js) ----
exports.share = asyncHandler(async (req, res) => {
  res.status(201).json(await safety.createShareLink(req.params.id, req.auth));
});

exports.report = asyncHandler(async (req, res) => {
  res.status(201).json(await safety.createReport(req.params.id, req.auth, req.body ?? {}, io(req)));
});
