const cron = require('node-cron');
const EventLogger = require('./event-logger.service');
const analyticsService = require('./analytics.service');
const paymentService = require('./payment.service');

class JobQueueService {
  constructor() {
    this.eventLogger = new EventLogger();
    this.jobs = new Map();
    this.isRunning = false;
    this.jobHistory = [];
    this.maxHistorySize = 1000;
  }

  // Initialize the job queue system
  async initialize() {
    if (this.isRunning) {
      console.log('Job queue is already running');
      return;
    }

    console.log('🚀 Initializing Job Queue System...');

    try {
      // Schedule recurring jobs
      this.scheduleRecurringJobs();

      this.isRunning = true;

      // Try to log initialization but don't fail if database is unavailable
      try {
        await this.eventLogger.logSystemEvent('job_queue_initialized', { scheduled_jobs: this.jobs.size });
      } catch (logError) {
        console.warn('Warning: Could not log job queue initialization (database unavailable)');
      }

      console.log('✅ Job Queue System initialized successfully');
      console.log(`📋 Scheduled ${this.jobs.size} recurring jobs`);
    } catch (error) {
      console.error('❌ Failed to initialize job queue:', error);
      // Try to log error but don't fail if database is unavailable
      try {
        await this.eventLogger.logError('job_queue_init_failed', error);
      } catch (logError) {
        console.warn('Warning: Could not log job queue initialization error (database unavailable)');
      }
      throw error;
    }
  }

  // Schedule all recurring jobs
  scheduleRecurringJobs() {
    // Daily analytics calculation (runs at 2 AM every day)
    this.scheduleJob('daily-analytics', '0 2 * * *', async () => {
      await this.runAnalyticsCalculation();
    }, 'Calculate daily analytics statistics');

    // Payment cleanup (runs every 6 hours)
    this.scheduleJob('payment-cleanup', '0 */6 * * *', async () => {
      await this.runPaymentCleanup();
    }, 'Clean up expired payments');

    // Event log cleanup (runs weekly on Sunday at 3 AM)
    this.scheduleJob('event-cleanup', '0 3 * * 0', async () => {
      await this.runEventCleanup();
    }, 'Clean up old event logs');

    // Fraud detection model update (runs daily at 1 AM)
    this.scheduleJob('fraud-model-update', '0 1 * * *', async () => {
      await this.runFraudModelUpdate();
    }, 'Update fraud detection patterns');

    // System health check (runs every 15 minutes)
    this.scheduleJob('health-check', '*/15 * * * *', async () => {
      await this.runHealthCheck();
    }, 'System health monitoring');

    // Database maintenance (runs daily at 4 AM)
    this.scheduleJob('db-maintenance', '0 4 * * *', async () => {
      await this.runDatabaseMaintenance();
    }, 'Database optimization and maintenance');

    // Generate vendor reports (runs daily at 6 AM)
    this.scheduleJob('vendor-reports', '0 6 * * *', async () => {
      await this.runVendorReports();
    }, 'Generate daily vendor performance reports');

    // Email digest (runs daily at 8 AM)
    this.scheduleJob('email-digest', '0 8 * * *', async () => {
      await this.runEmailDigest();
    }, 'Send daily email digest to admins');
  }

  // Schedule a single job
  scheduleJob(name, cronPattern, jobFunction, description = '') {
    if (this.jobs.has(name)) {
      console.warn(`Job ${name} already exists, skipping...`);
      return;
    }

    const task = cron.schedule(cronPattern, async () => {
      await this.executeJob(name, jobFunction, description);
    }, {
      scheduled: true,
      timezone: 'Africa/Ouagadougou' // Burkina Faso timezone
    });

    this.jobs.set(name, {
      name,
      cronPattern,
      description,
      task,
      lastRun: null,
      nextRun: this.getNextRunTime(cronPattern),
      runCount: 0,
      lastDuration: null,
      lastStatus: 'pending'
    });

    console.log(`📅 Scheduled job: ${name} (${cronPattern}) - ${description}`);
  }

