const { PrismaClient } = require("@prisma/client");

// singleton — avoids exhausting DB connections from nodemon hot-reloads
const prisma = global.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__prisma = prisma;

module.exports = prisma;
