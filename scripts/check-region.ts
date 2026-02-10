
import { S3Client, GetBucketLocationCommand } from '@aws-sdk/client-s3'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

async function checkRegion() {
  const bucket = process.env.S3_BUCKET
  console.log(`Checking region for bucket: ${bucket}`)

  // Use a region-agnostic client simply to send the GetBucketLocation command
  // S3 clients can usually get location even from wrong region endpoint if signed correctly?
  // Actually, best to try us-east-1 first as it is the default global endpoint.
  const client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    }
  })

  try {
    const command = new GetBucketLocationCommand({ Bucket: bucket })
    const response = await client.send(command)
    console.error('RAW RESPONSE:', response)
    console.error('LocationConstraint:', response.LocationConstraint || 'us-east-1 (inferred)')
  } catch (error) {
    console.error('Error fetching bucket location:', error)
  }
}

checkRegion()
