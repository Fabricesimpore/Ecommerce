-- Enhanced fraud detection system
-- This migration creates tables for behavioral tracking and fraud analysis

-- User behavior tracking for fraud detection
CREATE TABLE IF NOT EXISTS user_behavior_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- Behavioral metrics
    failed_login_attempts INTEGER DEFAULT 0,
    rapid_requests_count INTEGER DEFAULT 0,
    payment_attempts_count INTEGER DEFAULT 0,
    different_payment_methods_count INTEGER DEFAULT 0,
    
    -- Location and device info
    country_code VARCHAR(2),
    city VARCHAR(100),
    is_mobile BOOLEAN DEFAULT false,
    is_new_device BOOLEAN DEFAULT true,
    
    -- Time-based patterns
    hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    
    -- Fraud risk indicators
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    fraud_flags TEXT[] DEFAULT '{}',
    is_suspicious BOOLEAN DEFAULT false,
    
    -- Timestamps
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for behavior tracking
CREATE INDEX idx_user_behavior_tracking_user_id ON user_behavior_tracking(user_id);
CREATE INDEX idx_user_behavior_tracking_ip ON user_behavior_tracking(ip_address);
CREATE INDEX idx_user_behavior_tracking_session ON user_behavior_tracking(session_id);
CREATE INDEX idx_user_behavior_tracking_risk_score ON user_behavior_tracking(risk_score);
CREATE INDEX idx_user_behavior_tracking_suspicious ON user_behavior_tracking(is_suspicious);
CREATE INDEX idx_user_behavior_tracking_last_activity ON user_behavior_tracking(last_activity_at);

