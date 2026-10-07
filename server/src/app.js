import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  SESSION_COOKIE,
  activeAdminCount,
  createSession,
  deleteSession,
  findSessionUser,
  findUserForLogin,
  hashPassword,
  insertUser,
  listUsers,
  updatePassword,
  updateUserActive,
  userCount,
  verifyPassword,
} from './auth.js';
import {
  createExpenditure,
  createFeed,
  createPurchase,
  createRoom,
  createRoomAssignment,
  createSale,
  createShedConstruction,
  createTreatment,
  createWeight,
  deleteExpenditure,
  deleteFeed,
  deletePurchase,
  deleteRoom,
  deleteRoomAssignment,
  deleteSale,
  deleteShedConstruction,
  deleteTreatment,
  deleteWeight,
  getDashboard,
  listExpenditures,
  listFeeds,
  listInventory,
  listPurchases,
  listRoomAssignments,
  listRooms,
  listSales,
  listShedConstructions,
  listTreatments,
  listWeights,
  moveRoomAssignment,
  updateRoom,
  updateWeight,
} from './db.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return ['', ''];
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try {
      return [key, decodeURIComponent(value)];
    } catch {
      return [key, ''];
    }
  }).filter(([key]) => key));
}

function sessionToken(request) {
  return parseCookies(request.headers.cookie)[SESSION_COOKIE] || '';
}

function setSessionCookie(response, session) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(session.expiresAt).toUTCString()}${secure}`,
  );
}

function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  );
}

async function requireAuthentication(request, response, next) {
  try {
    const user = await findSessionUser(sessionToken(request));
    if (!user) {
      response.status(401).json({ message: 'Authentication required.' });
      return;
    }
    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(request, response, next) {
  if (request.user?.role !== 'admin') {
    response.status(403).json({ message: 'Administrator access is required.' });
    return;
  }
  next();
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw httpError(400, 'A valid record ID is required.');
  }
  return id;
}

function requiredText(value, label, maxLength = 100) {
  if (typeof value !== 'string' || !value.trim()) {
    throw httpError(400, `${label} is required.`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw httpError(400, `${label} must be ${maxLength} characters or fewer.`);
  }
  return text;
}

function optionalText(value, label, maxLength = 500) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') {
    throw httpError(400, `${label} must be text.`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw httpError(400, `${label} must be ${maxLength} characters or fewer.`);
  }
  return text;
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw httpError(400, `${label} must be a whole number greater than zero.`);
  }
  return number;
}

function nonNegativeInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw httpError(400, `${label} must be a whole number of zero or greater.`);
  }
  return number;
}

function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw httpError(400, `${label} must be greater than zero.`);
  }
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function measurementType(value) {
  if (value !== 'weekly' && value !== 'monthly') {
    throw httpError(400, 'Measurement type must be weekly or monthly.');
  }
  return value;
}

function feedSlot(value) {
  if (value !== 'morning' && value !== 'afternoon' && value !== 'evening') {
    throw httpError(400, 'Meal slot must be morning, afternoon, or evening.');
  }
  return value;
}

function isoTime(value, label) {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw httpError(400, `${label} must be a valid 24-hour time.`);
  }
  return value;
}

function nonNegativeMoney(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw httpError(400, `${label} must be zero or greater.`);
  }
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function isoDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw httpError(400, `${label} must be a valid date.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw httpError(400, `${label} must be a valid date.`);
  }
  return value;
}

function optionalIsoDate(value, label) {
  if (value == null || value === '') return '';
  return isoDate(value, label);
}

function parsePurchase(body = {}) {
  return {
    purchaseDate: isoDate(body.purchaseDate, 'Purchase date'),
    supplier: requiredText(body.supplier, 'Supplier'),
    species: requiredText(body.species, 'Species', 60),
    breed: optionalText(body.breed, 'Breed', 60),
    quantity: positiveInteger(body.quantity, 'Quantity'),
    unitCost: nonNegativeMoney(body.unitCost, 'Unit cost'),
    transportCost: nonNegativeMoney(body.transportCost ?? 0, 'Transport cost'),
    notes: optionalText(body.notes, 'Notes'),
  };
}

