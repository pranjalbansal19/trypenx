import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer, { MulterError } from 'multer';
import { Prisma, PrismaClient, } from '@prisma/client';
const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 4000);
const apiBaseUrl = (process.env.PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : true;
const adminIpAllowlist = (process.env.ADMIN_IP_ALLOWLIST || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
const allowlistEnabled = adminIpAllowlist.length > 0;
app.set('trust proxy', true);
app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: '2mb' }));
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = new Set([
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/octet-stream',
        ]);
        if (!allowed.has(file.mimetype)) {
            cb(new Error('Unsupported file type. Please upload a PDF or DOC/DOCX.'));
            return;
        }
        cb(null, true);
    },
});
function toIso(date) {
    return date ? date.toISOString() : null;
}
function parseDateOnly(value) {
    if (!value)
        return null;
    return new Date(`${value}T00:00:00.000Z`);
}
function isNotFoundError(error) {
    return (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025');
}
function consentDownloadUrl(id) {
    return `${apiBaseUrl}/api/consents/${id}/download`;
}
function normalizeIp(ip) {
    return ip.replace('::ffff:', '').trim();
}
function extractIps(value) {
    if (!value)
        return [];
    if (Array.isArray(value)) {
        return value.flatMap((entry) => entry.split(',').map((item) => normalizeIp(item)));
    }
    return value.split(',').map((item) => normalizeIp(item));
}
function getRequestIps(req) {
    const forwardedFor = extractIps(req.headers['x-forwarded-for']);
    const realIp = extractIps(req.headers['x-real-ip']);
    const cfConnectingIp = extractIps(req.headers['cf-connecting-ip']);
    const trueClientIp = extractIps(req.headers['true-client-ip']);
    const socketIp = req.socket?.remoteAddress
        ? [normalizeIp(req.socket.remoteAddress)]
        : [];
    const expressIp = req.ip ? [normalizeIp(req.ip)] : [];
    return Array.from(new Set([...forwardedFor, ...realIp, ...cfConnectingIp, ...trueClientIp, ...expressIp, ...socketIp].filter(Boolean)));
}
app.use('/api', (req, res, next) => {
    if (!allowlistEnabled) {
        next();
        return;
    }
    const ips = getRequestIps(req);
    const allowed = ips.some((ip) => adminIpAllowlist.includes(ip));
    if (allowed) {
        next();
        return;
    }
    res.status(403).json({ error: 'Forbidden' });
});
function serializeTestRun(run) {
    return {
        id: run.id,
        customerId: run.customerId,
        scopeIds: run.scopes.map((scope) => scope.scopeId),
        startTime: toIso(run.startTime),
        endTime: toIso(run.endTime),
        scheduledTime: run.scheduledTime.toISOString(),
        status: run.status,
        engineOutputReference: run.engineOutputReference,
        reportId: run.report?.id ?? null,
        errorMessage: run.errorMessage,
        createdAt: run.createdAt.toISOString(),
    };
}
app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});
// Customers
app.get('/api/customers', async (_req, res) => {
    const customers = await prisma.customer.findMany({
        orderBy: { createdAt: 'desc' },
    });
    res.json(customers.map((customer) => ({
        ...customer,
        contractStartDate: customer.contractStartDate.toISOString(),
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
    })));
});
app.get('/api/customers/:id', async (req, res) => {
    const customer = await prisma.customer.findUnique({
        where: { id: req.params.id },
    });
    if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
    }
    res.json({
        ...customer,
        contractStartDate: customer.contractStartDate.toISOString(),
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
    });
});
app.post('/api/customers', async (req, res) => {
    const { companyName, contractType, contractStartDate, contractLengthMonths, status, } = req.body;
    if (!companyName ||
        !contractType ||
        !contractStartDate ||
        contractLengthMonths === undefined ||
        !status) {
        res.status(400).json({ error: 'Missing required customer fields' });
        return;
    }
    const created = await prisma.customer.create({
        data: {
            companyName: String(companyName),
            contractType: contractType,
            contractStartDate: parseDateOnly(String(contractStartDate)),
            contractLengthMonths: Number(contractLengthMonths),
            status: status,
        },
    });
    res.status(201).json({
        ...created,
        contractStartDate: created.contractStartDate.toISOString(),
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
    });
});
app.put('/api/customers/:id', async (req, res) => {
    const { companyName, contractType, contractStartDate, contractLengthMonths, status, } = req.body;
    const data = {};
    if (companyName !== undefined)
        data.companyName = String(companyName);
    if (contractType !== undefined)
        if (contractType !== undefined)
            data.contractType = contractType;
    if (contractStartDate !== undefined) {
        const parsedDate = parseDateOnly(String(contractStartDate));
        if (parsedDate !== null)
            data.contractStartDate = parsedDate;
    }
    if (contractLengthMonths !== undefined)
        data.contractLengthMonths = Number(contractLengthMonths);
    if (status !== undefined)
        data.status = status;
    try {
        const updated = await prisma.customer.update({
            where: { id: req.params.id },
            data,
        });
        res.json({
            ...updated,
            contractStartDate: updated.contractStartDate.toISOString(),
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        });
    }
    catch (error) {
        if (isNotFoundError(error)) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        throw error;
    }
});
app.delete('/api/customers/:id', async (req, res) => {
    try {
        await prisma.customer.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (error) {
        if (isNotFoundError(error)) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        throw error;
    }
});
// Customer Notes
app.get('/api/customers/:id/notes', async (req, res) => {
    const notes = await prisma.customerNote.findMany({
        where: { customerId: req.params.id },
        orderBy: { createdAt: 'desc' },
    });
    res.json(notes.map((note) => ({
        ...note,
        createdAt: note.createdAt.toISOString(),
    })));
});
app.post('/api/customers/:id/notes', async (req, res) => {
    const { content } = req.body;
    if (!content) {
        res.status(400).json({ error: 'Note content is required' });
        return;
    }
    const note = await prisma.customerNote.create({
        data: { customerId: req.params.id, content: String(content) },
    });
    res.status(201).json({ ...note, createdAt: note.createdAt.toISOString() });
});
app.delete('/api/notes/:id', async (req, res) => {
    try {
        await prisma.customerNote.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (error) {
        if (isNotFoundError(error)) {
            res.status(404).json({ error: 'Note not found' });
            return;
        }
        throw error;
    }
});
// Scopes
app.get('/api/customers/:id/scopes', async (req, res) => {
    const scopes = await prisma.scope.findMany({
        where: { customerId: req.params.id },
        orderBy: { createdAt: 'desc' },
    });
    res.json(scopes.map((scope) => ({
        ...scope,
        createdAt: scope.createdAt.toISOString(),
    })));
});
app.post('/api/scopes', async (req, res) => {
    const { customerId, type, value, notes, active } = req.body;
    if (!customerId || !type || !value) {
        res.status(400).json({ error: 'Missing scope fields' });
        return;
    }
    const scope = await prisma.scope.create({
        data: {
            customerId: String(customerId),
            type: type,
            value: String(value),
            notes: notes ? String(notes) : null,
            active: active === undefined ? true : Boolean(active),
        },
    });
    res.status(201).json({ ...scope, createdAt: scope.createdAt.toISOString() });
});
app.put('/api/scopes/:id', async (req, res) => {
    const { type, value, notes, active } = req.body;
    const data = {};
    if (type !== undefined)
        data.type = type;
    if (value !== undefined)
        data.value = String(value);
    if (notes !== undefined)
        data.notes = notes ? String(notes) : null;
    if (active !== undefined)
        data.active = Boolean(active);
    try {
        const scope = await prisma.scope.update({
            where: { id: req.params.id },
            data,
        });
        res.json({ ...scope, createdAt: scope.createdAt.toISOString() });
    }
    catch (error) {
        if (isNotFoundError(error)) {
            res.status(404).json({ error: 'Scope not found' });
            return;
        }
        throw error;
    }
});
app.delete('/api/scopes/:id', async (req, res) => {
    try {
        await prisma.scope.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (error) {
        if (isNotFoundError(error)) {
            res.status(404).json({ error: 'Scope not found' });
            return;
        }
        throw error;
    }
});
// Test Configuration
app.get('/api/customers/:id/test-config', async (req, res) => {
    const config = await prisma.testConfiguration.findUnique({
        where: { customerId: req.params.id },
    });
    if (!config) {
        res.json(null);
        return;
    }
    res.json({
        ...config,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
    });
});
app.post('/api/customers/:id/test-config', async (req, res) => {
    const { testType, frequency, cronExpression, preferredRunWindow, enabled, } = req.body;
    if (!testType || !frequency || !preferredRunWindow) {
        res.status(400).json({ error: 'Missing test configuration fields' });
        return;
    }
    const config = await prisma.testConfiguration.upsert({
        where: { customerId: req.params.id },
        create: {
            customerId: req.params.id,
            testType: testType,
            frequency: frequency,
            cronExpression: cronExpression ? String(cronExpression) : null,
            preferredRunWindow: preferredRunWindow,
            enabled: enabled === undefined ? true : Boolean(enabled),
        },
        update: {
            testType: testType,
            frequency: frequency,
            cronExpression: cronExpression ? String(cronExpression) : null,
            preferredRunWindow: preferredRunWindow,
            enabled: enabled === undefined ? true : Boolean(enabled),
        },
    });
    res.json({
        ...config,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
    });
});
app.put('/api/test-config/:id', async (req, res) => {
    const { testType, frequency, cronExpression, preferredRunWindow, enabled, } = req.body;
    const data = {};
    if (testType !== undefined)
        data.testType = testType;
    if (frequency !== undefined)
        data.frequency = frequency;
    if (cronExpression !== undefined)
        data.cronExpression = cronExpression ? String(cronExpression) : null;
    if (preferredRunWindow !== undefined)
        data.preferredRunWindow = preferredRunWindow;
    if (enabled !== undefined)
        data.enabled = Boolean(enabled);
    try {
        const config = await prisma.testConfiguration.update({
            where: { id: req.params.id },
            data,
        });
        res.json({
            ...config,
            createdAt: config.createdAt.toISOString(),
            updatedAt: config.updatedAt.toISOString(),
        });
    }
    catch (error) {
        if (isNotFoundError(error)) {
            res.status(404).json({ error: 'Test configuration not found' });
            return;
        }
        throw error;
    }
});
// Test Runs
app.get('/api/customers/:id/test-runs', async (req, res) => {
    const runs = await prisma.testRun.findMany({
        where: { customerId: req.params.id },
        include: {
            scopes: { select: { scopeId: true } },
            report: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json(runs.map(serializeTestRun));
});
app.get('/api/test-runs', async (_req, res) => {
    const runs = await prisma.testRun.findMany({
        include: {
            scopes: { select: { scopeId: true } },
            report: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json(runs.map(serializeTestRun));
});
app.post('/api/test-runs', async (req, res) => {
    const { customerId, scopeIds, startTime, endTime, scheduledTime, status, engineOutputReference, errorMessage, } = req.body;
    if (!customerId || !scheduledTime || !status) {
        res.status(400).json({ error: 'Missing test run fields' });
        return;
    }
    const run = await prisma.testRun.create({
        data: {
            customerId: String(customerId),
            startTime: startTime ? new Date(String(startTime)) : null,
            endTime: endTime ? new Date(String(endTime)) : null,
            scheduledTime: new Date(String(scheduledTime)),
            status: status,
            engineOutputReference: engineOutputReference
                ? String(engineOutputReference)
                : null,
            errorMessage: errorMessage ? String(errorMessage) : null,
            scopes: Array.isArray(scopeIds)
                ? {
                    create: scopeIds.map((scopeId) => ({
                        scopeId: String(scopeId),
                    })),
                }
                : undefined,
        },
        include: {
            scopes: { select: { scopeId: true } },
            report: { select: { id: true } },
        },
    });
    res.status(201).json(serializeTestRun(run));
});
app.put('/api/test-runs/:id', async (req, res) => {
    const { scopeIds, startTime, endTime, scheduledTime, status, engineOutputReference, errorMessage, } = req.body;
    const data = {};
    if (startTime !== undefined)
        data.startTime = startTime ? new Date(String(startTime)) : undefined;
    if (endTime !== undefined)
        data.endTime = endTime ? new Date(String(endTime)) : undefined;
    if (scheduledTime !== undefined)
        data.scheduledTime = new Date(String(scheduledTime));
    if (status !== undefined)
        data.status = status;
    if (engineOutputReference !== undefined)
        data.engineOutputReference = engineOutputReference
            ? String(engineOutputReference)
            : null;
    if (errorMessage !== undefined)
        data.errorMessage = errorMessage ? String(errorMessage) : null;
    if (Array.isArray(scopeIds)) {
        data.scopes = {
            deleteMany: {},
            create: scopeIds.map((scopeId) => ({ scopeId: String(scopeId) })),
        };
    }
    try {
        const run = await prisma.testRun.update({
            where: { id: req.params.id },
            data,
            include: {
                scopes: { select: { scopeId: true } },
                report: { select: { id: true } },
            },
        });
        res.json(serializeTestRun(run));
    }
    catch (error) {
        if (isNotFoundError(error)) {
            res.status(404).json({ error: 'Test run not found' });
            return;
        }
        throw error;
    }
});
// Reports
app.get('/api/customers/:id/reports', async (req, res) => {
    const reports = await prisma.report.findMany({
        where: { customerId: req.params.id },
        orderBy: { createdAt: 'desc' },
    });
    res.json(reports.map((report) => ({
        ...report,
        generatedTimestamp: report.generatedTimestamp.toISOString(),
        createdAt: report.createdAt.toISOString(),
    })));
});
app.get('/api/reports', async (_req, res) => {
    const reports = await prisma.report.findMany({
        orderBy: { createdAt: 'desc' },
    });
    res.json(reports.map((report) => ({
        ...report,
        generatedTimestamp: report.generatedTimestamp.toISOString(),
        createdAt: report.createdAt.toISOString(),
    })));
});
app.get('/api/reports/:id', async (req, res) => {
    const report = await prisma.report.findUnique({
        where: { id: req.params.id },
    });
    if (!report) {
        res.status(404).json({ error: 'Report not found' });
        return;
    }
    res.json({
        ...report,
        generatedTimestamp: report.generatedTimestamp.toISOString(),
        createdAt: report.createdAt.toISOString(),
    });
});
app.post('/api/reports', async (req, res) => {
    const { runId, customerId, severitySummary, reportFile, rawDataFile, generatedTimestamp, sentToCustomer, notes, status, } = req.body;
    if (!runId ||
        !customerId ||
        !severitySummary ||
        !reportFile ||
        !rawDataFile ||
        !generatedTimestamp ||
        !status) {
        res.status(400).json({ error: 'Missing report fields' });
        return;
    }
    const report = await prisma.report.create({
        data: {
            runId: String(runId),
            customerId: String(customerId),
            severitySummary: severitySummary,
            reportFile: String(reportFile),
            rawDataFile: String(rawDataFile),
            generatedTimestamp: new Date(String(generatedTimestamp)),
            sentToCustomer: Boolean(sentToCustomer),
            notes: notes ? String(notes) : null,
            status: status,
        },
    });
    res.status(201).json({
        ...report,
        generatedTimestamp: report.generatedTimestamp.toISOString(),
        createdAt: report.createdAt.toISOString(),
    });
});
app.put('/api/reports/:id', async (req, res) => {
    const { severitySummary, reportFile, rawDataFile, generatedTimestamp, sentToCustomer, notes, status, } = req.body;
    const data = {};
    if (severitySummary !== undefined)
        data.severitySummary = severitySummary;
    if (reportFile !== undefined)
        data.reportFile = String(reportFile);
    if (rawDataFile !== undefined)
        data.rawDataFile = String(rawDataFile);
    if (generatedTimestamp !== undefined)
        data.generatedTimestamp = new Date(String(generatedTimestamp));
    if (sentToCustomer !== undefined)
        data.sentToCustomer = Boolean(sentToCustomer);
    if (notes !== undefined)
        data.notes = notes ? String(notes) : null;
    if (status !== undefined)
        data.status = status;
    try {
        const report = await prisma.report.update({
            where: { id: req.params.id },
            data,
        });
        res.json({
            ...report,
            generatedTimestamp: report.generatedTimestamp.toISOString(),
            createdAt: report.createdAt.toISOString(),
        });
    }
    catch (error) {
        if (isNotFoundError(error)) {
            res.status(404).json({ error: 'Report not found' });
            return;
        }
        throw error;
    }
});
// Consents
app.get('/api/customers/:id/consents', async (req, res) => {
    const consents = await prisma.customerConsent.findMany({
        where: { customerId: req.params.id },
        orderBy: { uploadedAt: 'desc' },
    });
    res.json(consents.map((consent) => ({
        id: consent.id,
        customerId: consent.customerId,
        fileName: consent.fileName,
        agreedAt: consent.agreedAt.toISOString(),
        uploadedAt: consent.uploadedAt.toISOString(),
        fileSize: consent.fileSize,
        fileMimeType: consent.fileMimeType,
        downloadUrl: consentDownloadUrl(consent.id),
    })));
});
app.post('/api/customers/:id/consents', upload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file) {
        res.status(400).json({ error: 'Consent file is required' });
        return;
    }
    const agreedAt = parseDateOnly(typeof req.body.agreedAt === 'string' ? req.body.agreedAt : undefined);
    // Copy buffer into a new Uint8Array so Prisma's Bytes (ArrayBuffer) type is satisfied
    const fileData = new Uint8Array(file.size);
    fileData.set(file.buffer);
    const consent = await prisma.customerConsent.create({
        data: {
            customerId: req.params.id,
            fileName: file.originalname,
            fileMimeType: file.mimetype,
            fileSize: file.size,
            fileData,
            agreedAt: agreedAt ?? new Date(),
        },
    });
    res.status(201).json({
        id: consent.id,
        customerId: consent.customerId,
        fileName: consent.fileName,
        agreedAt: consent.agreedAt.toISOString(),
        uploadedAt: consent.uploadedAt.toISOString(),
        fileSize: consent.fileSize,
        fileMimeType: consent.fileMimeType,
        downloadUrl: consentDownloadUrl(consent.id),
    });
});
app.get('/api/consents/:id/download', async (req, res) => {
    const consent = await prisma.customerConsent.findUnique({
        where: { id: req.params.id },
    });
    if (!consent) {
        res.status(404).json({ error: 'Consent not found' });
        return;
    }
    res.setHeader('Content-Type', consent.fileMimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(consent.fileName)}"`);
    res.send(consent.fileData);
});
app.delete('/api/consents/:id', async (req, res) => {
    try {
        await prisma.customerConsent.delete({ where: { id: req.params.id } });
        res.status(204).send();
    }
    catch (error) {
        if (isNotFoundError(error)) {
            res.status(404).json({ error: 'Consent not found' });
            return;
        }
        throw error;
    }
});
app.use((error, _req, res, _next) => {
    if (error instanceof MulterError) {
        res.status(400).json({ error: error.message });
        return;
    }
    if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.status(500).json({ error: 'Unexpected server error' });
});
app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`);
});
