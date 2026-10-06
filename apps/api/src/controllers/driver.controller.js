const asyncHandler = require("../utils/asyncHandler");
const driverService = require("../services/driver.service");
const financeService = require("../services/finance.service");

exports.getById = asyncHandler(async (req, res) => {
  const driver = await driverService.getPublicDriver(req.params.id);
  res.json(driver);
});

exports.me = asyncHandler(async (req, res) => {
  const driver = await driverService.getDriver(req.auth.id);
  res.json(driver);
});

exports.updateLocation = asyncHandler(async (req, res) => {
  const driver = await driverService.updateLocation(req.auth.id, req.body);
  res.json(driver);
});

exports.updateAvailability = asyncHandler(async (req, res) => {
  const driver = await driverService.updateAvailability(
    req.auth.id,
    Boolean(req.body.isOnline ?? req.body.isAvailable),
    req.app.get("io")
  );
  res.json(driver);
});

exports.submitVerification = asyncHandler(async (req, res) => {
  const driver = await driverService.submitVerification(req.auth.id, req.body);
  res.json(driver);
});

exports.updateFcmToken = asyncHandler(async (req, res) => {
  const driver = await driverService.updateFcmToken(req.auth.id, req.body.fcmToken);
  res.json(driver);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const driver = await driverService.updateProfile(req.auth.id, req.body);
  res.json(driver);
});

exports.finance = asyncHandler(async (req, res) => {
  res.json(await financeService.getSummary(req.auth.id, req.query.period || "day"));
});

exports.updateVehicle = asyncHandler(async (req, res) => {
  res.json(await financeService.updateVehicle(req.auth.id, req.body));
});

exports.expenses = asyncHandler(async (req, res) => {
  res.json(await financeService.listExpenses(req.auth.id, { limit: req.query.limit }));
});

exports.createExpense = asyncHandler(async (req, res) => {
  res.status(201).json(await financeService.createExpense(req.auth.id, req.body));
});

exports.updateExpense = asyncHandler(async (req, res) => {
  res.json(await financeService.updateExpense(req.auth.id, req.params.id, req.body));
});

exports.deleteExpense = asyncHandler(async (req, res) => {
  await financeService.deleteExpense(req.auth.id, req.params.id);
  res.status(204).end();
});
