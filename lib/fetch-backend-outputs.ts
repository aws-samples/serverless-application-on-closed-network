import * as cloudformation from "@aws-sdk/client-cloudformation";
import { CloudFormationServiceException } from "@aws-sdk/client-cloudformation";
import * as cdk from "aws-cdk-lib";

export type StackOutputs = {
  [key: string]: string;
};

/**
 * Fetch cloudformation output from backend stack
 */
export const fetchBackendOutputs = async (
  stack: cdk.Stack
): Promise<StackOutputs | undefined> => {
  try {
    const client = new cloudformation.CloudFormationClient({
      region: stack.region,
    });
    const cmd = new cloudformation.DescribeStacksCommand({
      StackName: stack.stackName,
    });
    let res;
    try {
      res = await client.send(cmd);
    } catch (error) {
      if (
        error instanceof CloudFormationServiceException &&
        error.name === "ValidationError"
      ) {
        return undefined;
      }
      throw error;
    }

    return res.Stacks?.[0]?.Outputs?.reduce((result, output) => {
      if (output.OutputKey && output.OutputValue) {
        result[output.OutputKey] = output.OutputValue;
      }
      return result;
    }, {} as StackOutputs);
  } catch (error) {
    console.log(error);
    return undefined;
  }
};
