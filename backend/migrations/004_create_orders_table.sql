-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Order totals
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'XOF',
  
  -- Shipping information
  shipping_address JSONB NOT NULL, -- {street, city, region, coordinates}
  shipping_method VARCHAR(50) DEFAULT 'standard', -- standard, express, pickup
  estimated_delivery_date DATE,
  
  -- Payment information
  payment_method VARCHAR(50) NOT NULL, -- orange_money, cash_on_delivery
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, paid, failed, refunded
  payment_reference VARCHAR(100),
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Order status
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled
  
  -- Additional info
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Item details at time of order
  product_title VARCHAR(255) NOT NULL,
  product_description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  
  -- Product snapshot (for historical reference)
  product_snapshot JSONB, -- Store product details at time of order
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Delivery details
  pickup_address JSONB, -- Vendor/warehouse address
  delivery_address JSONB NOT NULL, -- Customer address
  estimated_distance DECIMAL(8, 2), -- in km
  estimated_duration INTEGER, -- in minutes
  
  -- Delivery status
  status VARCHAR(20) DEFAULT 'pending', -- pending, assigned, picked_up, in_transit, delivered, failed
  
  -- Driver assignment
  assigned_at TIMESTAMP WITH TIME ZONE,
  pickup_time TIMESTAMP WITH TIME ZONE,
  delivery_time TIMESTAMP WITH TIME ZONE,
  
  -- Delivery confirmation
  delivery_signature JSONB, -- Digital signature data
  delivery_photo_url VARCHAR(500), -- Photo of delivered package
  delivery_notes TEXT,
  
  -- Driver earnings
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  driver_earnings DECIMAL(10, 2) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_vendor_id ON order_items(vendor_id);

CREATE INDEX idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX idx_deliveries_driver_id ON deliveries(driver_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_assigned_at ON deliveries(assigned_at);

-- Create updated_at triggers
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE
    ON orders FOR EACH ROW EXECUTE FUNCTION 
    update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE
    ON deliveries FOR EACH ROW EXECUTE FUNCTION 
    update_updated_at_column();

-- Function to generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    order_num TEXT;
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate order number: ORD + YYYYMMDD + 4-digit counter
        order_num := 'ORD' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD((FLOOR(RANDOM() * 9999) + 1)::TEXT, 4, '0');
        
        -- Check if it already exists
        IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = order_num) THEN
            EXIT;
        END IF;
        
        counter := counter + 1;
        -- Prevent infinite loop
        IF counter > 100 THEN
            RAISE EXCEPTION 'Could not generate unique order number';
        END IF;
    END LOOP;
    
    RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION auto_generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_order_number_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_order_number();

-- Function to update order totals when items change
CREATE OR REPLACE FUNCTION update_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    order_subtotal DECIMAL(10, 2);
BEGIN
    -- Calculate new subtotal for the order
    SELECT COALESCE(SUM(total_price), 0) 
    INTO order_subtotal
    FROM order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Update order totals
    UPDATE orders 
    SET subtotal = order_subtotal,
        total_amount = order_subtotal + shipping_cost + tax_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update order totals
CREATE TRIGGER update_order_totals_on_insert
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_totals();

CREATE TRIGGER update_order_totals_on_update
    AFTER UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_totals();

CREATE TRIGGER update_order_totals_on_delete
    AFTER DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_totals();