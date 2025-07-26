const express = require('express');
const JobQueueController = require('../controllers/job-queue.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

// All job queue routes require admin access
router.use(authenticate);
router.use(requireAdmin);

// Job status and monitoring
router.get('/status', JobQueueController.getJobStatus);
router.get('/history', JobQueueController.getJobHistory);
router.get('/stats', JobQueueController.getSystemStats);
router.get('/health', JobQueueController.getHealthCheck);

// Job management
router.post('/:jobName/trigger', JobQueueController.triggerJob);
router.post('/:jobName/stop', JobQueueController.stopJob);
router.post('/:jobName/start', JobQueueController.startJob);

// System-wide operations
router.post('/restart-all', JobQueueController.restartAllJobs);
router.post('/stop-all', JobQueueController.stopAllJobs);

// One-time job queueing
router.post('/queue', JobQueueController.queueOneTimeJob);

module.exports = router;