function parseSale(body = {}) {
  return {
    saleDate: isoDate(body.saleDate, 'Sale date'),
    customer: requiredText(body.customer, 'Customer'),
    purchaseId: parseId(body.purchaseId),
    quantity: positiveInteger(body.quantity, 'Quantity'),
    unitPrice: nonNegativeMoney(body.unitPrice, 'Unit price'),
    notes: optionalText(body.notes, 'Notes'),
  };
}

function parseWeight(body = {}) {
  return {
    weightDate: isoDate(body.weightDate, 'Weight date'),
    purchaseId: parseId(body.purchaseId),
    animalTag: requiredText(body.animalTag, 'Animal ID / tag', 60),
    measurementType: measurementType(body.measurementType),
    weightKg: positiveNumber(body.weightKg, 'Weight'),
    notes: optionalText(body.notes, 'Notes'),
  };
}

function parseTreatment(body = {}) {
  const treatmentDate = isoDate(body.treatmentDate, 'Treatment date');
  const followUpDate = optionalIsoDate(body.followUpDate, 'Follow-up date');
  if (followUpDate && followUpDate < treatmentDate) {
    throw httpError(400, 'Follow-up date must be on or after treatment date.');
  }

  return {
    treatmentDate,
    purchaseId: parseId(body.purchaseId),
    animalTag: requiredText(body.animalTag, 'Animal ID / tag', 60),
    treatmentDescription: requiredText(body.treatmentDescription, 'Treatment description', 500),
    medicine: optionalText(body.medicine, 'Medicine', 100),
    dosage: optionalText(body.dosage, 'Dosage', 100),
    veterinarian: optionalText(body.veterinarian, 'Veterinarian', 100),
    treatmentCost: nonNegativeMoney(body.treatmentCost ?? 0, 'Treatment cost'),
    followUpDate,
    notes: optionalText(body.notes, 'Notes'),
  };
}

function parseFeed(body = {}) {
  return {
    feedDate: isoDate(body.feedDate, 'Feed date'),
    feedTime: isoTime(body.feedTime, 'Feed time'),
    purchaseId: parseId(body.purchaseId),
    slot: feedSlot(body.slot),
    basketCount: positiveInteger(body.basketCount, 'Basket count'),
    feedDescription: optionalText(body.feedDescription, 'Feed description', 500),
    notes: optionalText(body.notes, 'Notes'),
  };
}

function parseRoom(body = {}) {
  return {
    name: requiredText(body.name, 'Room name', 100),
    capacity: nonNegativeInteger(body.capacity ?? 0, 'Room capacity'),
    description: optionalText(body.description, 'Room description', 500),
  };
}

function parseRoomAssignment(body = {}) {
  return {
    roomId: parseId(body.roomId),
    purchaseId: parseId(body.purchaseId),
    animalTag: requiredText(body.animalTag, 'Animal ID / tag', 60),
    notes: optionalText(body.notes, 'Notes', 500),
  };
}

function parseExpenditure(body = {}) {
  return {
    expenditureDate: isoDate(body.expenditureDate, 'Expenditure date'),
    purpose: requiredText(body.purpose, 'Purpose', 100),
    paidTo: requiredText(body.paidTo, 'Paid to', 100),
    amount: positiveNumber(body.amount, 'Amount'),
    remarks: optionalText(body.remarks, 'Remarks', 500),
  };
}

const SHED_CONSTRUCTION_CATEGORIES = [
  'Materials',
  'Labor',
  'Roofing',
  'Flooring',
  'Electrical',
  'Plumbing & Water',
  'Fencing',
  'Equipment & Fittings',
  'Transport',
  'Other',
];

