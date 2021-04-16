import { ISource, IOutput, IPlugin } from "../../job";
import { Document } from "bluehawk";
import { createPlugin } from "../../plugin";

export interface AwsS3Plugin extends IPlugin {
  name: "aws-s3";
}

interface AwsS3Bucket {
  name: string;
}

export interface AwsS3Source extends ISource {
  name: "aws-s3";
  bucket: AwsS3Bucket;
  keys: string[];
  ignoreKeys?: string[];
}

export interface AwsS3Output extends IOutput {
  name: "aws-s3";
  bucket: AwsS3Bucket;
  keys: string[];
  ignoreKeys?: string[];
}

export const setup = createPlugin<AwsS3Source, AwsS3Output>(context => ({
  name: "aws-s3",
  source: async (source) => {
    const documents: Document[] = []
    // TODO
    return documents
  },
  output: (output) => {
    return async ({ parseResult, document }) => {
      // TODO
    };
  },
}));
