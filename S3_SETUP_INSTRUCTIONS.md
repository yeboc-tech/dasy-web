# S3 Bucket Configuration for dasy-web

## Current Issue
Your S3 bucket `dasy-handout` has two main issues:
1. **CORS Error**: "Access to fetch at 'https://dasy-handout.s3.ap-northeast-2.amazonaws.com/' from origin 'http://localhost:3000' has been blocked by CORS policy"
2. **403 Forbidden**: The bucket is not configured for public access

Both issues need to be fixed for images to load properly.

## Required AWS S3 Configuration

### 1. Bucket Policy Configuration
Go to AWS S3 Console → `dasy-handout` → Permissions → Bucket Policy

Add this policy:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::dasy-handout/problems/*"
        }
    ]
}
```

### 2. CORS Configuration
Go to AWS S3 Console → `dasy-handout` → Permissions → Cross-origin resource sharing (CORS)

Add this CORS configuration:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

### 3. Block Public Access Settings
Go to AWS S3 Console → `dasy-handout` → Permissions → Block public access

Ensure these settings allow your bucket policy:
- ✅ Block public access to buckets and objects granted through new access control lists (ACLs)
- ✅ Block public access to buckets and objects granted through any access control lists (ACLs)
- ❌ Block public access to buckets and objects granted through new public bucket or access point policies
- ❌ Block public access to buckets and objects granted through any public bucket or access point policies

## Step-by-Step Fix Instructions

### Step 1: Apply Bucket Policy
1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click on your bucket: `dasy-handout`
3. Go to **Permissions** tab
4. Scroll down to **Bucket policy**
5. Click **Edit** and paste the policy above
6. Click **Save changes**

### Step 2: Configure CORS
1. In the same **Permissions** tab
2. Scroll down to **Cross-origin resource sharing (CORS)**
3. Click **Edit** and paste the CORS configuration above
4. Click **Save changes**

### Step 3: Update Block Public Access Settings
1. In the same **Permissions** tab
2. Scroll to **Block public access (bucket settings)**
3. Click **Edit**
4. **Uncheck** these two options:
   - ❌ Block public access to buckets and objects granted through new public bucket or access point policies
   - ❌ Block public access to buckets and objects granted through any public bucket or access point policies
5. **Keep checked** these two options:
   - ✅ Block public access to buckets and objects granted through new access control lists (ACLs)
   - ✅ Block public access to buckets and objects granted through any access control lists (ACLs)
6. Click **Save changes**
7. Type `confirm` when prompted

## Testing the Fix

After making these changes:

1. **Wait 1-2 minutes** for AWS settings to propagate

2. Test a direct URL in your browser:
   ```
   https://dasy-handout.s3.ap-northeast-2.amazonaws.com/problems/test.png
   ```

3. Check the S3 Diagnostics component in the web app at `/build`

4. The images should now load properly in both `/build` and `/configure` pages

## Troubleshooting

If you still see errors after 5 minutes:

1. Double-check the bucket policy syntax
2. Ensure the CORS configuration is saved properly
3. Verify that public access settings allow your bucket policy
4. Check that your problem images actually exist in the `problems/` folder

## Alternative: CDN/CloudFront
If you prefer not to make the bucket public, consider setting up AWS CloudFront with signed URLs for better security.

## Current Environment Variables
Your current `.env` file is correctly configured:
```
NEXT_PUBLIC_S3_BUCKET_NAME=dasy-handout
NEXT_PUBLIC_AWS_REGION=ap-northeast-2
```