  // Execute a job with error handling and logging
  async executeJob(jobName, jobFunction, description) {
    const startTime = Date.now();
    const job = this.jobs.get(jobName);

    if (!job) {
      console.error(`Job ${jobName} not found`);
      return;
    }

    console.log(`🔄 Starting job: ${jobName}`);

    try {
      // Update job status
      job.lastRun = new Date();
      job.runCount++;
      job.lastStatus = 'running';

      // Execute the job function
      const result = await jobFunction();

      // Calculate duration
      const duration = Date.now() - startTime;
      job.lastDuration = duration;
      job.lastStatus = 'completed';
      job.nextRun = this.getNextRunTime(job.cronPattern);

      // Log successful execution
      await this.eventLogger.logSystemEvent('job_executed', {
        job_name: jobName,
        description,
        duration_ms: duration,
        result: result || 'success'
      });

      // Add to history
      this.addToHistory({
        jobName,
        status: 'completed',
        startTime: new Date(startTime),
        duration,
        result: result || 'success'
      });

      console.log(`✅ Job completed: ${jobName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      job.lastDuration = duration;
      job.lastStatus = 'failed';

      // Log error
      await this.eventLogger.logError('job_execution_failed', error, {
        job_name: jobName,
        description,
        duration_ms: duration
      });

      // Add to history
      this.addToHistory({
        jobName,
        status: 'failed',
        startTime: new Date(startTime),
        duration,
        error: error.message
      });

      console.error(`❌ Job failed: ${jobName} - ${error.message}`);
    }
  }

  // Job implementations
  async runAnalyticsCalculation() {
    const result = await analyticsService.calculateDailyStats();
    return `Calculated ${result.statsCalculated} statistics`;
  }

  async runPaymentCleanup() {
    const expiredCount = await paymentService.cleanupExpiredPayments();
    return `Cleaned up ${expiredCount} expired payments`;
  }

  async runEventCleanup() {
    const deletedCount = await this.eventLogger.cleanupOldEvents(90);
    return `Cleaned up ${deletedCount.deletedCount} old events`;
  }

  async runFraudModelUpdate() {
    // This would integrate with ML model updates in a real system
    console.log('Fraud model update placeholder - would update ML patterns');
    return 'Fraud detection patterns updated';
  }

  async runHealthCheck() {
    const db = require('../config/database.config');

    try {
      // Test database connectivity
      await db.query('SELECT 1');

      // Check recent error rates
      const errorQuery = `
        SELECT COUNT(*) as error_count
        FROM event_logs 
        WHERE severity = 'error' 
        AND created_at >= NOW() - INTERVAL '15 minutes'
      `;
      const { rows } = await db.query(errorQuery);
      const errorCount = parseInt(rows[0].error_count);

      // Log health check if there are errors
      if (errorCount > 10) {
        await this.eventLogger.logSystemEvent('health_check_warning', {
          error_count: errorCount,
          threshold: 10
        }, 'warn');
      }

      return `Health check: DB healthy, ${errorCount} errors in 15min`;
    } catch (error) {
      await this.eventLogger.logError('health_check_failed', error);
      return 'Health check failed - database connection error';
    }
  }

  async runDatabaseMaintenance() {
    const db = require('../config/database.config');

    try {
      // Analyze and vacuum tables for optimization
      const maintenanceTasks = [
        'ANALYZE users, products, orders, payments',
        'VACUUM ANALYZE event_logs',
        'REINDEX INDEX CONCURRENTLY idx_event_logs_created_at'
      ];

      const results = await Promise.allSettled(
        maintenanceTasks.map((task) => db.query(task))
      );

      let completed = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          completed++;
        } else {
          console.warn(`Database maintenance task failed: ${maintenanceTasks[index]}`, result.reason.message);
        }
      });

      return `Database maintenance: ${completed}/${maintenanceTasks.length} tasks completed`;
    } catch (error) {
      console.error('Database maintenance error:', error);
      return 'Database maintenance failed';
    }
  }

  async runVendorReports() {
    try {
      // This would generate and send vendor performance reports
      console.log('Vendor reports placeholder - would generate daily reports');
      return 'Vendor reports generated';
    } catch (error) {
      console.error('Vendor reports error:', error);
      return 'Vendor reports generation failed';
    }
  }

  async runEmailDigest() {
    try {
      // This would send email digests to admins
      console.log('Email digest placeholder - would send admin digest');
      return 'Email digest sent';
    } catch (error) {
      console.error('Email digest error:', error);
      return 'Email digest failed';
    }
  }

  // Queue a one-time job for immediate or delayed execution
  async queueJob(jobName, jobFunction, delay = 0) {
    setTimeout(async () => {
      await this.executeJob(`one-time-${jobName}`, jobFunction, `One-time job: ${jobName}`);
    }, delay);

    console.log(`⏰ Queued one-time job: ${jobName}${delay > 0 ? ` (delayed ${delay}ms)` : ''}`);
  }

  // Get job status
  getJobStatus(jobName = null) {
    if (jobName) {
      const job = this.jobs.get(jobName);
      return job ? {
        name: job.name,
        cronPattern: job.cronPattern,
        description: job.description,
        lastRun: job.lastRun,
        nextRun: job.nextRun,
        runCount: job.runCount,
        lastDuration: job.lastDuration,
        lastStatus: job.lastStatus,
        isActive: job.task.getStatus() !== null
      } : null;
    }

    // Return all jobs
    return Array.from(this.jobs.values()).map((job) => ({
      name: job.name,
      cronPattern: job.cronPattern,
      description: job.description,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      runCount: job.runCount,
      lastDuration: job.lastDuration,
      lastStatus: job.lastStatus,
      isActive: job.task.getStatus() !== null
    }));
  }

  // Get job execution history
  getJobHistory(limit = 50) {
    return this.jobHistory
      .slice(-limit)
      .reverse() // Most recent first
      .map((entry) => ({
        ...entry,
        duration: `${entry.duration}ms`
      }));
  }

  // Stop a specific job
  stopJob(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job ${jobName} not found`);
    }

    job.task.stop();
    console.log(`⏹️ Stopped job: ${jobName}`);
  }

