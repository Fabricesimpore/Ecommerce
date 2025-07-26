// Mock Job Queue Service
class MockJobQueueService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
    this.jobHistory = [];
    this.eventLogger = {
      logSystemEvent: typeof jest !== 'undefined' ? jest.fn() : () => Promise.resolve(),
      logError: typeof jest !== 'undefined' ? jest.fn() : () => Promise.resolve()
    };
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new MockJobQueueService();
    }
    return this.instance;
  }

  async initialize() {
    if (this.isRunning) {
      console.log('🔄 Job queue already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ Job queue service initialized successfully');
  }

  scheduleJob(name, cronPattern, jobFunction, description = '') {
    if (this.jobs.has(name)) {
      console.log(`⏭️ Job ${name} already scheduled, skipping`);
      return;
    }

    this.jobs.set(name, {
      name,
      cronPattern,
      jobFunction,
      description,
      isActive: true,
      lastRun: null,
      nextRun: new Date(Date.now() + 60000), // Mock next run in 1 minute
      runCount: 0,
      lastDuration: null,
      lastStatus: 'pending'
    });

    console.log(`⏰ Scheduled job: ${name} (${cronPattern}) - ${description}`);
  }

  async executeJob(jobName, jobFunction, description) {
    try {
      console.log(`🏃 Executing ${description || jobName}...`);
      
      const startTime = Date.now();
      const result = await jobFunction();
      const duration = Date.now() - startTime;

      const historyEntry = {
        jobName,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration,
        status: 'success',
        result
      };

      this.jobHistory.unshift(historyEntry);
      
      // Keep only last 100 entries
      if (this.jobHistory.length > 100) {
        this.jobHistory = this.jobHistory.slice(0, 100);
      }

      const job = this.jobs.get(jobName);
      if (job) {
        job.lastRun = new Date();
        job.runCount++;
      }

      console.log(`✅ Job ${jobName} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const historyEntry = {
        jobName,
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        status: 'failed',
        error: error.message
      };

      this.jobHistory.unshift(historyEntry);
      
      console.error(`❌ Job ${jobName} failed:`, error.message);
      throw error;
    }
  }

  // Job implementations with mocked database calls
  async runAnalyticsCalculation() {
    // Mock database queries
    const mockDb = require('../../config/database.config');
    
    // Mock successful execution
    console.log('Analytics calculation placeholder - would calculate daily metrics');
    return 'Analytics calculation completed';
  }

  async runPaymentCleanup() {
    console.log('Payment cleanup placeholder - would cleanup expired payment intents');
    return 'Payment cleanup completed';
  }

  async runEventCleanup() {
    console.log('Event cleanup placeholder - would archive old event logs');
    return 'Event cleanup completed';
  }

  async runFraudModelUpdate() {
    console.log('Fraud model update placeholder - would update ML models');
    return 'Fraud model update completed';
  }

  async runHealthCheck() {
    const mockDb = require('../../config/database.config');
    
    try {
      // Mock database connectivity test
      await mockDb.query('SELECT 1');
      
      // Mock error count query - simulate different scenarios for testing
      await mockDb.query('SELECT COUNT(*) as error_count FROM event_logs WHERE severity = \'error\' AND created_at >= NOW() - INTERVAL \'15 minutes\'');
      
      const errorCount = 5; // Mock low error count
      
      // Mock warning scenario if needed (for testing)
      if (process.env.MOCK_HIGH_ERRORS === 'true') {
        const highErrorCount = 15;
        await this.eventLogger.logSystemEvent('health_check_warning', {
          error_count: highErrorCount,
          threshold: 10
        }, 'warn');
        return `Health check: DB healthy, ${highErrorCount} errors in 15min`;
      }
      
      return `Health check: DB healthy, ${errorCount} errors in 15min`;
    } catch (error) {
      await this.eventLogger.logError('health_check_failed', error);
      return 'Health check failed - database connection error';
    }
  }

  async runDatabaseMaintenance() {
    const mockDb = require('../../config/database.config');
    
    try {
      // Mock maintenance tasks
      const maintenanceTasks = [
        'ANALYZE users, products, orders, payments',
        'VACUUM ANALYZE event_logs', 
        'REINDEX INDEX CONCURRENTLY idx_event_logs_created_at'
      ];

      // Mock all tasks succeeding or simulate partial failure
      const shouldFailOne = process.env.MOCK_MAINTENANCE_FAILURE === 'true';
      let completed = shouldFailOne ? 2 : 3;
      
      // Mock database calls
      for (const task of maintenanceTasks) {
        try {
          await mockDb.query(task);
        } catch (error) {
          if (shouldFailOne) {
            console.warn(`Database maintenance task failed: ${task}`, 'Task failed');
            completed--;
            break;
          }
        }
      }

      return `Database maintenance: ${completed}/${maintenanceTasks.length} tasks completed`;
    } catch (error) {
      console.error('Database maintenance error:', error);
      return 'Database maintenance failed';
    }
  }

  async runVendorReports() {
    console.log('Vendor reports placeholder - would generate daily reports');
    return 'Vendor reports generated';
  }

  async runEmailDigest() {
    console.log('Email digest placeholder - would send admin digest');
    return 'Email digest sent';
  }

  // Queue management methods
  async queueJob(jobName, jobFunction, delay = 0) {
    setTimeout(async () => {
      await this.executeJob(`one-time-${jobName}`, jobFunction, `One-time job: ${jobName}`);
    }, delay);

    console.log(`⏰ Queued one-time job: ${jobName}${delay > 0 ? ` (delayed ${delay}ms)` : ''}`);
  }

  getJobStatus(jobName) {
    // If no jobName provided, return all jobs (as expected by one test)
    if (!jobName) {
      return Array.from(this.jobs.values());
    }
    return this.jobs.get(jobName) || null;
  }

  getAllJobsStatus() {
    return Array.from(this.jobs.values());
  }

  async stopJob(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job ${jobName} not found`);
    }
    
    job.isActive = false;
    console.log(`⏹️ Stopped job: ${jobName}`);
  }

  async startJob(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job ${jobName} not found`);
    }
    
    job.isActive = true;
    console.log(`▶️ Started job: ${jobName}`);
  }

  async triggerJob(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job ${jobName} not found`);
    }
    
    return await this.executeJob(jobName, job.jobFunction, job.description);
  }

  async stopAll() {
    for (const job of this.jobs.values()) {
      job.isActive = false;
    }
    console.log('⏹️ All jobs stopped');
  }

  async restartAll() {
    for (const job of this.jobs.values()) {
      job.isActive = true;
    }
    console.log('🔄 All jobs restarted');
  }

  getHistory(limit = 50) {
    return this.jobHistory.slice(0, limit);
  }

  getSystemStats() {
    const totalJobs = this.jobs.size;
    const activeJobs = Array.from(this.jobs.values()).filter(job => job.isActive).length;
    const totalRuns = this.jobHistory.length;
    const successfulRuns = this.jobHistory.filter(entry => entry.status === 'success').length;
    const failedRuns = totalRuns - successfulRuns;

    return {
      totalJobs,
      activeJobs,
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate: totalRuns > 0 ? (successfulRuns / totalRuns * 100).toFixed(2) : 0
    };
  }

  getNextRunTime(cronPattern) {
    // Simplified mock - just return a future date
    return new Date(Date.now() + 60000);
  }
}

// Create singleton instance
const jobQueueService = new MockJobQueueService();

module.exports = jobQueueService;