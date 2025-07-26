-- Create analytics and event logging tables
-- This migration creates the foundation for intelligent analytics and event tracking

-- Event logging system for full traceability
CREATE TABLE IF NOT EXISTS event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL CHECK (
        event_category IN ('auth', 'product', 'order', 'payment', 'delivery', 'vendor', 'admin', 'system')
    ),
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    actor_type VARCHAR(20) CHECK (actor_type IN ('user', 'system', 'webhook', 'cron')),
    target_id INTEGER,
    target_type VARCHAR(50),
    event_data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    severity VARCHAR(10) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for fast querying
    CONSTRAINT valid_target_for_type CHECK (
        (target_type IS NULL AND target_id IS NULL) OR 
        (target_type IS NOT NULL AND target_id IS NOT NULL)
    )
);

-- Indexes for event logs
CREATE INDEX idx_event_logs_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_category ON event_logs(event_category);
CREATE INDEX idx_event_logs_actor ON event_logs(actor_id);
CREATE INDEX idx_event_logs_target ON event_logs(target_type, target_id);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at);
CREATE INDEX idx_event_logs_severity ON event_logs(severity);
CREATE INDEX idx_event_logs_success ON event_logs(success);

-- Composite indexes for common queries
CREATE INDEX idx_event_logs_actor_type ON event_logs(actor_id, event_type, created_at);
CREATE INDEX idx_event_logs_category_date ON event_logs(event_category, created_at);

-- Analytics summary tables for pre-computed statistics
CREATE TABLE IF NOT EXISTS analytics_daily_stats (
    id SERIAL PRIMARY KEY,
    stat_date DATE NOT NULL,
    stat_type VARCHAR(50) NOT NULL,
    stat_key VARCHAR(100),
    stat_value NUMERIC(15,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(stat_date, stat_type, stat_key)
);

CREATE INDEX idx_analytics_daily_date_type ON analytics_daily_stats(stat_date, stat_type);
CREATE INDEX idx_analytics_daily_key ON analytics_daily_stats(stat_key);

-- Product analytics table
CREATE TABLE IF NOT EXISTS product_analytics (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    searches INTEGER DEFAULT 0,
    cart_additions INTEGER DEFAULT 0,
    orders INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    avg_order_value DECIMAL(10,2) DEFAULT 0,
    bounce_rate DECIMAL(5,4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, date)
);

CREATE INDEX idx_product_analytics_product_date ON product_analytics(product_id, date);
CREATE INDEX idx_product_analytics_date ON product_analytics(date);

-- Vendor performance analytics
CREATE TABLE IF NOT EXISTS vendor_analytics (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    fulfilled_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    avg_fulfillment_time_hours DECIMAL(8,2) DEFAULT 0,
    customer_rating DECIMAL(3,2) DEFAULT 0,
    products_added INTEGER DEFAULT 0,
    products_updated INTEGER DEFAULT 0,
    inventory_value DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(vendor_id, date)
);

CREATE INDEX idx_vendor_analytics_vendor_date ON vendor_analytics(vendor_id, date);
CREATE INDEX idx_vendor_analytics_date ON vendor_analytics(date);

-- Payment analytics table
CREATE TABLE IF NOT EXISTS payment_analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    region VARCHAR(50),
    total_attempts INTEGER DEFAULT 0,
    successful_payments INTEGER DEFAULT 0,
    failed_payments INTEGER DEFAULT 0,
    cancelled_payments INTEGER DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    avg_amount DECIMAL(10,2) DEFAULT 0,
    success_rate DECIMAL(5,4) DEFAULT 0,
    avg_processing_time_seconds INTEGER DEFAULT 0,
    fraud_flagged INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date, payment_method, COALESCE(region, 'unknown'))
);

CREATE INDEX idx_payment_analytics_date_method ON payment_analytics(date, payment_method);
CREATE INDEX idx_payment_analytics_region ON payment_analytics(region, date);

-- User behavior analytics
CREATE TABLE IF NOT EXISTS user_behavior_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    session_count INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    search_queries INTEGER DEFAULT 0,
    products_viewed INTEGER DEFAULT 0,
    cart_additions INTEGER DEFAULT 0,
    orders_placed INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    device_type VARCHAR(20),
    location JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, date)
);

