-- Create carts table for persistent cart storage
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Item details
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10, 2) NOT NULL, -- Price at time of adding to cart
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate products in same cart
  UNIQUE(cart_id, product_id)
);

-- Create indexes
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX idx_cart_items_vendor_id ON cart_items(vendor_id);

-- Create updated_at triggers
CREATE TRIGGER update_carts_updated_at BEFORE UPDATE
    ON carts FOR EACH ROW EXECUTE FUNCTION 
    update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE
    ON cart_items FOR EACH ROW EXECUTE FUNCTION 
    update_updated_at_column();

-- Function to get or create cart for user
CREATE OR REPLACE FUNCTION get_or_create_cart(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    cart_id UUID;
BEGIN
    -- Try to get existing cart
    SELECT id INTO cart_id 
    FROM carts 
    WHERE user_id = p_user_id;
    
    -- If no cart exists, create one
    IF cart_id IS NULL THEN
        INSERT INTO carts (user_id) 
        VALUES (p_user_id) 
        RETURNING id INTO cart_id;
    END IF;
    
    RETURN cart_id;
END;
$$ LANGUAGE plpgsql;