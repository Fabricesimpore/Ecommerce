-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('orange_money', 'cash_on_delivery', 'bank_transfer')),
    payment_provider VARCHAR(50) NOT NULL DEFAULT 'orange_money',
    
    -- Payment identifiers
    transaction_id VARCHAR(255) UNIQUE,
    external_transaction_id VARCHAR(255),
    payment_reference VARCHAR(255) NOT NULL UNIQUE,
    
    -- Payment amounts (in XOF - West African CFA franc)
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'XOF',
    fees DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL,
    
    -- Payment status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'expired')
    ),
    
    -- Customer information
    customer_phone VARCHAR(20),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    
    -- Payment URLs
    payment_url TEXT,
    return_url TEXT,
    cancel_url TEXT,
    webhook_url TEXT,
    
    -- Orange Money specific fields
    otp_code VARCHAR(10),
    payment_token VARCHAR(255),
    authorization_code VARCHAR(255),
    
    -- Webhook and callback data
    webhook_data JSONB,
    gateway_response JSONB,
    error_details JSONB,
    
    -- Fraud detection
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    fraud_flags TEXT[],
    
    -- Timestamps
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit fields
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    
    -- Constraints
    CONSTRAINT valid_completion_amount CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR 
        (status != 'completed')
    ),
    CONSTRAINT valid_failure_details CHECK (
        (status = 'failed' AND failed_at IS NOT NULL) OR 
        (status != 'failed')
    )
);

-- Create indexes for performance
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_payment_reference ON payments(payment_reference);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_method ON payments(payment_method);
CREATE INDEX idx_payments_customer_phone ON payments(customer_phone);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_amount ON payments(amount);

-- Create partial indexes for active payments
CREATE INDEX idx_payments_pending ON payments(created_at, amount) WHERE status = 'pending';
CREATE INDEX idx_payments_processing ON payments(created_at) WHERE status = 'processing';

-- Create composite indexes for common queries
CREATE INDEX idx_payments_order_status ON payments(order_id, status);
CREATE INDEX idx_payments_method_status ON payments(payment_method, status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Create function to generate payment reference
CREATE OR REPLACE FUNCTION generate_payment_reference()
RETURNS TEXT AS $$
DECLARE
    reference TEXT;
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generate reference: PAY + timestamp + random 4 digits
        reference := 'PAY' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- Check if reference already exists
        SELECT COUNT(*) INTO exists_count 
        FROM payments 
        WHERE payment_reference = reference;
        
        -- Exit loop if reference is unique
        EXIT WHEN exists_count = 0;
    END LOOP;
    
    RETURN reference;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate payment expiry
CREATE OR REPLACE FUNCTION calculate_payment_expiry(payment_method TEXT)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    CASE payment_method
        WHEN 'orange_money' THEN
            RETURN CURRENT_TIMESTAMP + INTERVAL '30 minutes';
        WHEN 'bank_transfer' THEN
            RETURN CURRENT_TIMESTAMP + INTERVAL '24 hours';
        ELSE
            RETURN CURRENT_TIMESTAMP + INTERVAL '1 hour';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create payment statistics view
CREATE OR REPLACE VIEW payment_statistics AS
SELECT 
    payment_method,
    status,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount,
    DATE_TRUNC('day', created_at) as transaction_date
FROM payments
GROUP BY payment_method, status, DATE_TRUNC('day', created_at)
ORDER BY transaction_date DESC, payment_method, status;

-- Create function to log payment status changes
CREATE OR REPLACE FUNCTION log_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO payment_audit_log (
            payment_id,
            old_status,
            new_status,
            changed_at,
            changed_by,
            ip_address,
            user_agent
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            CURRENT_TIMESTAMP,
            NEW.updated_by,
            NEW.ip_address,
            NEW.user_agent
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create payment audit log table
CREATE TABLE IF NOT EXISTS payment_audit_log (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    changed_by INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    notes TEXT
);

CREATE INDEX idx_payment_audit_log_payment_id ON payment_audit_log(payment_id);
CREATE INDEX idx_payment_audit_log_changed_at ON payment_audit_log(changed_at);

-- Create trigger for payment status changes
CREATE TRIGGER trigger_payment_status_change
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION log_payment_status_change();

-- Create function to clean up expired payments
CREATE OR REPLACE FUNCTION cleanup_expired_payments()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE payments 
    SET 
        status = 'expired',
        updated_at = CURRENT_TIMESTAMP
    WHERE 
        status = 'pending' 
        AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE payments IS 'Payment transactions for orders with support for Orange Money and other payment methods';
COMMENT ON COLUMN payments.payment_reference IS 'Unique reference for tracking payments, auto-generated if not provided';
COMMENT ON COLUMN payments.transaction_id IS 'Internal transaction ID for our system';
COMMENT ON COLUMN payments.external_transaction_id IS 'Transaction ID from payment provider (Orange Money, etc.)';
COMMENT ON COLUMN payments.risk_score IS 'Fraud detection score from 0-100, higher scores indicate higher risk';
COMMENT ON COLUMN payments.net_amount IS 'Amount after deducting fees';
COMMENT ON FUNCTION generate_payment_reference() IS 'Generates unique payment reference with format PAY + timestamp + random digits';
COMMENT ON FUNCTION cleanup_expired_payments() IS 'Marks expired pending payments as expired, should be run periodically';