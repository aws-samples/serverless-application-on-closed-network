import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { FrontendS3 } from "./constructs/frontend-s3";
import { Network } from "./constructs/network";

export interface FrontendStackProps extends cdk.StackProps {
  network: Network;
  s3InterfaceEndpointDns: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const frontendS3 = new FrontendS3(this, "FrontendS3", {
      network: props.network,
    });

    new cdk.CfnOutput(this, "FrontendUrl", {
      value: `https://${frontendS3.bucket.bucketName}.bucket.${props.s3InterfaceEndpointDns}/index.html`,
    });
  }
}
