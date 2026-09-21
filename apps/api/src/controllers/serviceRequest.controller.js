const asyncHandler = require("../utils/asyncHandler");
const service = require("../services/serviceRequest.service");

const io = (req) => req.app.get("io");

exports.estimate = asyncHandler(async (req, res) => {
  const estimate = await service.estimateFare(req.body);
  res.json(estimate);
});

exports.create = asyncHandler(async (req, res) => {
  const request = await service.createRequest(req.auth.id, req.body, io(req));
  res.status(201).json(request);
});

exports.accept = asyncHandler(async (req, res) => {
  const request = await service.acceptRequest(req.params.id, req.auth.id, io(req));
  res.json(request);
});

exports.decline = asyncHandler(async (req, res) => {
  const request = await service.declineOffer(req.params.id, req.auth.id, io(req));
  res.json(request);
});

exports.start = asyncHandler(async (req, res) => {
  const request = await service.startRequest(req.params.id, req.auth.id, io(req));
  res.json(request);
});

exports.complete = asyncHandler(async (req, res) => {
  const request = await service.completeRequest(req.params.id, req.auth.id, io(req));
  res.json(request);
});

exports.cancel = asyncHandler(async (req, res) => {
  const request = await service.cancelRequest(req.params.id, req.auth, io(req), req.body?.reason);
  res.json(request);
});

exports.setPayment = asyncHandler(async (req, res) => {
  const request = await service.setPaymentStatus(req.params.id, req.auth.id, req.body);
  res.json(request);
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
  res.json(request);
});

exports.mineAsUser = asyncHandler(async (req, res) => {
  const requests = await service.listForUser(req.auth.id, { status: req.query.status });
  res.json(requests);
});

exports.mineAsDriver = asyncHandler(async (req, res) => {
  const requests = await service.listForDriver(req.auth.id, { status: req.query.status });
  res.json(requests);
});

exports.pending = asyncHandler(async (req, res) => {
  const requests = await service.listPending(req.auth.id);
  res.json(requests);
});

exports.queue = asyncHandler(async (req, res) => {
  const overview = await service.getQueueOverview(req.auth.id);
  res.json(overview);
});