CREATE INDEX idx_user_behavior_user_date ON user_behavior_analytics(user_id, date);
CREATE INDEX idx_user_behavior_date ON user_behavior_analytics(date);

-- Create updated_at triggers for analytics tables
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_analytics_daily_stats_updated_at
    BEFORE UPDATE ON analytics_daily_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER trigger_product_analytics_updated_at
    BEFORE UPDATE ON product_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER trigger_vendor_analytics_updated_at
    BEFORE UPDATE ON vendor_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER trigger_payment_analytics_updated_at
    BEFORE UPDATE ON payment_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER trigger_user_behavior_analytics_updated_at
    BEFORE UPDATE ON user_behavior_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

-- Functions for analytics calculations
CREATE OR REPLACE FUNCTION calculate_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    stats_calculated INTEGER := 0;
BEGIN
    -- Calculate order statistics
    INSERT INTO analytics_daily_stats (stat_date, stat_type, stat_key, stat_value, metadata)
    SELECT 
        target_date,
        'orders',
        'total_count',
        COUNT(*),
        JSON_BUILD_OBJECT('calculated_at', NOW())
    FROM orders 
    WHERE DATE(created_at) = target_date
    ON CONFLICT (stat_date, stat_type, stat_key) 
    DO UPDATE SET 
        stat_value = EXCLUDED.stat_value,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP;
    
    stats_calculated := stats_calculated + 1;

    -- Calculate revenue statistics
    INSERT INTO analytics_daily_stats (stat_date, stat_type, stat_key, stat_value, metadata)
    SELECT 
        target_date,
        'revenue',
        'total_amount',
        COALESCE(SUM(total_amount), 0),
        JSON_BUILD_OBJECT('currency', 'XOF', 'calculated_at', NOW())
    FROM orders 
    WHERE DATE(created_at) = target_date AND status != 'cancelled'
    ON CONFLICT (stat_date, stat_type, stat_key) 
    DO UPDATE SET 
        stat_value = EXCLUDED.stat_value,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP;
    
    stats_calculated := stats_calculated + 1;

    -- Calculate payment statistics
    INSERT INTO analytics_daily_stats (stat_date, stat_type, stat_key, stat_value, metadata)
    SELECT 
        target_date,
        'payments',
        payment_method || '_success_rate',
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)) * 100, 2)
            ELSE 0 
        END,
        JSON_BUILD_OBJECT('total_attempts', COUNT(*), 'calculated_at', NOW())
    FROM payments 
    WHERE DATE(created_at) = target_date
    GROUP BY payment_method
    ON CONFLICT (stat_date, stat_type, stat_key) 
    DO UPDATE SET 
        stat_value = EXCLUDED.stat_value,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS stats_calculated = ROW_COUNT;
    stats_calculated := stats_calculated + ROW_COUNT;

    -- Calculate vendor performance
    INSERT INTO analytics_daily_stats (stat_date, stat_type, stat_key, stat_value, metadata)
    SELECT 
        target_date,
        'vendors',
        'active_count',
        COUNT(DISTINCT vendor_id),
        JSON_BUILD_OBJECT('calculated_at', NOW())
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE DATE(o.created_at) = target_date
    ON CONFLICT (stat_date, stat_type, stat_key) 
    DO UPDATE SET 
        stat_value = EXCLUDED.stat_value,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP;
    
    stats_calculated := stats_calculated + 1;

    RETURN stats_calculated;
END;
$$ LANGUAGE plpgsql;