function shedConstructionCategory(value) {
  if (typeof value !== 'string' || !SHED_CONSTRUCTION_CATEGORIES.includes(value)) {
    throw httpError(400, 'A valid construction category is required.');
  }
  return value;
}

function parseShedConstruction(body = {}) {
  return {
    constructionDate: isoDate(body.constructionDate, 'Construction date'),
    shedName: optionalText(body.shedName, 'Shed name', 100),
    category: shedConstructionCategory(body.category),
    paidTo: requiredText(body.paidTo, 'Paid to', 100),
    amount: positiveNumber(body.amount, 'Amount'),
    remarks: optionalText(body.remarks, 'Remarks', 500),
  };
}

function username(value) {
  const result = requiredText(value, 'Username', 60);
  if (!/^[A-Za-z0-9._-]{3,60}$/.test(result)) {
    throw httpError(400, 'Username must be 3-60 characters using letters, numbers, dot, underscore, or hyphen.');
  }
  return result;
}

function password(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128) {
    throw httpError(400, 'Password must be between 10 and 128 characters.');
  }
  return value;
}

function userRole(value) {
  if (value !== 'admin' && value !== 'staff') {
    throw httpError(400, 'Role must be admin or staff.');
  }
  return value;
}

function parseUser(body = {}, defaultRole = 'staff') {
  return {
    username: username(body.username),
    displayName: requiredText(body.displayName, 'Display name', 100),
    password: password(body.password),
    role: userRole(body.role ?? defaultRole),
  };
}

app.get('/api/auth/status', async (_request, response) => {
  response.json({ setupRequired: (await userCount()) === 0 });
});

app.post('/api/auth/setup', async (request, response) => {
  if ((await userCount()) !== 0) throw httpError(409, 'Initial administrator setup is already complete.');
  const input = parseUser({ ...request.body, role: 'admin' }, 'admin');
  const passwordHash = await hashPassword(input.password);
  const user = await insertUser({ ...input, passwordHash, role: 'admin' });
  const session = await createSession(user.id);
  setSessionCookie(response, session);
  response.status(201).json({ user });
});

app.post('/api/auth/login', async (request, response) => {
  const loginUsername = username(request.body?.username);
  const loginPassword = typeof request.body?.password === 'string' ? request.body.password : '';
  const userRecord = await findUserForLogin(loginUsername);
  const validPassword = userRecord
    ? await verifyPassword(loginPassword, userRecord.passwordHash)
    : false;
  if (!userRecord || !userRecord.isActive || !validPassword) {
    throw httpError(401, 'Invalid username or password.');
  }
  const session = await createSession(userRecord.id);
  setSessionCookie(response, session);
  response.json({
    user: {
      id: userRecord.id,
      username: userRecord.username,
      displayName: userRecord.displayName,
      role: userRecord.role,
      isActive: true,
      createdAt: userRecord.createdAt,
      updatedAt: userRecord.updatedAt,
    },
  });
});

app.post('/api/auth/logout', async (request, response) => {
  await deleteSession(sessionToken(request));
  clearSessionCookie(response);
  response.status(204).end();
});

app.get('/api/auth/me', requireAuthentication, (request, response) => {
  response.json({ user: request.user });
});

app.use('/api', requireAuthentication);

app.get('/api/users', requireAdmin, async (_request, response) => {
  response.json(await listUsers());
});

app.post('/api/users', requireAdmin, async (request, response) => {
  const input = parseUser(request.body);
  const passwordHash = await hashPassword(input.password);
  const user = await insertUser({ ...input, passwordHash });
  response.status(201).json(user);
});

