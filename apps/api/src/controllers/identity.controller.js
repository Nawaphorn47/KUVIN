const asyncHandler = require("../utils/asyncHandler");
const identity = require("../services/identity.service");
const { DRIVER_TYPES, DOC_LABELS } = require("../utils/driverTypes");
const { REPORT_CATEGORIES } = require("../utils/reportCategories");

// บอกแอปว่าเปิดวิธีเข้าระบบแบบไหนอยู่ — แอปซ่อนปุ่มที่ใช้ไม่ได้แทนการให้ผู้ใช้กดแล้วเจอ error
exports.config = (req, res) => {
  res.json({
    otp: identity.otpMode(),
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    passengerVerification: process.env.PASSENGER_VERIFICATION !== "off",
    driverTypes: DRIVER_TYPES, // เอกสารที่คนขับแต่ละประเภทต้องแนบ (แอปใช้สร้างหน้าส่งเอกสาร)
    docLabels: DOC_LABELS,
    reportCategories: REPORT_CATEGORIES,
  });
};

exports.requestOtp = asyncHandler(async (req, res) => {
  res.json(await identity.requestOtp(req.body.phone));
});

exports.verifyOtp = asyncHandler(async (req, res) => {
  res.json(await identity.verifyOtp(req.body));
});

exports.completeSignup = asyncHandler(async (req, res) => {
  res.status(201).json(await identity.completeSignup(req.body));
});

exports.googleLogin = asyncHandler(async (req, res) => {
  res.json(await identity.googleLogin(req.body));
});

exports.switchToDriver = asyncHandler(async (req, res) => {
  res.json(await identity.switchToDriver(req.auth.id));
});

exports.switchToUser = asyncHandler(async (req, res) => {
  res.json(await identity.switchToUser(req.auth.id));
});

exports.becomeDriver = asyncHandler(async (req, res) => {
  res.status(201).json(await identity.becomeDriver(req.auth.id, req.body));
});

exports.verifyMyPhone = asyncHandler(async (req, res) => {
  res.json(await identity.verifyMyPhone(req.auth.id, req.body));
});

exports.uploadSelfie = asyncHandler(async (req, res) => {
  res.json(await identity.saveSelfie(req.auth.id, req.file));
});