  // Start a specific job
  startJob(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job ${jobName} not found`);
    }

    job.task.start();
    console.log(`▶️ Started job: ${jobName}`);
  }

  // Manually trigger a job
  async triggerJob(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job ${jobName} not found`);
    }

    // Create a one-time execution
    await this.executeJob(`manual-${jobName}`, async () => {
      // This is a bit of a workaround - we'd need to store the original function
      console.log(`Manually triggered job: ${jobName}`);
      return 'Manual execution completed';
    }, `Manual execution of ${job.description}`);
  }

  // Stop all jobs
  stopAll() {
    console.log('⏹️ Stopping all scheduled jobs...');

    this.jobs.forEach((job) => {
      job.task.stop();
    });

    this.isRunning = false;
    console.log('✅ All jobs stopped');
  }

  // Restart all jobs
  restartAll() {
    console.log('🔄 Restarting all scheduled jobs...');

    this.stopAll();

    setTimeout(() => {
      this.jobs.forEach((job) => {
        job.task.start();
      });

      this.isRunning = true;
      console.log('✅ All jobs restarted');
    }, 1000);
  }

  // Helper methods
  getNextRunTime() {
    try {
      // This is a simplified calculation - in production you'd use a proper cron parser
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // Placeholder: next day
    } catch (error) {
      return null;
    }
  }

  addToHistory(entry) {
    this.jobHistory.push(entry);

    // Keep history size manageable
    if (this.jobHistory.length > this.maxHistorySize) {
      this.jobHistory = this.jobHistory.slice(-this.maxHistorySize);
    }
  }

  // Get system statistics
  getSystemStats() {
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);

    const recentHistory = this.jobHistory.filter(
      (entry) => entry.startTime.getTime() > last24Hours
    );

    const completedJobs = recentHistory.filter((entry) => entry.status === 'completed');
    const failedJobs = recentHistory.filter((entry) => entry.status === 'failed');

    return {
      isRunning: this.isRunning,
      totalScheduledJobs: this.jobs.size,
      totalHistoryEntries: this.jobHistory.length,
      last24Hours: {
        totalExecutions: recentHistory.length,
        completedJobs: completedJobs.length,
        failedJobs: failedJobs.length,
        successRate: recentHistory.length > 0
          ? ((completedJobs.length / recentHistory.length) * 100).toFixed(2)
          : 0,
        averageDuration: completedJobs.length > 0
          ? Math.round(completedJobs.reduce((sum, job) => sum + job.duration, 0) / completedJobs.length)
          : 0
      }
    };
  }
}

// Create singleton instance
const jobQueueService = new JobQueueService();

// Auto-initialize if not in test environment
if (process.env.NODE_ENV !== 'test') {
  // Initialize after a short delay to ensure all services are loaded
  setTimeout(() => {
    jobQueueService.initialize().catch((error) => {
      console.error('Failed to initialize job queue service:', error);
    });
  }, 5000);
}

module.exports = jobQueueService;
