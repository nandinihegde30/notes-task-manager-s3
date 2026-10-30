
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
} = require("@aws-sdk/client-s3");

const bucket = process.env.S3_BUCKET;
const region = process.env.AWS_REGION || "us-east-1";

if (!bucket) {
  throw new Error("S3_BUCKET is required.");
}

const s3 = new S3Client({ region });

async function bodyToString(body) {
  return await body.transformToString();
}

// User-specific storage path
function prefixFor(userId, type) {
  return `notes-manager/users/${userId}/${type}/`;
}

async function list(type, userId) {
  const prefix = prefixFor(userId, type);
  let continuationToken;
  const records = [];

  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken
    }));

    for (const object of page.Contents || []) {
      if (!object.Key || object.Key.endsWith("/")) continue;

      const result = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: object.Key
      }));

      records.push(JSON.parse(await bodyToString(result.Body)));
    }

    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;

  } while (continuationToken);

  return records;
}

async function get(type, id, userId) {
  try {
    const result = await s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: `${prefixFor(userId, type)}${id}.json`
    }));

    return JSON.parse(await bodyToString(result.Body));

  } catch (error) {
    if (
      error.name === "NoSuchKey" ||
      error.$metadata?.httpStatusCode === 404
    ) {
      return null;
    }

    throw error;
  }
}

async function save(type, record, userId) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `${prefixFor(userId, type)}${record.id}.json`,
    Body: JSON.stringify(record, null, 2),
    ContentType: "application/json"
  }));

  return record;
}

async function remove(type, id, userId) {
  await s3.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: `${prefixFor(userId, type)}${id}.json`
  }));
}

// Read the old shared storage for migration
async function listOld(type) {
  const prefix = `notes-manager/${type}/`;
  let continuationToken;
  const records = [];

  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken
    }));

    for (const object of page.Contents || []) {
      if (!object.Key || object.Key.endsWith("/")) continue;

      const result = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: object.Key
      }));

      records.push(JSON.parse(await bodyToString(result.Body)));
    }

    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;

  } while (continuationToken);

  return records;
}

module.exports = {
  list,
  get,
  save,
  remove,
  listOld
};
