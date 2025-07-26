const jobQueueService = require('../services/job-queue.service');
const EventLogger = require('../services/event-logger.service');

class JobQueueController {
  constructor() {
    this.eventLogger = new EventLogger();
  }

  // GET /api/jobs/status
  static async getJobStatus(req, res) {
    try {
      const { jobName } = req.query;

      const status = jobQueueService.getJobStatus(jobName);

      if (jobName && !status) {
        return res.status(404).json({
          success: false,
          message: `Job '${jobName}' not found`
        });
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Get job status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get job status'
      });
    }
  }

  // GET /api/jobs/history
  static async getJobHistory(req, res) {
    try {
      const { limit = 50 } = req.query;

      const history = jobQueueService.getJobHistory(parseInt(limit));

      res.json({
        success: true,
        data: history,
        pagination: {
          limit: parseInt(limit),
          total: history.length
        }
      });
    } catch (error) {
      console.error('Get job history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get job history'
      });
    }
  }

  // GET /api/jobs/stats
  static async getSystemStats(req, res) {
    try {
      const stats = jobQueueService.getSystemStats();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get system stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system statistics'
      });
    }
  }

  // POST /api/jobs/:jobName/trigger
  static async triggerJob(req, res) {
    try {
      const { jobName } = req.params;

      await jobQueueService.triggerJob(jobName);

      // Log the manual trigger
      await new EventLogger().logAdminAction(
        'job_manually_triggered',
        req.user.id,
        null,
        'job',
        { job_name: jobName },
        req
      );

      res.json({
        success: true,
        message: `Job '${jobName}' triggered successfully`
      });
    } catch (error) {
      console.error('Trigger job error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to trigger job'
      });
    }
  }

  // POST /api/jobs/:jobName/stop
  static async stopJob(req, res) {
    try {
      const { jobName } = req.params;

      jobQueueService.stopJob(jobName);

      // Log the stop action
      await new EventLogger().logAdminAction(
        'job_stopped',
        req.user.id,
        null,
        'job',
        { job_name: jobName },
        req
      );

      res.json({
        success: true,
        message: `Job '${jobName}' stopped successfully`
      });
    } catch (error) {
      console.error('Stop job error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to stop job'
      });
    }
  }

  // POST /api/jobs/:jobName/start
  static async startJob(req, res) {
    try {
      const { jobName } = req.params;

      jobQueueService.startJob(jobName);

      // Log the start action
      await new EventLogger().logAdminAction(
        'job_started',
        req.user.id,
        null,
        'job',
        { job_name: jobName },
        req
      );

      res.json({
        success: true,
        message: `Job '${jobName}' started successfully`
      });
    } catch (error) {
      console.error('Start job error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to start job'
      });
    }
  }

  // POST /api/jobs/restart-all
  static async restartAllJobs(req, res) {
    try {
      jobQueueService.restartAll();

      // Log the restart action
      await new EventLogger().logAdminAction(
        'all_jobs_restarted',
        req.user.id,
        null,
        'system',
        {},
        req
      );

      res.json({
        success: true,
        message: 'All jobs restarted successfully'
      });
    } catch (error) {
      console.error('Restart all jobs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restart all jobs'
      });
    }
  }

  // POST /api/jobs/stop-all
  static async stopAllJobs(req, res) {
    try {
      jobQueueService.stopAll();

      // Log the stop all action
      await new EventLogger().logAdminAction(
        'all_jobs_stopped',
        req.user.id,
        null,
        'system',
        {},
        req
      );

      res.json({
        success: true,
        message: 'All jobs stopped successfully'
      });
    } catch (error) {
      console.error('Stop all jobs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop all jobs'
      });
    }
  }

  // POST /api/jobs/queue
  static async queueOneTimeJob(req, res) {
    try {
      const { jobName, jobType, delay = 0, parameters = {} } = req.body;

      if (!jobName || !jobType) {
        return res.status(400).json({
          success: false,
          message: 'Job name and type are required'
        });
      }

      // Define available one-time job types
      const jobTypes = {
        'analytics-calculation': async () => {
          const analyticsService = require('../services/analytics.service');
          return await analyticsService.calculateDailyStats(parameters.date);
        },
        'payment-cleanup': async () => {
          const paymentService = require('../services/payment.service');
          return await paymentService.cleanupExpiredPayments();
        },
        'event-cleanup': async () => {
          const eventLogger = new EventLogger();
          return await eventLogger.cleanupOldEvents(parameters.retentionDays || 90);
        },
        'send-notification': async () => {
          // Placeholder for notification sending
          console.log(`Sending notification: ${parameters.message}`);
          return 'Notification sent';
        },
        'generate-report': async () => {
          // Placeholder for report generation
          console.log(`Generating report: ${parameters.reportType}`);
          return 'Report generated';
        }
      };

      const jobFunction = jobTypes[jobType];
      if (!jobFunction) {
        return res.status(400).json({
          success: false,
          message: `Unknown job type: ${jobType}`
        });
      }

      // Queue the job
      await jobQueueService.queueJob(jobName, jobFunction, parseInt(delay));

      // Log the queuing action
      await new EventLogger().logAdminAction(
        'one_time_job_queued',
        req.user.id,
        null,
        'job',
        {
          job_name: jobName,
          job_type: jobType,
          delay,
          parameters
        },
        req
      );

      res.json({
        success: true,
        message: `One-time job '${jobName}' queued successfully`,
        data: {
          jobName,
          jobType,
          delay,
          estimatedExecutionTime: new Date(Date.now() + parseInt(delay))
        }
      });
    } catch (error) {
      console.error('Queue one-time job error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to queue one-time job'
      });
    }
  }

  // GET /api/jobs/health
  static async getHealthCheck(req, res) {
    try {
      const stats = jobQueueService.getSystemStats();
      const recentFailures = jobQueueService.getJobHistory(10)
        .filter((job) => job.status === 'failed');

      const healthStatus = {
        status: stats.isRunning ? 'healthy' : 'stopped',
        totalJobs: stats.totalScheduledJobs,
        successRate: parseFloat(stats.last24Hours.successRate),
        recentFailures: recentFailures.length,
        lastFailure: recentFailures.length > 0 ? recentFailures[0] : null,
        uptime: stats.isRunning,
        timestamp: new Date().toISOString()
      };

      // Determine overall health
      let overallHealth = 'healthy';
      if (!stats.isRunning) {
        overallHealth = 'critical';
      } else if (parseFloat(stats.last24Hours.successRate) < 90) {
        overallHealth = 'warning';
      } else if (recentFailures.length > 3) {
        overallHealth = 'warning';
      }

      res.json({
        success: true,
        health: overallHealth,
        data: healthStatus
      });
    } catch (error) {
      console.error('Get health check error:', error);
      res.status(500).json({
        success: false,
        health: 'critical',
        message: 'Health check failed'
      });
    }
  }
}

module.exports = JobQueueController;
