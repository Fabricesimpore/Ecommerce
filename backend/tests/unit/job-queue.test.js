const cron = require('node-cron');

// Mock dependencies before requiring the service
jest.mock('node-cron');
jest.mock('../../src/config/database.config');

// Create mock event logger
const mockEventLogger = {
  logSystemEvent: jest.fn(),
  logError: jest.fn(),
  cleanupOldEvents: jest.fn()
};

jest.mock('../../src/services/event-logger.service', () => {
  return jest.fn().mockImplementation(() => mockEventLogger);
});

// Mock analytics service
const mockAnalyticsService = {
  calculateDailyStats: jest.fn()
};

jest.mock('../../src/services/analytics.service', () => mockAnalyticsService);

// Mock payment service
const mockPaymentService = {
  cleanupExpiredPayments: jest.fn()
};

jest.mock('../../src/services/payment.service', () => mockPaymentService);

// Job queue service is now mocked globally in setup.js

// Mock database
const mockDb = {
  query: jest.fn()
};

jest.mock('../../src/config/database.config', () => mockDb);

// Now require the service after mocking
const JobQueueService = require('../../src/services/job-queue.service');

describe('Job Queue Service', () => {
  let mockTask;
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock cron task
    mockTask = {
      start: jest.fn(),
      stop: jest.fn(),
      getStatus: jest.fn().mockReturnValue('active')
    };
    
    cron.schedule.mockReturnValue(mockTask);
    
    // Spy on console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation()
    };

    // Reset service state
    JobQueueService.jobs.clear();
    JobQueueService.jobHistory = [];
    JobQueueService.isRunning = false;
  });

  afterEach(() => {
    // Restore console methods
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('Service Initialization', () => {
    it('should initialize successfully when not already running', async () => {
      mockEventLogger.logSystemEvent.mockResolvedValueOnce();

      await JobQueueService.initialize();

      expect(JobQueueService.isRunning).toBe(true);
      expect(cron.schedule).toHaveBeenCalledTimes(8); // Should schedule 8 jobs
      expect(mockEventLogger.logSystemEvent).toHaveBeenCalledWith(
        'job_queue_initialized',
        { scheduled_jobs: 8 }
      );
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Job Queue System initialized successfully');
    });

    it('should skip initialization if already running', async () => {
      JobQueueService.isRunning = true;

      await JobQueueService.initialize();

      expect(cron.schedule).not.toHaveBeenCalled();
      expect(mockEventLogger.logSystemEvent).not.toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith('Job queue is already running');
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      cron.schedule.mockImplementation(() => {
        throw error;
      });

      await expect(JobQueueService.initialize()).rejects.toThrow('Initialization failed');

      expect(mockEventLogger.logError).toHaveBeenCalledWith('job_queue_init_failed', error);
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Failed to initialize job queue:', error);
    });
  });

  describe('Job Scheduling', () => {
    it('should schedule a job successfully', () => {
      const jobFunction = jest.fn();
      const cronPattern = '0 2 * * *';
      const description = 'Test job';

      JobQueueService.scheduleJob('test-job', cronPattern, jobFunction, description);

      expect(cron.schedule).toHaveBeenCalledWith(
        cronPattern,
        expect.any(Function),
        {
          scheduled: true,
          timezone: 'Africa/Ouagadougou'
        }
      );

      expect(JobQueueService.jobs.has('test-job')).toBe(true);
      
      const job = JobQueueService.jobs.get('test-job');
      expect(job.name).toBe('test-job');
      expect(job.cronPattern).toBe(cronPattern);
      expect(job.description).toBe(description);
      expect(job.runCount).toBe(0);
      expect(job.lastStatus).toBe('pending');
    });

    it('should skip scheduling if job already exists', () => {
      JobQueueService.scheduleJob('test-job', '0 2 * * *', jest.fn(), 'Test job');
      cron.schedule.mockClear();

      JobQueueService.scheduleJob('test-job', '0 3 * * *', jest.fn(), 'Another test job');

      expect(cron.schedule).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledWith('Job test-job already exists, skipping...');
    });

    it('should schedule all recurring jobs during initialization', async () => {
      mockEventLogger.logSystemEvent.mockResolvedValueOnce();

      await JobQueueService.initialize();

      const expectedJobs = [
        'daily-analytics',
        'payment-cleanup',
        'event-cleanup',
        'fraud-model-update',
        'health-check',
        'db-maintenance',
        'vendor-reports',
        'email-digest'
      ];

      expectedJobs.forEach(jobName => {
        expect(JobQueueService.jobs.has(jobName)).toBe(true);
      });
    });
  });

  describe('Job Execution', () => {
    beforeEach(() => {
      const jobFunction = jest.fn();
      JobQueueService.scheduleJob('test-job', '0 2 * * *', jobFunction, 'Test job');
    });

    it('should execute job successfully', async () => {
      const jobFunction = jest.fn().mockResolvedValue('Success result');
      mockEventLogger.logSystemEvent.mockResolvedValueOnce();

      await JobQueueService.executeJob('test-job', jobFunction, 'Test job');

      const job = JobQueueService.jobs.get('test-job');
      expect(job.runCount).toBe(1);
      expect(job.lastStatus).toBe('completed');
      expect(job.lastRun).toBeInstanceOf(Date);
      expect(job.lastDuration).toBeGreaterThanOrEqual(0);

      expect(mockEventLogger.logSystemEvent).toHaveBeenCalledWith(
        'job_executed',
        expect.objectContaining({
          job_name: 'test-job',
          description: 'Test job',
          duration_ms: expect.any(Number),
          result: 'Success result'
        })
      );

      expect(JobQueueService.jobHistory).toHaveLength(1);
      expect(JobQueueService.jobHistory[0].status).toBe('completed');
    });

    it('should handle job execution errors', async () => {
      const error = new Error('Job execution failed');
      const jobFunction = jest.fn().mockRejectedValue(error);
      mockEventLogger.logError.mockResolvedValueOnce();

      await JobQueueService.executeJob('test-job', jobFunction, 'Test job');

      const job = JobQueueService.jobs.get('test-job');
      expect(job.runCount).toBe(1);
      expect(job.lastStatus).toBe('failed');

      expect(mockEventLogger.logError).toHaveBeenCalledWith(
        'job_execution_failed',
        error,
        expect.objectContaining({
          job_name: 'test-job',
          description: 'Test job',
          duration_ms: expect.any(Number)
        })
      );

      expect(JobQueueService.jobHistory).toHaveLength(1);
      expect(JobQueueService.jobHistory[0].status).toBe('failed');
    });

    it('should return early if job not found', async () => {
      const jobFunction = jest.fn();

      await JobQueueService.executeJob('non-existent-job', jobFunction, 'Test');

      expect(jobFunction).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith('Job non-existent-job not found');
    });
  });

  describe('Job Implementations', () => {
    it('should run analytics calculation', async () => {
      mockAnalyticsService.calculateDailyStats.mockResolvedValue({
        success: true,
        statsCalculated: 5
      });

      const result = await JobQueueService.runAnalyticsCalculation();

      expect(mockAnalyticsService.calculateDailyStats).toHaveBeenCalled();
      expect(result).toBe('Calculated 5 statistics');
    });

    it('should run payment cleanup', async () => {
      mockPaymentService.cleanupExpiredPayments.mockResolvedValue(3);

      const result = await JobQueueService.runPaymentCleanup();

      expect(mockPaymentService.cleanupExpiredPayments).toHaveBeenCalled();
      expect(result).toBe('Cleaned up 3 expired payments');
    });

    it('should run event cleanup', async () => {
      mockEventLogger.cleanupOldEvents.mockResolvedValue({ deletedCount: 10 });

      const result = await JobQueueService.runEventCleanup();

      expect(mockEventLogger.cleanupOldEvents).toHaveBeenCalledWith(90);
      expect(result).toBe('Cleaned up 10 old events');
    });

    it('should run fraud model update', async () => {
      const result = await JobQueueService.runFraudModelUpdate();

      expect(result).toBe('Fraud detection patterns updated');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Fraud model update placeholder - would update ML patterns'
      );
    });

    it('should run health check successfully', async () => {
      mockDb.query
        .mockResolvedValueOnce() // SELECT 1
        .mockResolvedValueOnce({ rows: [{ error_count: '5' }] }); // Error count query

      const result = await JobQueueService.runHealthCheck();

      expect(mockDb.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('SELECT COUNT(*) as error_count'));
      expect(result).toBe('Health check: DB healthy, 5 errors in 15min');
    });

    it('should log warning for high error count in health check', async () => {
      mockDb.query
        .mockResolvedValueOnce() // SELECT 1
        .mockResolvedValueOnce({ rows: [{ error_count: '15' }] }); // High error count
      mockEventLogger.logSystemEvent.mockResolvedValueOnce();

      const result = await JobQueueService.runHealthCheck();

      expect(mockEventLogger.logSystemEvent).toHaveBeenCalledWith(
        'health_check_warning',
        { error_count: 15, threshold: 10 },
        'warn'
      );
      expect(result).toBe('Health check: DB healthy, 15 errors in 15min');
    });

    it('should handle health check database errors', async () => {
      const error = new Error('Database connection failed');
      mockDb.query.mockRejectedValueOnce(error);
      mockEventLogger.logError.mockResolvedValueOnce();

      const result = await JobQueueService.runHealthCheck();

      expect(mockEventLogger.logError).toHaveBeenCalledWith('health_check_failed', error);
      expect(result).toBe('Health check failed - database connection error');
    });

    it('should run database maintenance', async () => {
      mockDb.query
        .mockResolvedValueOnce() // ANALYZE
        .mockResolvedValueOnce() // VACUUM
        .mockResolvedValueOnce(); // REINDEX

      const result = await JobQueueService.runDatabaseMaintenance();

      expect(mockDb.query).toHaveBeenCalledTimes(3);
      expect(result).toBe('Database maintenance: 3/3 tasks completed');
    });

    it('should handle database maintenance task failures', async () => {
      mockDb.query
        .mockResolvedValueOnce() // First task succeeds
        .mockRejectedValueOnce(new Error('Task failed')) // Second task fails
        .mockResolvedValueOnce(); // Third task succeeds

      const result = await JobQueueService.runDatabaseMaintenance();

      expect(result).toBe('Database maintenance: 2/3 tasks completed');
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Database maintenance task failed'),
        'Task failed'
      );
    });

    it('should run vendor reports', async () => {
      const result = await JobQueueService.runVendorReports();

      expect(result).toBe('Vendor reports generated');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Vendor reports placeholder - would generate daily reports'
      );
    });

    it('should run email digest', async () => {
      const result = await JobQueueService.runEmailDigest();

      expect(result).toBe('Email digest sent');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Email digest placeholder - would send admin digest'
      );
    });
  });

  describe('One-time Job Queuing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should queue immediate job', async () => {
      const executeJobSpy = jest.spyOn(JobQueueService, 'executeJob').mockResolvedValue();
      const jobFunction = jest.fn();

      await JobQueueService.queueJob('test-immediate', jobFunction, 0);
      jest.runAllTimers();

      expect(executeJobSpy).toHaveBeenCalledWith(
        'one-time-test-immediate',
        jobFunction,
        'One-time job: test-immediate'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith('⏰ Queued one-time job: test-immediate');

      executeJobSpy.mockRestore();
    });

    it('should queue delayed job', async () => {
      const executeJobSpy = jest.spyOn(JobQueueService, 'executeJob').mockResolvedValue();
      const jobFunction = jest.fn();

      await JobQueueService.queueJob('test-delayed', jobFunction, 5000);

      expect(consoleSpy.log).toHaveBeenCalledWith('⏰ Queued one-time job: test-delayed (delayed 5000ms)');

      jest.advanceTimersByTime(5000);

      expect(executeJobSpy).toHaveBeenCalledWith(
        'one-time-test-delayed',
        jobFunction,
        'One-time job: test-delayed'
      );

      executeJobSpy.mockRestore();
    });
  });

  describe('Job Status and Management', () => {
    beforeEach(() => {
      JobQueueService.scheduleJob('test-job', '0 2 * * *', jest.fn(), 'Test job');
    });

    it('should get specific job status', () => {
      const status = JobQueueService.getJobStatus('test-job');

      expect(status).toEqual({
        name: 'test-job',
        cronPattern: '0 2 * * *',
        description: 'Test job',
        lastRun: null,
        nextRun: expect.any(Date),
        runCount: 0,
        lastDuration: null,
        lastStatus: 'pending',
        isActive: true
      });
    });

    it('should return null for non-existent job', () => {
      const status = JobQueueService.getJobStatus('non-existent');

      expect(status).toBeNull();
    });

    it('should get all jobs status', () => {
      const allStatus = JobQueueService.getJobStatus();

      expect(Array.isArray(allStatus)).toBe(true);
      expect(allStatus).toHaveLength(1);
      expect(allStatus[0].name).toBe('test-job');
    });

    it('should stop specific job', () => {
      JobQueueService.stopJob('test-job');

      expect(mockTask.stop).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith('⏹️ Stopped job: test-job');
    });

    it('should throw error when stopping non-existent job', () => {
      expect(() => JobQueueService.stopJob('non-existent')).toThrow('Job non-existent not found');
    });

    it('should start specific job', () => {
      JobQueueService.startJob('test-job');

      expect(mockTask.start).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith('▶️ Started job: test-job');
    });

    it('should throw error when starting non-existent job', () => {
      expect(() => JobQueueService.startJob('non-existent')).toThrow('Job non-existent not found');
    });

    it('should manually trigger job', async () => {
      const executeJobSpy = jest.spyOn(JobQueueService, 'executeJob').mockResolvedValue();

      await JobQueueService.triggerJob('test-job');

      expect(executeJobSpy).toHaveBeenCalledWith(
        'manual-test-job',
        expect.any(Function),
        'Manual execution of Test job'
      );

      executeJobSpy.mockRestore();
    });

    it('should throw error when triggering non-existent job', async () => {
      await expect(JobQueueService.triggerJob('non-existent')).rejects.toThrow('Job non-existent not found');
    });
  });

  describe('Job Management - Start/Stop All', () => {
    beforeEach(() => {
      JobQueueService.scheduleJob('job1', '0 1 * * *', jest.fn(), 'Job 1');
      JobQueueService.scheduleJob('job2', '0 2 * * *', jest.fn(), 'Job 2');
      JobQueueService.isRunning = true;
    });

    it('should stop all jobs', () => {
      JobQueueService.stopAll();

      expect(mockTask.stop).toHaveBeenCalledTimes(2);
      expect(JobQueueService.isRunning).toBe(false);
      expect(consoleSpy.log).toHaveBeenCalledWith('⏹️ Stopping all scheduled jobs...');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ All jobs stopped');
    });

    it('should restart all jobs', () => {
      jest.useFakeTimers();

      JobQueueService.restartAll();

      expect(mockTask.stop).toHaveBeenCalledTimes(2);
      expect(consoleSpy.log).toHaveBeenCalledWith('🔄 Restarting all scheduled jobs...');

      jest.advanceTimersByTime(1000);

      expect(mockTask.start).toHaveBeenCalledTimes(2);
      expect(JobQueueService.isRunning).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ All jobs restarted');

      jest.useRealTimers();
    });
  });

  describe('History and Statistics', () => {
    beforeEach(() => {
      // Add some test history entries
      const now = new Date();
      JobQueueService.addToHistory({
        jobName: 'job1',
        status: 'completed',
        startTime: new Date(now - 1000),
        duration: 500,
        result: 'success'
      });
      JobQueueService.addToHistory({
        jobName: 'job2',
        status: 'failed',
        startTime: new Date(now - 2000),
        duration: 300,
        error: 'Test error'
      });
    });

    it('should get job history with default limit', () => {
      const history = JobQueueService.getJobHistory();

      expect(history).toHaveLength(2);
      expect(history[0].jobName).toBe('job2'); // Most recent first
      expect(history[0].duration).toBe('300ms');
      expect(history[1].jobName).toBe('job1');
    });

    it('should get job history with custom limit', () => {
      const history = JobQueueService.getJobHistory(1);

      expect(history).toHaveLength(1);
      expect(history[0].jobName).toBe('job2');
    });

    it('should maintain history size limit', () => {
      const originalMaxSize = JobQueueService.maxHistorySize;
      JobQueueService.maxHistorySize = 2;

      // Add a third entry
      JobQueueService.addToHistory({
        jobName: 'job3',
        status: 'completed',
        startTime: new Date(),
        duration: 400,
        result: 'success'
      });

      expect(JobQueueService.jobHistory).toHaveLength(2);
      expect(JobQueueService.jobHistory[0].jobName).toBe('job2'); // First one should be removed
      expect(JobQueueService.jobHistory[1].jobName).toBe('job3');

      JobQueueService.maxHistorySize = originalMaxSize;
    });

    it('should get system statistics', () => {
      JobQueueService.isRunning = true;
      JobQueueService.scheduleJob('test-job', '0 1 * * *', jest.fn(), 'Test');

      const stats = JobQueueService.getSystemStats();

      expect(stats).toEqual({
        isRunning: true,
        totalScheduledJobs: 1,
        totalHistoryEntries: 2,
        last24Hours: {
          totalExecutions: 2,
          completedJobs: 1,
          failedJobs: 1,
          successRate: '50.00',
          averageDuration: 500
        }
      });
    });

    it('should handle empty history in statistics', () => {
      JobQueueService.jobHistory = [];
      JobQueueService.isRunning = false;

      const stats = JobQueueService.getSystemStats();

      expect(stats.last24Hours).toEqual({
        totalExecutions: 0,
        completedJobs: 0,
        failedJobs: 0,
        successRate: 0,
        averageDuration: 0
      });
    });
  });

  describe('Helper Methods', () => {
    it('should get next run time (simplified)', () => {
      const nextRun = JobQueueService.getNextRunTime('0 2 * * *');

      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle invalid cron pattern', () => {
      // Mock an error in the try block
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => {
        throw new Error('Test error');
      });

      const nextRun = JobQueueService.getNextRunTime('invalid');

      expect(nextRun).toBeNull();

      Date.now = originalDateNow;
    });
  });
});