-- Function to get analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    metric_type TEXT,
    metric_name TEXT,
    current_value NUMERIC,
    previous_value NUMERIC,
    change_percent NUMERIC,
    trend TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH current_period AS (
        SELECT 
            stat_type,
            stat_key,
            SUM(stat_value) as current_val
        FROM analytics_daily_stats
        WHERE stat_date BETWEEN start_date AND end_date
        GROUP BY stat_type, stat_key
    ),
    previous_period AS (
        SELECT 
            stat_type,
            stat_key,
            SUM(stat_value) as previous_val
        FROM analytics_daily_stats
        WHERE stat_date BETWEEN (start_date - (end_date - start_date)) AND start_date - INTERVAL '1 day'
        GROUP BY stat_type, stat_key
    )
    SELECT 
        c.stat_type::TEXT,
        c.stat_key::TEXT,
        c.current_val,
        COALESCE(p.previous_val, 0),
        CASE 
            WHEN COALESCE(p.previous_val, 0) = 0 THEN 0
            ELSE ROUND(((c.current_val - COALESCE(p.previous_val, 0)) / COALESCE(p.previous_val, 1)) * 100, 2)
        END,
        CASE 
            WHEN COALESCE(p.previous_val, 0) = 0 THEN 'new'::TEXT
            WHEN c.current_val > COALESCE(p.previous_val, 0) THEN 'up'::TEXT
            WHEN c.current_val < COALESCE(p.previous_val, 0) THEN 'down'::TEXT
            ELSE 'stable'::TEXT
        END
    FROM current_period c
    LEFT JOIN previous_period p ON c.stat_type = p.stat_type AND c.stat_key = p.stat_key
    ORDER BY c.stat_type, c.stat_key;
END;
$$ LANGUAGE plpgsql;

-- Event logging helper function
CREATE OR REPLACE FUNCTION log_event(
    p_event_type VARCHAR(100),
    p_event_category VARCHAR(50),
    p_actor_id INTEGER DEFAULT NULL,
    p_actor_type VARCHAR(20) DEFAULT 'user',
    p_target_id INTEGER DEFAULT NULL,
    p_target_type VARCHAR(50) DEFAULT NULL,
    p_event_data JSONB DEFAULT '{}',
    p_metadata JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL,
    p_severity VARCHAR(10) DEFAULT 'info',
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL,
    p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO event_logs (
        event_type, event_category, actor_id, actor_type, target_id, target_type,
        event_data, metadata, ip_address, user_agent, session_id, severity,
        success, error_message, duration_ms
    ) VALUES (
        p_event_type, p_event_category, p_actor_id, p_actor_type, p_target_id, p_target_type,
        p_event_data, p_metadata, p_ip_address, p_user_agent, p_session_id, p_severity,
        p_success, p_error_message, p_duration_ms
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Create views for common analytics queries
CREATE OR REPLACE VIEW daily_overview AS
SELECT 
    stat_date,
    SUM(CASE WHEN stat_type = 'orders' AND stat_key = 'total_count' THEN stat_value ELSE 0 END) as total_orders,
    SUM(CASE WHEN stat_type = 'revenue' AND stat_key = 'total_amount' THEN stat_value ELSE 0 END) as total_revenue,
    SUM(CASE WHEN stat_type = 'vendors' AND stat_key = 'active_count' THEN stat_value ELSE 0 END) as active_vendors,
    AVG(CASE WHEN stat_type = 'payments' AND stat_key LIKE '%_success_rate' THEN stat_value ELSE NULL END) as avg_payment_success_rate
FROM analytics_daily_stats
GROUP BY stat_date
ORDER BY stat_date DESC;

-- Add comments for documentation
COMMENT ON TABLE event_logs IS 'Comprehensive event logging for full system traceability';
COMMENT ON TABLE analytics_daily_stats IS 'Pre-computed daily statistics for fast dashboard queries';
COMMENT ON TABLE product_analytics IS 'Product performance metrics and conversion tracking';
COMMENT ON TABLE vendor_analytics IS 'Vendor performance and business metrics';
COMMENT ON TABLE payment_analytics IS 'Payment processing analytics and success rates';
COMMENT ON TABLE user_behavior_analytics IS 'User engagement and behavior patterns';

COMMENT ON FUNCTION calculate_daily_stats(DATE) IS 'Calculate and store daily statistics for analytics dashboard';
COMMENT ON FUNCTION get_analytics_summary(DATE, DATE) IS 'Get analytics summary with period-over-period comparisons';
COMMENT ON FUNCTION log_event IS 'Helper function to log structured events for audit trail';

-- Create indexes on JSONB fields for common queries
CREATE INDEX idx_event_logs_event_data_gin ON event_logs USING GIN (event_data);
CREATE INDEX idx_event_logs_metadata_gin ON event_logs USING GIN (metadata);