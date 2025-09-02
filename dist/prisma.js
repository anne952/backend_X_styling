"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrisma = void 0;
const client_1 = require("@prisma/client");
let prisma;
const getPrisma = () => {
    if (!prisma) {
        prisma = new client_1.PrismaClient();
    }
    return prisma;
};
exports.getPrisma = getPrisma;
exports.default = (0, exports.getPrisma)();
