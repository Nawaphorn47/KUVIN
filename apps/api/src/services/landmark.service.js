const prisma = require("../config/prisma");

async function listLandmarks({ popularOnly = false, query } = {}) {
  return prisma.landmark.findMany({
    where: {
      ...(popularOnly ? { isPopular: true } : {}),
      ...(query
        ? { OR: [{ name: { contains: query } }, { detail: { contains: query } }] }
        : {}),
    },
    orderBy: { name: "asc" },
  });
}

module.exports = { listLandmarks };