app.patch('/api/users/:id/active', requireAdmin, async (request, response) => {
  const userId = parseId(request.params.id);
  if (typeof request.body?.isActive !== 'boolean') {
    throw httpError(400, 'Active status must be true or false.');
  }
  if (userId === request.user.id && !request.body.isActive) {
    throw httpError(409, 'You cannot deactivate your own account.');
  }
  const target = (await listUsers()).find((user) => user.id === userId);
  if (!target) throw httpError(404, 'User not found.');
  if (target.role === 'admin' && target.isActive && !request.body.isActive && (await activeAdminCount()) <= 1) {
    throw httpError(409, 'At least one active administrator is required.');
  }
  response.json(await updateUserActive(userId, request.body.isActive));
});

app.patch('/api/users/:id/password', requireAdmin, async (request, response) => {
  const userId = parseId(request.params.id);
  const newPassword = password(request.body?.password);
  const target = (await listUsers()).find((user) => user.id === userId);
  if (!target) throw httpError(404, 'User not found.');
  const passwordHash = await hashPassword(newPassword);
  const user = await updatePassword(userId, passwordHash);
  response.json(user);
});

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/dashboard', async (_request, response) => {
  response.json(await getDashboard());
});

app.get('/api/purchases', async (_request, response) => {
  response.json(await listPurchases());
});

app.post('/api/purchases', requireAdmin, async (request, response) => {
  const purchase = await createPurchase(parsePurchase(request.body));
  response.status(201).json(purchase);
});

app.delete('/api/purchases/:id', requireAdmin, async (request, response) => {
  const result = await deletePurchase(parseId(request.params.id));

  if (result.hasSales) {
    throw httpError(409, 'This purchase cannot be deleted because sales are linked to it.');
  }
  if (result.hasTreatments) {
    throw httpError(409, 'This purchase cannot be deleted because treatment history is linked to it.');
  }
  if (result.hasFeeds) {
    throw httpError(409, 'This purchase cannot be deleted because feed history is linked to it.');
  }
  if (result.hasRoomAssignments) {
    throw httpError(409, 'This purchase cannot be deleted while animals are assigned to rooms.');
  }
  if (!result.deleted) {
    throw httpError(404, 'Purchase not found.');
  }

  response.status(204).end();
});

app.get('/api/inventory', async (_request, response) => {
  response.json(await listInventory());
});

app.get('/api/sales', async (_request, response) => {
  response.json(await listSales());
});

app.post('/api/sales', requireAdmin, async (request, response) => {
  const sale = await createSale(parseSale(request.body));
  response.status(201).json(sale);
});

app.delete('/api/sales/:id', requireAdmin, async (request, response) => {
  const deleted = await deleteSale(parseId(request.params.id));
  if (!deleted) {
    throw httpError(404, 'Sale not found.');
  }
  response.status(204).end();
});

app.get('/api/weights', async (_request, response) => {
  response.json(await listWeights());
});

app.post('/api/weights', requireAdmin, async (request, response) => {
  const weight = await createWeight(parseWeight(request.body));
  response.status(201).json(weight);
});

app.patch('/api/weights/:id', requireAdmin, async (request, response) => {
  const weight = await updateWeight(
    parseId(request.params.id),
    parseWeight(request.body),
  );
  response.json(weight);
});

app.delete('/api/weights/:id', requireAdmin, async (request, response) => {
  const deleted = await deleteWeight(parseId(request.params.id));
  if (!deleted) {
    throw httpError(404, 'Weight entry not found.');
  }
  response.status(204).end();
});

app.get('/api/treatments', async (_request, response) => {
  response.json(await listTreatments());
});

app.post('/api/treatments', requireAdmin, async (request, response) => {
  const treatment = await createTreatment(parseTreatment(request.body));
  response.status(201).json(treatment);
});

app.delete('/api/treatments/:id', requireAdmin, async (request, response) => {
  const deleted = await deleteTreatment(parseId(request.params.id));
  if (!deleted) {
    throw httpError(404, 'Treatment record not found.');
  }
  response.status(204).end();
});

app.get('/api/feeds', async (_request, response) => {
  response.json(await listFeeds());
});

