import {
  ISource,
  IOutput,
  IContext,
  JobMetadata,
  IPluginConfig,
} from "../../job";
import { Document } from "bluehawk";
import { createPlugin } from "../../plugin";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  GetObjectOutput,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { createWriteStream } from "fs";
import { RunConfig } from "../../run";

export interface AwsS3Context extends IContext {
  name: "aws-s3";
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    expiration?: Date;
    sessionToken?: string;
  };
}

export interface AwsS3Source extends ISource {
  name: "aws-s3";
  bucket: string;
  keys: string[];
  ignoreKeys?: string[];
}

export interface AwsS3Output extends IOutput {
  name: "aws-s3";
  bucket: string;
  ignoreKeys?: string[];
}

function getS3(context: AwsS3Context) {
  const { region, credentials } = context;
  const s3 = new S3Client({
    region,
    credentials,
  });
  return s3;
}

// Create a helper function to convert a ReadableStream to a string.
const streamToString = (stream: any): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on("data", (chunk: any) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

export const createContext = ({
  job,
  meta,
}: RunConfig): AwsS3Context => {
  return {
    name: "aws-s3",
    region: "",
    credentials: {
      accessKeyId: "",
      secretAccessKey: "",
    }
  };
};

export const setup = createPlugin<AwsS3Context, AwsS3Source, AwsS3Output>(
  (context) => ({
    name: "aws-s3",
    source: async (source) => {
      // WIP
      const s3 = getS3(context);
      const keys: string[] = [];
      const documents: Document[] = [];

      for (const key of keys) {
        const getObjectCommand = new GetObjectCommand({
          Bucket: source.bucket,
          Key: key,
        });
        try {
          const data = await s3.send(getObjectCommand);
          if (!data.Body) {
            throw Error("No content.");
          }
          const text = await streamToString(data.Body);
          return [new Document({ text, path: key })];
        } catch (err) {
          console.error(err);
        }
      }
      return documents;
    },
    output: (output) => {
      return async ({ parseResult, document }) => {
        // TODO
        const s3 = getS3(context);
        const putObjectCommand = new PutObjectCommand({
          Bucket: output.bucket,
          Key: document.name,
          Body: document.text.toString(),
        });
        try {
          const data = await s3.send(putObjectCommand);
        } catch (err) {
          console.error(err);
        }
      };
    },
  })
);