-- Fraud rules configuration
CREATE TABLE IF NOT EXISTS fraud_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(50) NOT NULL CHECK (
        rule_type IN ('velocity', 'device', 'location', 'behavioral', 'payment', 'custom')
    ),
    rule_description TEXT,
    
    -- Rule configuration
    rule_config JSONB NOT NULL,
    risk_score_increment INTEGER DEFAULT 10 CHECK (risk_score_increment >= 0 AND risk_score_increment <= 100),
    
    -- Rule status
    is_active BOOLEAN DEFAULT true,
    severity VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Actions to take when rule triggers
    action_type VARCHAR(20) DEFAULT 'flag' CHECK (action_type IN ('flag', 'block', 'review', 'delay')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Index for fraud rules
CREATE INDEX idx_fraud_rules_type ON fraud_rules(rule_type);
CREATE INDEX idx_fraud_rules_active ON fraud_rules(is_active);
CREATE INDEX idx_fraud_rules_severity ON fraud_rules(severity);

-- Fraud incidents tracking
CREATE TABLE IF NOT EXISTS fraud_incidents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    incident_type VARCHAR(50) NOT NULL,
    
    -- Associated records
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
    
    -- Incident details
    triggered_rules TEXT[] NOT NULL,
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Context information
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    device_fingerprint VARCHAR(255),
    
    -- Incident data
    incident_data JSONB NOT NULL DEFAULT '{}',
    evidence JSONB DEFAULT '{}',
    
    -- Status and resolution
    status VARCHAR(20) DEFAULT 'open' CHECK (
        status IN ('open', 'investigating', 'confirmed', 'false_positive', 'resolved')
    ),
    resolution_notes TEXT,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Actions taken
    action_taken VARCHAR(50),
    user_blocked BOOLEAN DEFAULT false,
    automatic_action BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fraud incidents
CREATE INDEX idx_fraud_incidents_user_id ON fraud_incidents(user_id);
CREATE INDEX idx_fraud_incidents_type ON fraud_incidents(incident_type);
CREATE INDEX idx_fraud_incidents_status ON fraud_incidents(status);
CREATE INDEX idx_fraud_incidents_severity ON fraud_incidents(severity);
CREATE INDEX idx_fraud_incidents_created_at ON fraud_incidents(created_at);
CREATE INDEX idx_fraud_incidents_risk_score ON fraud_incidents(risk_score);

-- IP address blacklist/whitelist
CREATE TABLE IF NOT EXISTS ip_reputation (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    reputation_type VARCHAR(20) NOT NULL CHECK (reputation_type IN ('blacklist', 'whitelist', 'greylist')),
    
    -- Reputation details
    reputation_score INTEGER DEFAULT 0 CHECK (reputation_score >= 0 AND reputation_score <= 100),
    reason TEXT,
    source VARCHAR(50), -- 'manual', 'automatic', 'external_api'
    
    -- Geo information
    country_code VARCHAR(2),
    city VARCHAR(100),
    
    -- Usage statistics
    request_count INTEGER DEFAULT 0,
    blocked_count INTEGER DEFAULT 0,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Index for IP reputation
CREATE INDEX idx_ip_reputation_ip ON ip_reputation(ip_address);
CREATE INDEX idx_ip_reputation_type ON ip_reputation(reputation_type);
CREATE INDEX idx_ip_reputation_active ON ip_reputation(is_active);
CREATE INDEX idx_ip_reputation_expires ON ip_reputation(expires_at);

-- Device fingerprinting for fraud detection
CREATE TABLE IF NOT EXISTS device_fingerprints (
    id SERIAL PRIMARY KEY,
    fingerprint_hash VARCHAR(255) NOT NULL UNIQUE,
    
    -- Device characteristics
    device_info JSONB NOT NULL,
    screen_resolution VARCHAR(20),
    timezone VARCHAR(50),
    language VARCHAR(10),
    user_agent TEXT,
    
    -- Usage tracking
    user_count INTEGER DEFAULT 0, -- How many users use this device
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Risk assessment
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    is_suspicious BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for device fingerprints
CREATE INDEX idx_device_fingerprints_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX idx_device_fingerprints_risk_score ON device_fingerprints(risk_score);
CREATE INDEX idx_device_fingerprints_suspicious ON device_fingerprints(is_suspicious);

-- Updated_at triggers
CREATE TRIGGER trigger_user_behavior_tracking_updated_at
    BEFORE UPDATE ON user_behavior_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER trigger_fraud_rules_updated_at
    BEFORE UPDATE ON fraud_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER trigger_fraud_incidents_updated_at
    BEFORE UPDATE ON fraud_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER trigger_ip_reputation_updated_at
    BEFORE UPDATE ON ip_reputation
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER trigger_device_fingerprints_updated_at
    BEFORE UPDATE ON device_fingerprints
    FOR EACH ROW
    EXECUTE FUNCTION update_analytics_updated_at();

-- Function to calculate fraud score
CREATE OR REPLACE FUNCTION calculate_fraud_score(
    p_user_id INTEGER,
    p_ip_address INET,
    p_device_fingerprint VARCHAR DEFAULT NULL,
    p_payment_amount DECIMAL DEFAULT NULL,
    p_context JSONB DEFAULT '{}'
)
RETURNS TABLE(
    risk_score INTEGER,
    triggered_rules TEXT[],
    recommended_action VARCHAR
) AS $$
DECLARE
    final_risk_score INTEGER := 0;
    rules_triggered TEXT[] := '{}';
    user_behavior RECORD;
    ip_rep RECORD;
    device_risk INTEGER := 0;
    rule RECORD;
BEGIN
    -- Get user behavior data
    SELECT * INTO user_behavior
    FROM user_behavior_tracking
    WHERE user_id = p_user_id
    ORDER BY last_activity_at DESC
    LIMIT 1;

    -- Get IP reputation
    SELECT * INTO ip_rep
    FROM ip_reputation
    WHERE ip_address = p_ip_address
    AND is_active = true;

    -- Check IP reputation
    IF ip_rep.reputation_type = 'blacklist' THEN
        final_risk_score := final_risk_score + 50;
        rules_triggered := array_append(rules_triggered, 'blacklisted_ip');
    ELSIF ip_rep.reputation_type = 'greylist' THEN
        final_risk_score := final_risk_score + 20;
        rules_triggered := array_append(rules_triggered, 'suspicious_ip');
    END IF;

    -- Check for rapid requests
    IF user_behavior.rapid_requests_count > 10 THEN
        final_risk_score := final_risk_score + 15;
        rules_triggered := array_append(rules_triggered, 'rapid_requests');
    END IF;

    -- Check failed login attempts
    IF user_behavior.failed_login_attempts > 5 THEN
        final_risk_score := final_risk_score + 25;
        rules_triggered := array_append(rules_triggered, 'multiple_failed_logins');
    END IF;

    -- Check device fingerprint risk
    IF p_device_fingerprint IS NOT NULL THEN
        SELECT COALESCE(df.risk_score, 0) INTO device_risk
        FROM device_fingerprints df
        WHERE df.fingerprint_hash = p_device_fingerprint;
        
        final_risk_score := final_risk_score + (device_risk / 4); -- Scaled down impact
        
        IF device_risk > 70 THEN
            rules_triggered := array_append(rules_triggered, 'suspicious_device');
        END IF;
    END IF;

    -- Check payment amount (if provided)
    IF p_payment_amount IS NOT NULL THEN
        IF p_payment_amount > 1000000 THEN -- 1M XOF
            final_risk_score := final_risk_score + 30;
            rules_triggered := array_append(rules_triggered, 'high_value_transaction');
        ELSIF p_payment_amount > 500000 THEN -- 500K XOF
            final_risk_score := final_risk_score + 15;
            rules_triggered := array_append(rules_triggered, 'medium_value_transaction');
        END IF;
    END IF;

    -- Check time patterns (unusual hours)
    IF EXTRACT(HOUR FROM NOW()) BETWEEN 2 AND 5 THEN
        final_risk_score := final_risk_score + 10;
        rules_triggered := array_append(rules_triggered, 'unusual_hours');
    END IF;

    -- Ensure score doesn't exceed 100
    final_risk_score := LEAST(final_risk_score, 100);

    -- Determine recommended action
    DECLARE
        action VARCHAR := 'allow';
    BEGIN
        IF final_risk_score >= 80 THEN
            action := 'block';
        ELSIF final_risk_score >= 60 THEN
            action := 'review';
        ELSIF final_risk_score >= 40 THEN
            action := 'flag';
        END IF;

        RETURN QUERY SELECT final_risk_score, rules_triggered, action;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to update user behavior tracking
CREATE OR REPLACE FUNCTION update_user_behavior(
    p_user_id INTEGER,
    p_session_id VARCHAR,
    p_ip_address INET,
    p_user_agent TEXT DEFAULT NULL,
    p_device_fingerprint VARCHAR DEFAULT NULL,
    p_action_type VARCHAR DEFAULT 'general',
    p_context JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
    behavior_record RECORD;
    is_mobile BOOLEAN := false;
    country_code VARCHAR(2);
BEGIN
    -- Detect if mobile device
    IF p_user_agent IS NOT NULL THEN
        is_mobile := p_user_agent ~* '(mobile|android|iphone|ipad)';
    END IF;

    -- Try to determine country from IP (simplified - in production use GeoIP service)
    -- For now, default to 'BF' for Burkina Faso
    country_code := 'BF';

    -- Get or create behavior tracking record
    SELECT * INTO behavior_record
    FROM user_behavior_tracking
    WHERE user_id = p_user_id
    AND ip_address = p_ip_address
    AND DATE(last_activity_at) = CURRENT_DATE;

    IF behavior_record IS NULL THEN
        -- Create new record
        INSERT INTO user_behavior_tracking (
            user_id, session_id, ip_address, user_agent, device_fingerprint,
            country_code, is_mobile, hour_of_day, day_of_week
        ) VALUES (
            p_user_id, p_session_id, p_ip_address, p_user_agent, p_device_fingerprint,
            country_code, is_mobile, EXTRACT(HOUR FROM NOW()), EXTRACT(DOW FROM NOW())
        );
    ELSE
        -- Update existing record
        UPDATE user_behavior_tracking SET
            last_activity_at = CURRENT_TIMESTAMP,
            session_id = COALESCE(p_session_id, session_id),
            user_agent = COALESCE(p_user_agent, user_agent),
            device_fingerprint = COALESCE(p_device_fingerprint, device_fingerprint),
            rapid_requests_count = CASE 
                WHEN last_activity_at > NOW() - INTERVAL '1 minute' THEN rapid_requests_count + 1
                ELSE 1
            END,
            payment_attempts_count = CASE 
                WHEN p_action_type = 'payment' THEN payment_attempts_count + 1
                ELSE payment_attempts_count
            END,
            failed_login_attempts = CASE 
                WHEN p_action_type = 'failed_login' THEN failed_login_attempts + 1
                WHEN p_action_type = 'successful_login' THEN 0
                ELSE failed_login_attempts
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = behavior_record.id;
    END IF;

    -- Update device fingerprint if provided
    IF p_device_fingerprint IS NOT NULL THEN
        INSERT INTO device_fingerprints (fingerprint_hash, device_info, user_agent)
        VALUES (p_device_fingerprint, p_context, p_user_agent)
        ON CONFLICT (fingerprint_hash) 
        DO UPDATE SET
            last_seen_at = CURRENT_TIMESTAMP,
            user_agent = COALESCE(EXCLUDED.user_agent, device_fingerprints.user_agent),
            user_count = device_fingerprints.user_count + 1,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert default fraud rules
INSERT INTO fraud_rules (rule_name, rule_type, rule_description, rule_config, risk_score_increment, severity) VALUES
('High Value Transaction', 'payment', 'Transactions over 1M XOF are flagged', '{"threshold": 1000000, "currency": "XOF"}', 30, 'high'),
('Multiple Failed Logins', 'behavioral', 'More than 5 failed login attempts', '{"threshold": 5, "time_window": "1 hour"}', 25, 'medium'),
('Rapid Payment Attempts', 'velocity', 'Multiple payment attempts in short time', '{"threshold": 3, "time_window": "5 minutes"}', 20, 'medium'),
('Blacklisted IP', 'location', 'IP address is on blacklist', '{"check_type": "blacklist"}', 50, 'critical'),
('Unusual Hours Activity', 'behavioral', 'Activity between 2-5 AM', '{"start_hour": 2, "end_hour": 5}', 10, 'low'),
('New Device High Amount', 'device', 'High amount transaction from new device', '{"amount_threshold": 500000, "device_age_hours": 24}', 20, 'medium'),
('Multiple Payment Methods', 'payment', 'Using multiple payment methods rapidly', '{"threshold": 3, "time_window": "1 hour"}', 15, 'medium');

-- Create view for fraud dashboard
CREATE OR REPLACE VIEW fraud_dashboard AS
SELECT 
    DATE(fi.created_at) as incident_date,
    fi.incident_type,
    fi.severity,
    COUNT(*) as incident_count,
    AVG(fi.risk_score) as avg_risk_score,
    COUNT(*) FILTER (WHERE fi.status = 'confirmed') as confirmed_fraud,
    COUNT(*) FILTER (WHERE fi.status = 'false_positive') as false_positives,
    COUNT(*) FILTER (WHERE fi.user_blocked = true) as users_blocked
FROM fraud_incidents fi
WHERE fi.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(fi.created_at), fi.incident_type, fi.severity
ORDER BY incident_date DESC, incident_count DESC;

-- Comments for documentation
COMMENT ON TABLE user_behavior_tracking IS 'Tracks user behavior patterns for fraud detection';
COMMENT ON TABLE fraud_rules IS 'Configurable rules for fraud detection system';
COMMENT ON TABLE fraud_incidents IS 'Records of detected fraud incidents and their resolution';
COMMENT ON TABLE ip_reputation IS 'IP address reputation tracking for security';
COMMENT ON TABLE device_fingerprints IS 'Device fingerprinting for fraud prevention';

COMMENT ON FUNCTION calculate_fraud_score IS 'Calculates fraud risk score based on multiple factors';
COMMENT ON FUNCTION update_user_behavior IS 'Updates user behavior tracking for fraud analysis';