app.post('/api/feeds', requireAdmin, async (request, response) => {
  const feed = await createFeed(parseFeed(request.body));
  response.status(201).json(feed);
});

app.delete('/api/feeds/:id', requireAdmin, async (request, response) => {
  const deleted = await deleteFeed(parseId(request.params.id));
  if (!deleted) {
    throw httpError(404, 'Feed entry not found.');
  }
  response.status(204).end();
});

app.get('/api/rooms', async (_request, response) => {
  response.json(await listRooms());
});

app.post('/api/rooms', requireAdmin, async (request, response) => {
  const room = await createRoom(parseRoom(request.body));
  response.status(201).json(room);
});

app.patch('/api/rooms/:id', requireAdmin, async (request, response) => {
  const room = await updateRoom(
    parseId(request.params.id),
    parseRoom(request.body),
  );
  response.json(room);
});

app.delete('/api/rooms/:id', requireAdmin, async (request, response) => {
  const result = await deleteRoom(parseId(request.params.id));
  if (result.hasAssignments) {
    throw httpError(409, 'This room cannot be deleted while animals are assigned to it.');
  }
  if (!result.deleted) {
    throw httpError(404, 'Room not found.');
  }
  response.status(204).end();
});

app.get('/api/room-assignments', async (_request, response) => {
  response.json(await listRoomAssignments());
});

app.post('/api/room-assignments', requireAdmin, async (request, response) => {
  const assignment = await createRoomAssignment(parseRoomAssignment(request.body));
  response.status(201).json(assignment);
});

app.patch('/api/room-assignments/:id', requireAdmin, async (request, response) => {
  const assignment = await moveRoomAssignment(
    parseId(request.params.id),
    parseId(request.body?.roomId),
  );
  response.json(assignment);
});

app.delete('/api/room-assignments/:id', requireAdmin, async (request, response) => {
  const deleted = await deleteRoomAssignment(parseId(request.params.id));
  if (!deleted) {
    throw httpError(404, 'Room assignment not found.');
  }
  response.status(204).end();
});

app.get('/api/expenditures', async (_request, response) => {
  response.json(await listExpenditures());
});

app.post('/api/expenditures', requireAdmin, async (request, response) => {
  const expenditure = await createExpenditure(parseExpenditure(request.body));
  response.status(201).json(expenditure);
});

app.delete('/api/expenditures/:id', requireAdmin, async (request, response) => {
  const deleted = await deleteExpenditure(parseId(request.params.id));
  if (!deleted) {
    throw httpError(404, 'Expenditure not found.');
  }
  response.status(204).end();
});

app.get('/api/shed-constructions/categories', (_request, response) => {
  response.json(SHED_CONSTRUCTION_CATEGORIES);
});

app.get('/api/shed-constructions', async (_request, response) => {
  response.json(await listShedConstructions());
});

app.post('/api/shed-constructions', requireAdmin, async (request, response) => {
  const entry = await createShedConstruction(parseShedConstruction(request.body));
  response.status(201).json(entry);
});

app.delete('/api/shed-constructions/:id', requireAdmin, async (request, response) => {
  const deleted = await deleteShedConstruction(parseId(request.params.id));
  if (!deleted) {
    throw httpError(404, 'Shed construction expenditure not found.');
  }
  response.status(204).end();
});

app.use('/api', (_request, response) => {
  response.status(404).json({ message: 'API route not found.' });
});

const clientDistPath = fileURLToPath(new URL('../../client/dist/', import.meta.url));
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((request, response, next) => {
    if (request.method === 'GET' && request.accepts('html')) {
      response.sendFile('index.html', { root: clientDistPath });
      return;
    }
    next();
  });
}

app.use((error, _request, response, _next) => {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  response.status(status).json({
    message: status >= 500 ? 'An unexpected server error occurred.' : error.message,
  });
});
