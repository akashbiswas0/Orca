-- Feature Requests Tracking Table for Supabase
-- This table tracks feature requests extracted from Twitter replies

CREATE TABLE feature_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Feature Information
  feature_name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'feature', -- 'feature', 'ui', 'bug', 'enhancement'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Twitter Context
  requested_by_username TEXT NOT NULL,
  tweet_url TEXT NOT NULL,
  target_account TEXT NOT NULL, -- Account for which feature is requested
  reply_text TEXT, -- Original reply text for context
  
  -- Status Tracking
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'developing', 'pr_raised', 'shipped')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Optional fields for development tracking
  assigned_to TEXT, -- Developer assigned to the feature
  github_issue_url TEXT, -- Link to GitHub issue if created
  estimated_effort TEXT, -- 'small', 'medium', 'large'
  tags TEXT[], -- Array of tags for better categorization
  
  -- Constraints
  UNIQUE(feature_name, target_account) -- Prevent duplicate features for same account
);

-- Create an index for faster queries
CREATE INDEX idx_feature_requests_target_account ON feature_requests(target_account);
CREATE INDEX idx_feature_requests_status ON feature_requests(status);
CREATE INDEX idx_feature_requests_created_at ON feature_requests(created_at DESC);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_feature_requests_updated_at
    BEFORE UPDATE ON feature_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for better security
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now (adjust as needed)
CREATE POLICY "Allow all operations on feature_requests" 
ON feature_requests FOR ALL 
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Insert some example data for testing
INSERT INTO feature_requests (
  feature_name, 
  description, 
  requested_by_username, 
  tweet_url, 
  target_account, 
  reply_text,
  category,
  priority
) VALUES 
(
  'dark mode', 
  'Users want a dark theme option for better user experience', 
  'SupaySui', 
  'https://x.com/meetnpay/status/1937766635554976060', 
  'meetnpay', 
  '@meetnpay dark mode',
  'ui',
  'high'
),
(
  'responsive design', 
  'Make the application responsive for mobile devices', 
  'SupaySui', 
  'https://x.com/meetnpay/status/1937766635554976060', 
  'meetnpay', 
  '@meetnpay make it responsive',
  'ui',
  'high'
);

-- Create a view for quick status overview
CREATE VIEW feature_requests_summary AS
SELECT 
  target_account,
  status,
  COUNT(*) as count,
  ARRAY_AGG(feature_name) as features
FROM feature_requests 
GROUP BY target_account, status
ORDER BY target_account, status; 